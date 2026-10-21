import { Game } from "../game/Game";
import { ORDER } from "../game/progression";
import type { Ability, Projectile, StoryFlag } from "../game/types";
import { ROOMS, START } from "../game/world";
import { campaignRoute, type RouteStep } from "./route";

export const HARNESS_STEP = 1 / 120;
export type Scenario = "campaign" | "guardian" | "vizier";
export type HarnessStatus = "running" | "paused" | "passed" | "failed";
export interface HarnessOptions {
  scenario?: Scenario;
  immortal?: boolean;
  explore?: boolean;
}
export interface BossReport {
  kind: "guardian" | "vizier";
  phases: number[];
  telegraphs: number;
  projectiles: number;
  defeated: boolean;
}
export interface HarnessReport {
  scenario: Scenario;
  immortal: boolean;
  status: HarnessStatus;
  frames: number;
  seconds: number;
  step: number;
  totalSteps: number;
  action: string;
  room: string;
  position: { x: number; y: number };
  health: number;
  sand: number;
  deaths: number;
  rooms: string[];
  abilities: Ability[];
  powersUsed: Ability[];
  flags: StoryFlag[];
  collected: string[];
  bosses: BossReport[];
  error: string | null;
}

export class Harness {
  readonly game: Game;
  readonly scenario: Scenario;
  readonly immortal: boolean;
  readonly explore: boolean;
  status: HarnessStatus = "running";
  frames = 0;
  stepIndex = 0;
  action = "Starting";
  error: string | null = null;
  readonly bosses: BossReport[] = [];
  private readonly powersUsed = new Set<Ability>();
  private readonly route: RouteStep[];
  private readonly playback: Generator<void>;

  constructor(options: HarnessOptions = {}) {
    this.scenario = options.scenario ?? "campaign";
    this.immortal = options.immortal ?? true;
    this.explore = options.explore ?? true;
    this.game = new Game({ immortal: this.immortal, persist: false });
    this.game.options.music = false;
    this.game.options.sfx = false;
    this.game.options.shake = false;
    if (this.scenario === "campaign") {
      this.game.enterRoom(START.room, undefined, START);
      this.route = campaignRoute(this.explore);
    } else {
      // Boss fixtures are the only scenarios that grant powers or set a spawn.
      this.game.abilities = new Set(ORDER);
      this.game.flags.add("water");
      if (this.scenario === "vizier") this.game.flags.add("guardian");
      this.game.enterRoom(
        this.scenario === "guardian" ? "corrupted" : "throne",
        undefined,
        { x: this.scenario === "guardian" ? 1180 : 900, y: 594 },
      );
      this.route = [{ kind: "fight", boss: this.scenario }];
    }
    this.game.setScreen("playing");
    this.playback = this.play();
  }

