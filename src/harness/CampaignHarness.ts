import { HistoryRoute } from "./HistoryRoute";
import { BathsRoutes } from "./BathsRoutes";
import { PalaceRoutes } from "./PalaceRoutes";
import { type RewardStep } from "./rewardsRoute";
import { type Attunement } from "../campaign/rewards";
import { CampaignGame } from "../campaign/CampaignGame";
import { SECTIONS, SECTION_BY_ID } from "../campaign/sections";
import { CAMPAIGN_ROOMS } from "../campaign/world";
import { geometry } from "../campaign/layouts";
import type { CampaignSave } from "../campaign/types";
import type { Ability } from "../game/types";
import type { Action } from "../game/input";
import { isBoss } from "../game/enemies";
import { CampaignTrace, reloadCampaign } from "./CampaignTrace";
import { HARNESS_STEP, type HarnessStatus } from "./Harness";

export class CampaignHarness {
  game: CampaignGame;
  readonly scenario: "campaign" | "king" | "vizier";
  readonly immortal: boolean;
  readonly exploreBaths: boolean;
  readonly cooperate: boolean;
  readonly regionOrder: "gardens-first" | "sky-first";
  readonly exploreEchoes: boolean;
  readonly exploreEraWing: boolean;
  readonly investigateHistory: boolean;
  readonly optionalRewards: Attunement | false;
  status: HarnessStatus = "running";
  frames = 0;
  action = "Starting";
  error: string | null = null;
  readonly trace: CampaignTrace;
  readonly resilienceSeed: number | null;
  private randomState: number;
  readonly disruptions: { room: string; kind: string }[] = [];
  private readonly interruptedTraversal = new Set<string>();
  private readonly powers = new Set<Ability>();
  private readonly playback: Generator<void>;
  private held: Action[] = [];
  private readonly encounters = new Map<
    string,
    {
      room: string;
      kind: string;
      phases: number[];
      telegraphs: number;
      defeated: boolean;
      shieldedFrames: number;
    }
  >();
  private telegraphs = new Set<string>();
  readonly scenes: {
    id: string;
    dagger: boolean;
    farah: string;
    grandRewind: boolean;
  }[] = [];
  constructor(
    options: {
      scenario?: "campaign" | "king" | "vizier";
      immortal?: boolean;
      resilienceSeed?: number;
      exploreBaths?: boolean;
      cooperate?: boolean;
      regionOrder?: "gardens-first" | "sky-first";
      exploreEchoes?: boolean;
      exploreEraWing?: boolean;
      investigateHistory?: boolean;
      optionalRewards?: Attunement | false;
    } = {},
  ) {
    this.investigateHistory = options.investigateHistory ?? false;
    this.exploreEraWing = options.exploreEraWing ?? false;
    this.exploreEchoes = options.exploreEchoes ?? false;
    this.regionOrder = options.regionOrder ?? "gardens-first";
    this.cooperate = options.cooperate ?? true;
    this.optionalRewards = options.optionalRewards ?? false;
    this.exploreBaths = options.exploreBaths ?? true;
    this.resilienceSeed = options.resilienceSeed ?? null;
    this.randomState = this.resilienceSeed ?? 0;
    this.trace = new CampaignTrace();
    this.scenario = options.scenario ?? "campaign";
    this.immortal = options.immortal ?? this.resilienceSeed === null;
    if (
      this.resilienceSeed !== null &&
      (!Number.isInteger(this.resilienceSeed) ||
        this.resilienceSeed < 0 ||
        this.resilienceSeed > 0xffffffff ||
        this.scenario !== "campaign" ||
        this.immortal)
    )
      throw new Error(
        "Resilience requires a uint32 seed and a mortal campaign",
      );
    this.game = new CampaignGame({ persist: false, immortal: this.immortal });
    Object.assign(this.game.options, {
      music: false,
      sfx: false,
      shake: false,
    });
    this.game.begin();
    if (this.scenario !== "campaign") {
      const index = this.scenario === "king" ? 7 : 39;
      this.game.journey.completed = SECTIONS.slice(0, index).map((s) => s.id);
      this.game.journey.dagger = true;
      this.game.journey.sword = this.scenario === "king" ? 1 : 3;
      this.game.journey.grandRewind = index === 39;
      this.game.journey.farah = index === 39 ? "restored" : "following";
      this.game.abilities = new Set(
        this.scenario === "king"
          ? ["rewind", "slow"]
          : ["rewind", "slow", "freeze", "dash"],
      );
      const items = SECTIONS.slice(0, index).flatMap((s) =>
        this.game.rooms[s.id].pickups.filter((p) => p.kind !== "sand"),
      );
      this.game.collected = new Set(items.map((p) => p.id));
      this.game.player.maxHealth =
        6 + items.filter((p) => p.kind === "heart").length;
      this.game.player.health = this.game.player.maxHealth;
      this.game.player.sand = this.game.player.maxSand;
      this.game.enterRoom(SECTIONS[index].id, undefined, { x: 800, y: 594 });
      this.game.checkpoint = { room: SECTIONS[index].id, x: 800, y: 594 };
      this.game.save(false);
    }
    this.playback = this.play();
  }
  pause() {
    if (this.status === "running") this.status = "paused";
  }
  resume() {
    if (this.status === "paused") this.status = "running";
  }
  step(count = 1) {
    if (!Number.isInteger(count) || count < 1 || count > 240000)
      throw new Error("Invalid harness step count");
    for (
      let i = 0;
      i < count && this.status !== "passed" && this.status !== "failed";
      i++
    ) {
      if (this.game.screen === "pause") {
        this.game.setScreen("playing");
        this.game.input.restoreHeld(this.held);
      } else if (this.held.length && !this.game.input.snapshotHeld().length)
        this.game.input.restoreHeld(this.held);
      try {
        if (this.playback.next().done) {
          this.status = "passed";
          this.game.input.clear();
        }
      } catch (error) {
        this.status = "failed";
        this.error = `${error instanceof Error ? error.message : String(error)}; ${this.game.room.id}, ${this.action}, x=${this.game.player.x.toFixed(1)}, y=${this.game.player.y.toFixed(1)}, frame=${this.frames}`;
        this.game.input.clear();
      }
    }
    return this.report();
  }
  report() {
    const g = this.game;
    return {
      scenario: this.scenario,
      immortal: this.immortal,
      status: this.status,
      frames: this.frames,
      seconds: this.frames * HARNESS_STEP,
      step: g.journey.completed.length,
      totalSteps: 40,
      action: this.action,
      room: g.room.id,
      position: { x: g.player.x, y: g.player.y },
      health: g.player.health,
      sand: g.player.sand,
      deaths: g.deaths,
      rooms: [...g.visited],
      abilities: [...g.abilities],
      powersUsed: [...this.powers],
      flags: [...g.flags],
      collected: [...g.collected],
      baths: { ...g.journey.baths },
      palace: { ...g.journey.palace },
      regionOrder: this.regionOrder,
      cooperation: { ...g.journey.cooperation },
      rewards: { ...g.journey.rewards, maxSand: g.player.maxSand },
      milestones: [...g.journey.completed],
      scenes: [...this.scenes],
      puzzles: Object.entries(g.journey.puzzles)
        .filter(([id, s]) => s.solved && SECTION_BY_ID[id]?.puzzle)
        .map(([id]) => id),
      defeated: [...g.journey.defeated],
      bosses: [...this.encounters.values()].map((b) => ({
        ...b,
        phases: [...b.phases],
      })),
      disruptions: [...this.disruptions],
      resilienceSeed: this.resilienceSeed,
      replay: this.status === "failed" ? this.trace.events : undefined,
      error: this.error,
    };
  }
  private random(max: number) {
    this.randomState =
      (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState % max;
  }
  require(value: boolean, message: string) {
    if (!value) throw new Error(message);
  }
  private pulse(action: Action) {
    this.game.input.release(action);
    this.game.input.press(action);
  }
  private aim(x: number) {
    const g = this.game,
      diff = x - g.player.x;
    g.input.release(diff > 0 ? "left" : "right");
    if (Math.abs(diff) > 7) g.input.press(diff > 0 ? "right" : "left");
    else {
      g.input.release("left");
      g.input.release("right");
    }
  }
  *tick() {
    const g = this.game;
    if (g.screen === "pause") g.setScreen("playing");
    this.require(g.screen === "playing", "Unexpected screen " + g.screen);
    this.require(!g.orientationBlocked, "Landscape orientation is required");
    if (
      this.frames %
        (this.resilienceSeed === null ? 42 : 38 + (this.resilienceSeed % 9)) ===
      0
    )
      this.pulse("attack");
    const slow = g.slowTime,
      freeze = g.freezeTime,
      dash = g.player.dashTime;
    this.trace.input(g.input);
    g.update(HARNESS_STEP);
    this.frames++;
    if (g.slowTime > slow) this.powers.add("slow");
    if (g.freezeTime > freeze) this.powers.add("freeze");
    if (g.player.dashTime > dash) this.powers.add("dash");
    if (g.rewinding) this.powers.add("rewind");
    const telegraphs = new Set<string>();
    for (const enemy of g.enemies.filter((e) => isBoss(e.kind))) {
      const key = `${g.room.id}:${enemy.id}`;
      let record = this.encounters.get(key);
      if (!record) {
        record = {
          room: g.room.id,
          kind: enemy.kind,
          phases: [],
          telegraphs: 0,
          defeated: false,
          shieldedFrames: 0,
        };
        this.encounters.set(key, record);
      }
      if (!record.phases.includes(enemy.phase)) record.phases.push(enemy.phase);
      if (enemy.telegraph > 0) {
        telegraphs.add(key);
        if (!this.telegraphs.has(key)) record.telegraphs++;
      }
      if (enemy.protected) record.shieldedFrames++;
      record.defeated = enemy.dead;
    }
    this.telegraphs = telegraphs;
    if (g.screen === "story") g.closeStory();
    this.held = g.input.snapshotHeld();
    this.require(g.screen !== "death", "Player or Farah died");
    yield;
  }
  *until(predicate: () => boolean, limit = 3600) {
    for (let i = 0; i < limit; i++) {
      if (predicate()) return;
      yield* this.tick();
    }
    throw new Error("Timed out waiting for " + this.action);
  }
  *walk(x: number) {
    this.action = `Walk to ${x.toFixed(0)}`;
    this.game.input.clear();
    for (let i = 0; i < 1800; i++) {
      this.aim(x);
      yield* this.tick();
      if (Math.abs(this.game.player.x - x) < 9 && this.game.player.grounded)
        return;
    }
    throw new Error("Walk did not reach its destination");
  }
  *jump(x: number, floor: number, dashFrame = -1) {
    const g = this.game;
    this.action = `Jump to ${x.toFixed(0)} / floor ${floor}`;
    g.input.clear();
    if (this.resilienceSeed !== null) {
      for (let i = this.random(10); i > 0; i--) yield* this.tick();
      if (dashFrame >= 0) dashFrame += this.random(5) - 2;
    }
    g.input.press("jump");
    const release = this.resilienceSeed === null ? 300 : 44 + this.random(24);
    for (let i = 0; i < 300; i++) {
      if (i === release) g.input.release("jump");
      this.aim(x);
      if (i === dashFrame) this.pulse("dash");
      yield* this.tick();
      if (i > 12 && g.player.grounded) {
        this.require(
          Math.abs(g.player.y + g.player.h - floor) < 3,
          `Landed on wrong floor ${g.player.y + g.player.h}`,
        );
        g.input.clear();
        return;
      }
    }
    throw new Error("Jump did not land");
  }
  *use() {
    this.game.input.clear();
    this.require(!!this.game.interaction, "Expected an interaction");
    this.action = this.game.interaction!.label;
    this.pulse("interact");
    yield* this.tick();
  }
  *drop(x: number, floor: number) {
    const g = this.game;
    this.action = `Drop to ${x} / floor ${floor}`;
    g.input.clear();
    g.input.press("down");
    for (let i = 0; i < 300; i++) {
      this.aim(x);
      yield* this.tick();
      if (i > 2 && g.player.grounded) {
        this.require(
          Math.abs(g.player.y + g.player.h - floor) < 3,
          "Dropped onto the wrong terrace",
        );
        g.input.clear();
        return;
      }
    }
    throw new Error("Drop did not land");
  }
  private *solve() {
    const g = this.game,
      p = g.puzzles.definition,
      s = g.puzzles.state;
    if (!p || s.solved) return;
    switch (p.kind) {
      case "crank":
        for (let i = 0; i < p.controls.length; i++) {
          const c = p.controls[i];
          yield* this.walk(c.x - 15);
          for (
            let turns = 0;
            (s.values[i] ?? 0) !== c.target && turns < c.steps;
            turns++
          )
            yield* this.use();
        }
        break;
      case "timed":
        yield* this.walk(p.lever.x - 15);
        yield* this.use();
        yield* this.walk(p.gate.x + p.gate.w + 70);
        break;
      case "crate":
        yield* this.walk(s.crateX - 65);
        g.input.clear();
        g.input.press("interact");
        g.input.press("right");
        this.action = "Push crate onto its plate";
        yield* this.until(() => s.solved, 1200);
        g.input.clear();
        yield* this.jump(s.crateX + 50, 602);
        break;
      case "paired":
        yield* this.walk(p.prince.x - 15);
        yield* this.use();
        g.input.clear();
        this.action = "Wait for Farah’s switch";
        yield* this.until(() => s.solved, 1200);
        break;
      case "mirror":
        for (let i = 0; i < 2; i++) {
          yield* this.walk(p.controls[i].x - 15);
          if ((s.values[i] ?? 0) !== 1) yield* this.use();
        }
        yield* this.walk(s.crateX + 65);
        g.input.clear();
        g.input.press("down");
        g.input.press("interact");
        g.input.press("left");
        this.action = "Align the movable mirror with the receiver";
        for (let i = 0; i < 1200 && !s.solved; i++) {
          yield* this.tick();
        }
        g.input.clear();
        this.require(s.solved, "Light did not reach the receiver");
        break;
      case "columns":
        for (const lever of p.levers) {
          yield* this.walk(lever.x - 15);
          yield* this.use();
        }
        yield* this.walk(600);
        yield* this.jump(730, 535);
        yield* this.walk(780);
        yield* this.jump(930, 435);
        yield* this.walk(990);
        yield* this.jump(1130, 350);
        yield* this.walk(1190);
        yield* this.jump(1410, 350);
        break;
      case "illusion":
        for (const index of p.sequence) {
          yield* this.walk(p.doors[index].x - 15);
          yield* this.use();
        }
        break;
      case "wall":
        if (g.section.layout === "courtyard") yield* this.traverse();
        yield* this.walk(p.wall.x - 100);
        g.input.clear();
        g.player.face = 1;
        this.action = "Break the cracked wall";
        yield* this.until(() => s.solved, 600);
        break;
      case "battle":
        if (p.recovery) {
          yield* this.traverse();
          yield* this.walk(p.recovery.x - 15);
          yield* this.use();
        } else yield* this.walk(800);
        yield* this.fight();
        break;
      case "vizier":
        yield* this.fight();
        break;
    }
    this.require(s.solved, "Puzzle was not solved");
  }
  private *fight(stopAtWave = Infinity) {
    const g = this.game;
    this.action = "Fight through the encounter";
    g.input.clear();
    for (let i = 0; i < 18000; i++) {
      if (g.puzzles.state.solved || g.puzzles.state.wave >= stopAtWave) return;
      const target = g.enemies
        .filter((e) => !e.dead && !e.protected)
        .sort(
          (a, b) => Math.abs(a.x - g.player.x) - Math.abs(b.x - g.player.x),
        )[0];
      if (target) {
        const x = target.x - 55;
        this.aim(x);
        if (Math.abs(g.player.x - x) < 9 && g.player.face < 0) {
          g.input.release("left");
          g.input.press("right");
        }
        if (
          !this.immortal &&
          g.abilities.has("freeze") &&
          g.hasDagger &&
          g.freezeTime <= 0 &&
          g.player.sand >= 2 &&
          Math.abs(g.player.x - target.x) < 130
        )
          this.pulse("freeze");
      } else {
        g.input.release("left");
        g.input.release("right");
      }
      yield* this.tick();
    }
    throw new Error("Encounter exceeded 150 seconds");
  }
  private *traverse(): Generator<void> {
    const g = this.game;
    switch (g.section.layout) {
      case "courtyard":
        yield* this.walk(790);
        yield* this.jump(1040, 650);
        break;
      case "terraces":
        yield* this.walk(290);
        yield* this.jump(410, 530);
        yield* this.walk(445);
        yield* this.jump(655, 430);
        yield* this.walk(730);
        yield* this.jump(955, 350);
        yield* this.walk(960);
        yield* this.walk(1390);
        break;
      case "tower":
        for (const [walk, x, floor] of [
          [190, 310, 1240],
          [395, 585, 1110],
          [690, 875, 980],
          [835, 670, 850],
          [555, 415, 720],
          [420, 600, 590],
          [700, 900, 460],
          [985, 1160, 330],
        ]) {
          yield* this.walk(walk);
          yield* this.jump(x, floor);
        }
        break;
      case "descent":
        for (const [walk, x, floor] of [
          [1095, 940, 460],
          [835, 665, 590],
          [550, 390, 720],
          [455, 650, 850],
          [730, 900, 980],
          [835, 625, 1110],
          [535, 350, 1240],
        ]) {
          yield* this.walk(walk);
          yield* this.drop(x, floor);
        }
        break;
      case "library":
        yield* this.walk(310);
        yield* this.jump(435, 520);
        yield* this.walk(485);
        yield* this.jump(700, 400);
        yield* this.walk(745);
        yield* this.jump(1050, 300);
        yield* this.walk(1050);
        break;
      case "bridge":
        yield* this.walk(290);
        yield* this.jump(420, 520);
        yield* this.jump(810, 570, 30);
        yield* this.walk(960);
        yield* this.jump(1470, 650, 47);
        break;
      case "ferry":
        yield* this.walk(430);
        g.input.clear();
        this.action = "Wait for the ferry";
        yield* this.until(() => g.platforms[3].x < 550);
        this.pulse("slow");
        yield* this.tick();
        yield* this.jump(g.platforms[3].x + 80, 620);
        yield* this.jump(850, 710);
        yield* this.walk(875);
        yield* this.jump(1030, 575);
        g.input.clear();
        yield* this.until(
          () => g.platforms[5].y > 500 && g.platforms[5].y < 570,
        );
        this.pulse("slow");
        yield* this.tick();
        // The lift's height changes during the jump, so observe the landing instead of a fixed floor.
        g.input.clear();
        g.input.press("jump");
        this.action = "Board the rising lift";
        for (let i = 0; i < 300; i++) {
          this.aim(1250);
          yield* this.tick();
          if (i > 12 && g.player.grounded) break;
        }
        this.require(
          Math.abs(g.player.y + g.player.h - g.platforms[5].y) < 3,
          "Missed the water lift",
        );
        if (
          this.resilienceSeed !== null &&
          !this.interruptedTraversal.has(g.room.id)
        ) {
          this.interruptedTraversal.add(g.room.id);
          this.disruptions.push({ room: g.room.id, kind: "lift-reload" });
          this.recover("reload");
          return yield* this.traverse();
        }
        g.input.clear();
        yield* this.until(() => g.platforms[5].y < 470);
        yield* this.walk(1280);
        yield* this.jump(1580, 430);
        break;
      case "swing":
        yield* this.walk(340);
        for (const grip of g.grips) {
          g.input.clear();
          g.input.press("jump");
          this.action = `Swing to ${grip.id}`;
          for (let i = 0; i < 300; i++) {
            this.aim(grip.x - 15);
            yield* this.tick();
            if (g.player.grip === grip.id) break;
          }
          this.require(g.player.grip === grip.id, "Missed grip " + grip.id);
          if (
            this.resilienceSeed !== null &&
            !this.interruptedTraversal.has(g.room.id)
          ) {
            this.interruptedTraversal.add(g.room.id);
            this.disruptions.push({ room: g.room.id, kind: "grip-reload" });
            this.recover("reload");
            return yield* this.traverse();
          }
        }
        yield* this.jump(1850, 650);
        break;
      case "ladder":
        for (const grip of g.grips) {
          yield* this.walk(grip.x - 15);
          g.input.clear();
          g.input.press("jump");
          this.action = `Climb ${grip.id}`;
          yield* this.until(
            () =>
              g.player.grip === grip.id &&
              g.player.y <= grip.y - g.player.h + 1,
            600,
          );
          g.input.press("right");
          yield* this.until(
            () => g.player.grip === null && g.player.grounded,
            240,
          );
          g.input.clear();
        }
        break;
      case "hall":
      case "drawbridge":
      case "prison":
      case "elevator":
        break;
    }
  }
  recover(kind: "respawn" | "reload") {
    this.trace.events.push({ kind });
    this.disruptions.push({ room: this.game.room.id, kind });
    if (kind === "respawn") {
      // Fault injection uses the same damage/death/Retry path as a lethal hit.
      this.game.player.invincible = 0;
      this.game.damage(100);
      this.require(
        this.game.screen === "death",
        "Expected a lethal interruption",
      );
      this.game.respawn();
    } else {
      this.require(!!this.game.saved, "Expected a checkpoint to reload");
      this.game = reloadCampaign(this.game);
    }
    this.held = [];
  }
  private *disturb(index: number) {
    let g = this.game;
    // A return passage enters the completed section at its exit. No teleporting.
    if (index > 0 && index < 39 && index !== 35) {
      const previous = CAMPAIGN_ROOMS[g.room.id].doors[0].to;
      const entry = CAMPAIGN_ROOMS[g.room.id].doors[0];
      yield* this.walk(entry.x - 65);
      yield* this.use();
      this.require(g.room.id === previous, "Return passage failed");
      const exit = CAMPAIGN_ROOMS[g.room.id].doors.find(
        (d) => d.to === SECTIONS[index].id,
      )!;
      yield* this.walk(exit.x - 15);
      yield* this.use();
      this.require(g.room.id === SECTIONS[index].id, "Revisited exit failed");
      this.disruptions.push({ room: g.room.id, kind: "backtrack" });
    }
    if (index === 35) {
      this.require(
        !!g.doorBlock(CAMPAIGN_ROOMS.tomb.doors[0]),
        "Hourglass return must be sealed",
      );
      this.disruptions.push({ room: g.room.id, kind: "point-of-no-return" });
    }
    const p = g.puzzles.definition;
    if (!p) return;
    switch (p.kind) {
      case "crank":
        yield* this.walk(p.controls[0].x - 15);
        yield* this.use();
        break;
      case "timed":
        yield* this.walk(p.lever.x - 15);
        yield* this.use();
        yield* this.walk(p.gate.x - 75);
        g.input.clear();
        this.action = "Let the timed gate close, then return to its lever";
        yield* this.until(() => g.puzzles.state.remaining === 0, 3000);
        break;
      case "crate":
        yield* this.walk(g.puzzles.state.crateX - 65);
        g.input.clear();
        g.input.press("interact");
        g.input.press("right");
        for (let i = 45 + this.random(30); i > 0; i--) yield* this.tick();
        break;
      case "paired":
        yield* this.walk(p.prince.x - 15);
        yield* this.use();
        yield* this.walk(p.prince.x - 180);
        break;
      case "mirror":
        yield* this.walk(p.controls[0].x - 15);
        yield* this.use();
        break;
      case "columns":
        for (const lever of p.levers) {
          yield* this.walk(lever.x - 15);
          yield* this.use();
        }
        yield* this.walk(600);
        yield* this.jump(730, 535);
        g.input.clear();
        this.action = "Wait on a retracting prison column";
        yield* this.until(() => g.puzzles.state.remaining === 0, 3000);
        yield* this.until(() => g.player.grounded, 300);
        this.require(
          g.player.y + g.player.h <= 650,
          "Column carried player through the floor",
        );
        break;
      case "illusion":
        yield* this.walk(p.doors[(p.sequence[0] + 1) % p.doors.length].x - 15);
        yield* this.use();
        break;
      case "battle":
        if (p.recovery) {
          yield* this.traverse();
          yield* this.walk(p.recovery.x - 15);
          yield* this.use();
        } else yield* this.walk(800);
        g.input.clear();
        this.action = "Interrupt an active combat wave";
        for (let i = 30 + this.random(30); i > 0; i--) yield* this.tick();
        if (p.waves > 1) yield* this.fight(2);
        break;
      case "vizier":
        yield* this.fight(2);
        break;
      case "wall":
        return;
    }
    this.disruptions.push({ room: g.room.id, kind: p.kind });
    // Even seeds retry expired mechanisms in place, without resetting their state.
    if (
      (p.kind === "timed" || p.kind === "columns") &&
      this.resilienceSeed !== null &&
      this.resilienceSeed % 2 === 0
    )
      return;
    const recovery = this.random(2) ? "reload" : "respawn";
    if (
      recovery === "reload" &&
      (p.kind === "crank" || p.kind === "mirror" || p.kind === "crate")
    ) {
      yield* this.walk(g.room.fountain!.x - 15);
      yield* this.use();
    }
    this.recover(recovery);
    g = this.game;
    this.require(
      g.room.id === SECTIONS[index].id,
      "Recovery entered the wrong section",
    );
  }
  *rewardRoute(steps: RewardStep[]) {
    for (const step of steps) {
      if (step === "use") yield* this.use();
      else if (step[1] === undefined) yield* this.walk(step[0]);
      else yield* this.jump(step[0], step[1], step[2]);
    }
  }
  private *play() {
    const baths = new BathsRoutes(this),
      palace = new PalaceRoutes(this);
    let g = this.game;
    const first =
      this.scenario === "campaign" ? 0 : this.scenario === "king" ? 7 : 39;
    const last = this.scenario === "campaign" ? 40 : first + 1;
    for (let index = first; index < last; index++) {
      const section = SECTIONS[index];
      this.require(
        g.room.id === section.id,
        "Campaign entered the wrong section",
      );
      // Exercise each acquired power without granting resources or moving the actor directly.
      if (
        g.hasDagger &&
        g.abilities.has("rewind") &&
        !this.powers.has("rewind") &&
        section.layout === "hall"
      ) {
        g.input.clear();
        this.action = "Record and rewind a safe moment";
        for (let i = 0; i < 60; i++) yield* this.tick();
        g.input.press("rewind");
        for (let i = 0; i < 24; i++) yield* this.tick();
        g.input.clear();
      }
      for (const power of ["slow", "freeze"] as const)
        if (g.hasDagger && g.abilities.has(power) && !this.powers.has(power)) {
          g.input.clear();
          g.input.press(power);
          yield* this.tick();
        }
      if (this.resilienceSeed !== null) {
        yield* this.disturb(index);
        g = this.game;
      }
      if (index === 14) {
        yield* baths.bathsApproach();
        this.scenes.push({
          id: section.id,
          dagger: g.hasDagger,
          farah: g.journey.farah,
          grandRewind: g.journey.grandRewind,
        });
        continue;
      }
      if (index === 17 && this.exploreBaths) yield* baths.bathsReturn();
      if (index === 15) yield* baths.bathsSluice();
      if (index === 28 && this.regionOrder === "gardens-first")
        yield* palace.gardens();
      if (index === 32) yield* palace.prison();
      yield* this.solve();
      if (index === 28) {
        yield* palace.sky();
        if (this.regionOrder === "sky-first") yield* palace.gardens();
        if (this.investigateHistory) yield* new HistoryRoute(this).reveal();
      }
      if (
        index !== 15 &&
        section.puzzle?.kind !== "columns" &&
        section.puzzle?.kind !== "battle" &&
        !(section.puzzle?.kind === "wall" && section.layout === "courtyard")
      )
        yield* this.traverse();
      g = this.game;
      const exit =
        CAMPAIGN_ROOMS[section.id].doors.find(
          (d) => d.milestone === section.id,
        ) ?? geometry(section.layout).exit;
      yield* this.walk(
        index === 39 && g.companion ? g.companion.x : exit.x - 15,
      );
      this.scenes.push({
        id: section.id,
        dagger: g.hasDagger,
        farah: g.journey.farah,
        grandRewind: g.journey.grandRewind,
      });
      yield* this.use();
      this.require(
        g.journey.completed[index] === section.id,
        "Milestone did not complete",
      );
    }
    if (this.scenario !== "king") {
      this.require(
        g.screen === "ending" && g.flags.has("victory"),
        "Campaign did not reach the ending",
      );
      this.require(g.journey.grandRewind, "Grand Rewind was skipped");
      this.require(
        (g.saved as CampaignSave | null)?.flags.includes("victory") === true,
        "Victory was not saved",
      );
    }
    if (this.scenario === "campaign")
      this.require(
        SECTIONS.every((s) => g.visited.has(s.id)),
        "Not all 40 story anchors were visited",
      );
    this.action = "Complete";
  }
}