  pause() {
    if (this.status === "running") this.status = "paused";
  }
  resume() {
    if (this.status === "paused") this.status = "running";
  }
  // Explicit stepping works while paused. The browser calls this only when running.
  step(count = 1) {
    if (!Number.isInteger(count) || count < 1 || count > 120000)
      throw new Error("Step count must be an integer between 1 and 120000");
    for (let i = 0; i < count; i++) {
      if (this.status === "passed" || this.status === "failed") break;
      try {
        if (this.playback.next().done) {
          this.status = "passed";
          this.game.input.clear();
        }
      } catch (error) {
        this.status = "failed";
        const p = this.game.player;
        this.error = `${error instanceof Error ? error.message : String(error)}; step ${Math.min(this.stepIndex + 1, this.route.length)}/${this.route.length} (${this.action}), room ${this.game.room.id}, x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}, frame=${this.frames}`;
        this.game.input.clear();
      }
    }
    return this.report();
  }
  report(): HarnessReport {
    const g = this.game;
    return {
      scenario: this.scenario,
      immortal: this.immortal,
      status: this.status,
      frames: this.frames,
      seconds: this.frames * HARNESS_STEP,
      step: Math.min(this.stepIndex + 1, this.route.length),
      totalSteps: this.route.length,
      action: this.action,
      room: g.room.id,
      position: { x: g.player.x, y: g.player.y },
      health: g.player.health,
      sand: g.player.sand,
      deaths: g.deaths,
      rooms: [...g.visited],
      abilities: [...g.abilities],
      powersUsed: [...this.powersUsed],
      flags: [...g.flags],
      collected: [...g.collected],
      bosses: this.bosses.map((b) => ({ ...b, phases: [...b.phases] })),
      error: this.error,
    };
  }
  private require(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
  }
  private aim(x: number) {
    const diff = x - this.game.player.x;
    const input = this.game.input;
    input.release(diff > 0 ? "left" : "right");
    if (Math.abs(diff) > 7) input.press(diff > 0 ? "right" : "left");
    else {
      input.release("left");
      input.release("right");
    }
  }
  private pulse(action: "attack" | "freeze" | "interact" | "dash") {
    this.game.input.release(action);
    this.game.input.press(action);
  }
  private *tick() {
    const g = this.game;
    this.require(!g.orientationBlocked, "Landscape orientation is required");
    if (g.screen === "pause") g.setScreen("playing");
    this.require(g.screen === "playing", `Unexpected screen ${g.screen}`);
    if (this.frames % 54 === 0) this.pulse("attack");
    const slow = g.slowTime,
      freeze = g.freezeTime,
      dash = g.player.dashTime;
    g.update(HARNESS_STEP);
    if (g.slowTime > slow) this.powersUsed.add("slow");
    if (g.freezeTime > freeze) this.powersUsed.add("freeze");
    if (g.player.dashTime > dash) this.powersUsed.add("dash");
    if (g.rewinding) this.powersUsed.add("rewind");
    this.frames++;
    if (g.screen === "story") g.closeStory();
    this.require(g.screen !== "death", "Player died or fell out of the room");
    yield;
  }
  private *walk(x: number) {
    for (let i = 0; i < 1800; i++) {
      this.aim(x);
      yield* this.tick();
      if (Math.abs(this.game.player.x - x) < 9 && this.game.player.grounded)
        return;
    }
    throw new Error(`Could not walk to ${x} within 15 seconds`);
  }
  private *jump(step: Extract<RouteStep, { kind: "jump" }>) {
    const g = this.game;
    const x = step.x === "ferry" ? g.platforms[3].x + 80 : step.x;
    g.input.press("jump");
    for (let i = 0; i < 240; i++) {
      this.aim(x);
      if (i === step.dashFrame) this.pulse("dash");
      yield* this.tick();
      if (i > 12 && g.player.grounded) {
        const floor = step.floor === "lift" ? g.platforms[5].y : step.floor;
        this.require(
          Math.abs(g.player.y + g.player.h - floor) < 2,
          `Jump to ${x} landed at floor ${(g.player.y + g.player.h).toFixed(1)}, expected ${floor.toFixed(1)}`,
        );
        return;
      }
    }
    throw new Error(`Could not land jump to ${x} within two seconds`);
  }
  private *fight(kind: "guardian" | "vizier") {
    const g = this.game;
    const boss = g.boss;
    if (!boss || boss.kind !== kind) throw new Error(`Expected living ${kind}`);
    const report: BossReport = {
      kind,
      phases: [],
      telegraphs: 0,
      projectiles: 0,
      defeated: false,
    };
    this.bosses.push(report);
    const seenProjectiles = new Set<Projectile>();
    let telegraphing = false;
    for (let i = 0; i < 7200; i++) {
      if (boss.dead) {
        report.defeated = true;
        return;
      }
      // Mortal regression runs use Sand Prison. Immortal runs leave both boss phases active.
      if (
        !this.immortal &&
        g.freezeTime < 0.1 &&
        g.player.sand >= 2 &&
        Math.abs(g.player.x - boss.x) < 130
      )
        this.pulse("freeze");
      const target = boss.x - 55;
      this.aim(target);
      if (Math.abs(g.player.x - target) < 9 && g.player.face < 0) {
        g.input.release("left");
        g.input.press("right");
      }
      yield* this.tick();
      if (!report.phases.includes(boss.phase)) report.phases.push(boss.phase);
      if (boss.telegraph > 0 && !telegraphing) report.telegraphs++;
      telegraphing = boss.telegraph > 0;
      for (const p of g.projectiles) {
        if (!seenProjectiles.has(p)) {
          report.projectiles++;
          seenProjectiles.add(p);
        }
      }
    }
    throw new Error(`${kind} fight exceeded sixty seconds`);
  }
  private *execute(step: RouteStep): Generator<void> {
    const g = this.game;
    switch (step.kind) {
      case "walk":
        return yield* this.walk(step.x);
      case "jump":
        return yield* this.jump(step);
      case "fight":
        return yield* this.fight(step.boss);
      case "wait":
        for (let i = 0; i < 3000; i++) {
          const value = g.platforms[step.platform]?.[step.axis];
          this.require(
            value !== undefined,
            `Missing moving platform ${step.platform}`,
          );
          if (value > step.min && value < step.max) return;
          yield* this.tick();
        }
        throw new Error(
          "Moving platform did not reach its boarding position within 25 seconds",
        );
      case "power": {
        this.require(g.abilities.has(step.power), `Missing ${step.power}`);
        const before = g.player.sand;
        g.input.press(step.power);
        for (let i = 0; i < step.frames; i++) yield* this.tick();
        this.require(
          g.player.sand < before,
          `${step.power} did not consume sand`,
        );
        return;
      }
      case "pickup":
        this.require(g.collected.has(step.id), `Missed pickup ${step.id}`);
        return;
      case "door":
      case "rest":
      case "sluice": {
        const label =
          step.kind === "door"
            ? g.room.doors.find((d) => d.to === step.room)?.label
            : step.kind === "rest"
              ? "Rest at the fountain"
              : "Restore the garden waters";
        this.require(
          !!label && g.interaction?.label === label,
          `Expected ${step.kind === "door" ? `door to ${step.room}` : step.kind}, found ${g.interaction?.label ?? "no interaction"}`,
        );
        this.pulse("interact");
        yield* this.tick();
        if (step.kind === "door")
          this.require(
            g.room.id === step.room,
            `Door did not enter ${step.room}`,
          );
        else if (step.kind === "sluice")
          this.require(g.flags.has("water"), "Sluice did not restore water");
        else
          this.require(
            g.player.health === g.player.maxHealth &&
              g.player.sand === g.player.maxSand,
            "Fountain did not restore resources",
          );
        return;
      }
    }
  }
  private *play() {
    for (
      this.stepIndex = 0;
      this.stepIndex < this.route.length;
      this.stepIndex++
    ) {
      const step = this.route[this.stepIndex];
      this.action = JSON.stringify(step);
      this.game.input.clear();
      yield* this.execute(step);
    }
    if (this.scenario === "campaign") {
      this.require(
        this.game.screen === "ending" && this.game.flags.has("victory"),
        "Campaign did not reach the ending",
      );
      this.require(
        ORDER.every((a) => this.game.abilities.has(a)),
        "Missing time powers",
      );
      this.require(
        this.game.saved?.flags.includes("victory") === true,
        "Victory was not saved",
      );
      if (this.explore) {
        this.require(
          ORDER.every((a) => this.powersUsed.has(a)),
          "Not all time powers were exercised",
        );
        this.require(
          Object.keys(ROOMS).every((id) => this.game.visited.has(id)),
          "Not all twelve rooms were visited",
        );
        for (const room of Object.values(ROOMS))
          for (const pickup of room.pickups)
            if (pickup.kind === "heart")
              this.require(
                this.game.collected.has(pickup.id),
                `Missed ruby ${pickup.id}`,
              );
      }
    } else {
      const flag = this.scenario === "guardian" ? "guardian" : "victory";
      this.require(this.game.flags.has(flag), `Boss did not set ${flag}`);
      this.require(
        this.game.saved?.flags.includes(flag) === true,
        `Boss did not save ${flag}`,
      );
    }
    this.action = "Complete";
  }
}
