import type {
  Ability,
  Enemy,
  Companion,
  Options,
  Particle,
  Platform,
  Pickup,
  Player,
  Projectile,
  Room,
  SaveData,
  Screen,
  Story,
  StoryFlag,
  Vec,
} from "./types";
import { SWORD, swordDuration, swordHitbox, swordPhase } from "./combat";
import { Input } from "./input";
import { Sound } from "./audio";
import {
  ABILITIES,
  enemyStats,
  hasRequirement,
  objective,
} from "./progression";
import {
  RUN_SPEED,
  clamp,
  distance,
  overlap,
  platformPositions,
  stepPlayer,
} from "./physics";
import { isBoss, spawnEnemies, stepEnemies } from "./enemies";
import { bossGuards } from "./bosses";
import {
  defaultOptions,
  loadOptions,
  loadSave,
  writeOptions,
  writeSave,
} from "./storage";
import { ROOMS, START } from "./world";
interface Memory extends Vec {
  vx: number;
  vy: number;
  health: number;
  face: number;
  grounded: boolean;
  grip: string | null;
}
export interface GameConfig {
  immortal?: boolean;
  persist?: boolean;
  rooms?: Record<string, Room>;
  start?: Vec & { room: string };
}
export class Game {
  readonly rooms: Record<string, Room>;
  readonly startPoint: Vec & { room: string };
  screen: Screen = "title";
  orientationBlocked = false;
  previousScreen: Screen = "title";
  room: Room = ROOMS.palace;
  player: Player = this.createPlayer();
  input: Input;
  sound: Sound;
  options: Options;
  abilities = new Set<Ability>();
  flags = new Set<StoryFlag>();
  collected = new Set<string>();
  visited = new Set<string>(["palace"]);
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  platforms: Platform[] = [];
  history: Memory[] = [];
  ghosts: Pick<Memory, "x" | "y" | "face">[] = [];
  worldTime = 0;
  visualTime = 0;
  playTime = 0;
  deaths = 0;
  slowTime = 0;
  freezeTime = 0;
  rewinding = false;
  camera: Vec = { x: 0, y: 0 };
  shake = 0;
  flash = 0;
  roomBanner = 0;
  toast = "";
  toastTime = 0;
  story: Story | null = null;
  checkpoint = { room: START.room, x: START.x, y: START.y };
  saved: SaveData | null;
  attackId = 0;
  private attackBuffer = 0;
  private footstep = 0;
  private sandRefill = 0;
  constructor(readonly config: GameConfig = {}) {
    this.rooms = config.rooms ?? ROOMS;
    this.startPoint = config.start ?? START;
    this.options =
      config.persist === false ? { ...defaultOptions } : loadOptions();
    this.saved = config.persist === false ? null : loadSave();
    this.input = new Input(
      (action) => this.menuKey(action),
      () => this.screen === "playing" && !this.orientationBlocked,
    );
    this.sound = new Sound(this.options);
    this.enterRoom(this.startPoint.room, undefined, { x: 1140, y: 469 });
    this.player.grounded = true;
    window.addEventListener("blur", () => {
      if (this.screen === "playing") this.setScreen("pause");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.screen === "playing") this.setScreen("pause");
    });
  }
  private createPlayer(): Player {
    return {
      x: START.x,
      y: START.y,
      w: 30,
      h: 56,
      vx: 0,
      vy: 0,
      face: 1,
      health: 6,
      maxHealth: 6,
      sand: 6,
      maxSand: 6,
      grounded: false,
      wall: 0,
      wallTime: 0,
      coyote: 0,
      jumpBuffer: 0,
      invincible: 0,
      attack: 0,
      attackCooldown: 0,
      combo: 0,
      comboWindow: 0,
      dashTime: 0,
      dashCooldown: 0,
      ledge: null,
      wallLock: 0,
      grip: null,
      gripCooldown: 0,
    };
  }
  get tier() {
    return this.abilities.size;
  }
  get hasDagger() {
    return true;
  }
  get swordPower() {
    return 1;
  }
  get companion(): Companion | null {
    return null;
  }
  get campaignProgress(): {
    completed: number;
    total: number;
    part: string;
    dagger: boolean;
    farah: string;
  } | null {
    return null;
  }
  get grips() {
    return this.room.grips ?? [];
  }
  protected roomPlatforms(time: number) {
    return platformPositions(this.room.platforms, time);
  }
  get quest() {
    return objective(this.abilities, this.flags);
  }
  get boss() {
    return this.enemies.find((e) => !e.dead && isBoss(e.kind));
  }
  start(continueJourney = false) {
    this.sound.start();
    const save = continueJourney ? this.saved : null;
    this.player = this.createPlayer();
    this.abilities = new Set(save?.abilities ?? []);
    this.flags = new Set(save?.flags ?? []);
    this.collected = new Set(save?.collected ?? []);
    this.visited = new Set(save?.visited ?? [this.startPoint.room]);
    this.playTime = save?.playTime ?? 0;
    this.deaths = save?.deaths ?? 0;
    this.checkpoint = save
      ? { room: save.room, ...save.checkpoint }
      : { ...this.startPoint };
    this.player.maxHealth = save?.maxHealth ?? 6;
    this.player.health = this.player.maxHealth;
    this.player.sand = this.hasDagger ? this.player.maxSand : 0;
    this.enterRoom(this.checkpoint.room, undefined, this.checkpoint);
    this.setScreen("playing");
    this.notify(
      save
        ? "The sands remember. Your journey continues."
        : "The Vizier has broken the hourglass. Find the Dagger’s first memory.",
    );
    if (!save) this.save(false);
  }
  setScreen(screen: Screen) {
    this.screen = screen;
    this.attackBuffer = 0;
    this.input.clear();
  }
  menuKey(action: "map" | "pause") {
    if (this.orientationBlocked) return;
    if (action === "map") {
      if (this.screen === "playing" || this.screen === "pause")
        this.setScreen("map");
      else if (this.screen === "map") this.setScreen("playing");
    } else {
      if (this.screen === "playing") this.setScreen("pause");
      else if (this.screen === "pause" || this.screen === "map")
        this.setScreen("playing");
      else if (this.screen === "options" || this.screen === "help")
        this.setScreen(this.previousScreen);
      else if (this.screen === "story") this.closeStory();
    }
  }
  openSubmenu(screen: "options" | "help") {
    if (this.screen === screen) return;
    if (this.screen !== "options" && this.screen !== "help") {
      this.previousScreen = this.screen;
    }
    this.setScreen(screen);
  }
  closeStory() {
    this.story = null;
    this.setScreen("playing");
  }
  notify(text: string) {
    this.toast = text;
    this.toastTime = 5;
  }
  showStory(
    title: string,
    text: string,
    detail: string,
    kind: Story["kind"] = "story",
  ) {
    this.story = { title, text, detail, kind };
    this.setScreen("story");
    this.sound.play("power");
  }
  setOption(key: keyof Options, value: boolean) {
    this.options[key] = value;
    if (this.config.persist !== false) writeOptions(this.options);
  }
  enterRoom(id: string, from?: string, position?: Vec) {
    const room = this.rooms[id];
    if (!room) return;
    this.room = room;
    this.visited.add(id);
    const entry = room.doors.find((d) => d.to === from) ?? room.doors[0];
    this.player.x =
      position?.x ??
      clamp(
        entry.x + (entry.x < room.width / 2 ? 66 : -66),
        12,
        room.width - 42,
      );
    this.player.y = position?.y ?? entry.y - this.player.h;
    this.player.face = this.player.x < room.width / 2 ? 1 : -1;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.ledge = null;
    this.player.grip = null;
    this.player.wall = 0;
    this.player.invincible = 1;
    this.player.dashTime = 0;
    this.player.attack = 0;
    this.player.attackCooldown = 0;
    this.attackBuffer = 0;
    this.player.grounded = false;
    this.worldTime = 0;
    this.slowTime = 0;
    this.freezeTime = 0;
    this.rewinding = false;
    this.history = [];
    this.ghosts = [];
    this.projectiles = [];
    this.particles = [];
    this.enemies = spawnEnemies(
      room.enemies,
      this.tier,
      this.flags.has("guardian"),
      this.flags.has("victory"),
    );
    this.platforms = this.roomPlatforms(this.worldTime);
    this.camera = {
      x: clamp(this.player.x - 460, 0, room.width - 1280),
      y: clamp(this.player.y - 400, 0, room.height - 720),
    };
    this.roomBanner = 4;
    this.input.clear();
  }
  save(showMessage = true) {
    const data: SaveData = {
      version: 1,
      room: this.checkpoint.room,
      checkpoint: { x: this.checkpoint.x, y: this.checkpoint.y },
      abilities: [...this.abilities],
      flags: [...this.flags],
      collected: [...this.collected],
      visited: [...this.visited],
      maxHealth: this.player.maxHealth,
      playTime: this.playTime,
      deaths: this.deaths,
    };
    const success = this.config.persist === false || writeSave(data);
    this.saved = data;
    if (!success)
      this.notify(
        "Browser storage is unavailable. Your journey will last for this session.",
      );
    else if (showMessage)
      this.notify("Journey saved · Health and sands restored");
  }
  respawn() {
    this.player.health = this.player.maxHealth;
    this.player.sand = this.hasDagger ? this.player.maxSand : 0;
    this.enterRoom(this.checkpoint.room, undefined, this.checkpoint);
    this.setScreen("playing");
    this.notify("“No, no. That is not how it happened.”");
  }
  get deathMemory() {
    if (
      !this.hasDagger ||
      !this.abilities.has("rewind") ||
      this.player.sand < 1
    )
      return undefined;
    return [...this.history].reverse().find((m, index) => {
      const body = { ...m, w: this.player.w, h: this.player.h - 1 };
      const supported = m.grip
        ? this.grips.some((grip) => grip.id === m.grip)
        : m.grounded &&
          this.platforms.some(
            (p) =>
              Math.abs(m.y + this.player.h - p.y) < 2 &&
              m.x + body.w > p.x &&
              m.x < p.x + p.w,
          );
      return (
        index > 90 &&
        m.health > 0 &&
        supported &&
        !this.platforms.some((p) => !p.oneWay && overlap(body, p))
      );
    });
  }
  emergencyRewind() {
    const memory = this.deathMemory;
    if (!memory) return;
    Object.assign(this.player, memory);
    this.player.sand -= 1;
    this.player.invincible = 1.5;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.gripCooldown = 0;
    this.player.wallLock = 0;
    this.player.wall = 0;
    this.player.jumpBuffer = 0;
    this.player.dashTime = 0;
    this.history = [];
    this.player.ledge = null;
    this.flash = 0.5;
    this.setScreen("playing");
    this.sound.play("power");
  }
  damage(amount: number, direction = -this.player.face) {
    if (
      this.config.immortal ||
      this.player.invincible > 0 ||
      this.player.dashTime > 0 ||
      this.rewinding ||
      this.screen !== "playing"
    )
      return;
    this.player.health -= this.options.assist ? 1 : amount;
    this.player.attack = 0;
    this.attackBuffer = 0;
    this.player.invincible = this.options.assist ? 1.8 : 1.1;
    this.player.vx = direction * 280;
    this.player.vy = -230;
    this.player.wallLock = 0.16;
    this.player.ledge = null;
    this.shake = 0.3;
    this.sound.play("hit");
    this.burst(this.player.x + 15, this.player.y + 25, "#dc8261", 16);
    if (this.player.health <= 0) this.die();
  }
  private die() {
    this.deaths++;
    this.sound.play("death");
    this.setScreen("death");
  }
  burst(x: number, y: number, color: string, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2,
        speed = 30 + Math.random() * 170,
        life = 0.4 + Math.random() * 0.7;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life,
        maxLife: life,
        size: 1 + Math.random() * 4,
        color,
      });
    }
  }
  abilityCost(ability: Ability) {
    return ABILITIES[ability].cost;
  }
  protected get slowDuration() {
    return 6;
  }
  private spend(ability: Ability): boolean {
    if (!this.hasDagger) {
      this.notify(
        "The Dagger is out of your hands. Time powers are unavailable.",
      );
      return false;
    }
    if (!this.abilities.has(ability)) {
      this.notify(`${ABILITIES[ability].name} has not yet awakened.`);
      return false;
    }
    const cost = this.abilityCost(ability);
    if (this.player.sand < cost) {
      this.notify(
        "The Dagger is empty. Seek sand clouds, enemies, or a fountain.",
      );
      return false;
    }
    this.player.sand -= cost;
    this.sound.play("power");
    this.flash = 0.4;
    this.burst(
      this.player.x + 15,
      this.player.y + 24,
      ABILITIES[ability].color,
      25,
    );
    return true;
  }
  private timePowers(dt: number) {
    this.slowTime = Math.max(0, this.slowTime - dt);
    this.freezeTime = Math.max(0, this.freezeTime - dt);
    const wasDashing = this.player.dashTime > 0;
    this.player.dashTime = Math.max(0, this.player.dashTime - dt);
    if (wasDashing && this.player.dashTime === 0) {
      this.player.vx = this.player.face * RUN_SPEED;
    }
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    if (this.input.consume("slow") && this.spend("slow"))
      this.slowTime = this.slowDuration;
    if (this.input.consume("freeze") && this.spend("freeze"))
      this.freezeTime = 4;
    if (
      this.input.consume("dash") &&
      this.player.dashCooldown <= 0 &&
      this.spend("dash")
    ) {
      this.player.dashTime = 0.23;
      this.player.dashCooldown = 0.6;
      this.player.ledge = null;
    }
    this.rewinding =
      this.input.down("rewind") &&
      this.hasDagger &&
      this.abilities.has("rewind") &&
      this.player.sand > dt &&
      this.history.length > 2;
    if (this.rewinding) {
      this.player.attack = 0;
      this.attackBuffer = 0;
      for (let i = 0; i < 2 && this.history.length > 0; i++) {
        const memory = this.history.pop()!;
        this.ghosts.push({
          x: this.player.x,
          y: this.player.y,
          face: this.player.face,
        });
        Object.assign(this.player, memory);
      }
      this.player.sand = Math.max(0, this.player.sand - dt);
      this.player.invincible = 0.3;
      this.player.ledge = null;
      this.ghosts = this.ghosts.slice(-18);
    } else {
      this.ghosts = this.ghosts.slice(1);
      this.history.push({
        x: this.player.x,
        y: this.player.y,
        vx: this.player.vx,
        vy: this.player.vy,
        health: this.player.health,
        face: this.player.face,
        grounded: this.player.grounded,
        grip: this.player.grip,
      });
      if (this.history.length > 480) this.history.shift();
    }
  }
  private combat(dt: number) {
    const player = this.player;
    player.comboWindow = Math.max(0, player.comboWindow - dt);
    player.attack = Math.max(0, player.attack - dt);
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    if (this.input.consume("attack")) this.attackBuffer = SWORD.buffer;
    if (this.attackBuffer > 0 && player.attackCooldown <= 0) {
      this.attackBuffer = 0;
      player.combo = player.comboWindow > 0 ? (player.combo + 1) % 3 : 1;
      player.comboWindow = 0.8;
      player.attack = swordDuration(player.combo);
      player.attackCooldown = player.attack;
      this.attackId++;
      this.sound.play("attack");
    }
    if (swordPhase(player) !== "active") return;
    const hitbox = swordHitbox(player);
    let contacted = false;
    for (const enemy of this.enemies) {
      if (
        enemy.dead ||
        enemy.protected ||
        enemy.attackId === this.attackId ||
        !overlap(hitbox, enemy)
      )
        continue;
      enemy.attackId = this.attackId;
      if (bossGuards(enemy, player, this.freezeTime > 0)) {
        this.burst(
          enemy.x + enemy.w / 2 + enemy.face * 25,
          player.y + 24,
          "#ffe0a6",
          4,
        );
        contacted = true;
        continue;
      }
      enemy.health -=
        (player.combo === 0 ? 2 : 1) *
        (this.freezeTime > 0 ? 2 : 1) *
        (["king", "double", "vizier", "rival"].includes(enemy.kind)
          ? Math.min(2, this.swordPower)
          : this.swordPower);
      contacted = true;
      enemy.hitFlash = 0.12;
      if (!isBoss(enemy.kind) && enemy.behavior !== "ram") {
        enemy.hitStun = SWORD.recoil;
        enemy.vx = player.face * 125;
        enemy.telegraph = 0;
        enemy.cooldown = Math.max(enemy.cooldown, 0.45);
      }
      this.burst(
        player.face > 0 ? enemy.x : enemy.x + enemy.w,
        Math.max(enemy.y + 8, Math.min(player.y + 24, enemy.y + enemy.h - 8)),
        "#fff0bf",
        8,
      );
      if (enemy.health > 0) continue;
      enemy.dead = true;
      this.burst(enemy.x + 17, enemy.y + 20, "#7de0d0", 30);
      if (this.hasDagger)
        player.sand = Math.min(
          player.maxSand,
          player.sand + this.enemySandReward(enemy),
        );
      this.sound.play("sand");
      this.enemyDefeated(enemy);
    }
    // One impact per simulation step, even when a crowd shares the blade.
    if (contacted) {
      this.shake = Math.max(this.shake, 0.075);
      this.sound.play("impact");
    }
  }
  protected enemySandReward(enemy: Enemy) {
    return enemyStats(this.tier, enemy.kind).reward;
  }
  protected enemyDefeated(enemy: Enemy) {
    if (enemy.kind === "guardian") {
      this.flags.add("guardian");
      this.save(false);
      this.showStory(
        "An oath released",
        "The Guardian lowers his broken blade. For a moment, a man stands where the monster fell. Then he is only sand.",
        "The Bridge of the Hour is open. The Vizier waits beyond it.",
      );
    }
    if (enemy.kind === "vizier") {
      this.flags.add("victory");
      this.save(false);
      this.setScreen("ending");
      this.sound.play("save");
    }
  }
  protected claimItem(_pickup: Pickup) {}
  private collect() {
    for (const pickup of this.room.pickups) {
      if (
        this.collected.has(pickup.id) ||
        (pickup.kind === "sand" && !this.hasDagger) ||
        !hasRequirement(pickup.requires, this.abilities, this.flags)
      )
        continue;
      if (
        distance({ x: this.player.x + 15, y: this.player.y + 25 }, pickup) > 48
      )
        continue;
      this.collected.add(pickup.id);
      this.burst(pickup.x, pickup.y, "#edd293", 35);
      this.sound.play("sand");
      if (
        pickup.kind === "dagger" ||
        pickup.kind === "sword" ||
        pickup.kind === "vessel"
      ) {
        this.claimItem(pickup);
      } else if (pickup.kind === "sand")
        this.player.sand = Math.min(
          this.player.maxSand,
          this.player.sand + Math.max(1, 3 - this.tier * 0.4),
        );
      else if (pickup.kind === "heart") {
        this.player.maxHealth = Math.min(12, this.player.maxHealth + 1);
        this.player.health = this.player.maxHealth;
        this.notify("A life remembered · Maximum health increased");
        this.save(false);
      } else {
        const ability = pickup.kind;
        this.abilities.add(ability);
        this.player.sand = this.player.maxSand;
        this.player.health = this.player.maxHealth;
        const narratives: Record<Ability, string> = {
          rewind:
            "A thousand grains turn against their falling. The Dagger remembers a moment you thought was lost.",
          slow: "The heavens turn. You learn to walk between their movements. Even the fastest blade must wait for you.",
          freeze:
            "Deep beneath the gardens, the water holds its breath. You close your hand, and the world becomes still.",
          dash: "For a heartbeat, you are somewhere else. The sands no longer bind your steps. They carry them.",
        };
        this.save(false);
        this.showStory(
          ABILITIES[ability].name,
          narratives[ability],
          `${ABILITIES[ability].description} The curse deepens: enemies throughout the palace grow stronger.`,
          "ability",
        );
      }
    }
  }
  get interaction(): { label: string; action: () => void } | null {
    const center = { x: this.player.x + 15, y: this.player.y + this.player.h };
    const fountain = this.room.fountain;
    if (fountain && distance(center, fountain) < 95)
      return {
        label: "Rest at the fountain",
        action: () => {
          this.player.health = this.player.maxHealth;
          this.player.sand = this.hasDagger ? this.player.maxSand : 0;
          this.checkpoint = {
            room: this.room.id,
            x: fountain.x - 15,
            y: fountain.y - this.player.h,
          };
          this.history = [];
          this.save();
          this.sound.play("save");
          this.burst(fountain.x, fountain.y - 40, "#73cfc4", 40);
        },
      };
    const event = this.room.event;
    if (event && !this.flags.has(event.flag) && distance(center, event) < 95)
      return {
        label: event.label,
        action: () => {
          if (!hasRequirement(event.requires, this.abilities, this.flags)) {
            this.notify("The mechanism needs another memory of the Dagger.");
            return;
          }
          this.flags.add(event.flag);
          this.save(false);
          this.showStory(
            "The gardens breathe again",
            "Water returns to channels dry for a hundred years. Beneath your feet, the old palace lift begins to rise.",
            "The Upper Palace is open. The courtyard lift and Scriptorium passage now connect the gardens to earlier rooms.",
          );
        },
      };
    for (const door of this.room.doors) {
      if (distance(center, door) > 95) continue;
      const open = hasRequirement(door.requires, this.abilities, this.flags);
      return {
        label: open ? door.label : `${door.label} · Sealed`,
        action: () => {
          if (!open) {
            this.notify(door.hint ?? "This passage has not yet awakened.");
            return;
          }
          this.enterRoom(door.to, this.room.id);
        },
      };
    }
    return null;
  }
  update(dt: number) {
    this.visualTime += dt;
    this.sound.update(
      dt,
      this.screen === "playing" && !this.orientationBlocked,
    );
    if (this.screen !== "playing" || this.orientationBlocked) return;
    this.playTime += dt;
    this.roomBanner = Math.max(0, this.roomBanner - dt);
    this.toastTime = Math.max(0, this.toastTime - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.player.invincible = Math.max(0, this.player.invincible - dt);
    this.timePowers(dt);
    const worldDt =
      dt * (this.freezeTime > 0 ? 0 : this.slowTime > 0 ? 0.25 : 1);
    const previousPlatforms = this.platforms;
    this.worldTime += worldDt;
    this.platforms = this.roomPlatforms(this.worldTime);
    if (!this.rewinding) {
      if (this.player.grounded) {
        previousPlatforms.forEach((p, i) => {
          if (
            p.kind === "moving" &&
            Math.abs(this.player.y + this.player.h - p.y) < 3 &&
            this.player.x + this.player.w > p.x &&
            this.player.x < p.x + p.w
          ) {
            this.player.x += this.platforms[i].x - p.x;
            this.player.y += this.platforms[i].y - p.y;
          }
        });
      }
      const wasGrounded = this.player.grounded;
      stepPlayer(
        this.player,
        this.input,
        this.platforms,
        dt,
        this.room.width,
        this.grips,
      );
      if (wasGrounded && this.player.vy < -400) {
        this.sound.play("jump");
        this.burst(this.player.x + 15, this.player.y + 56, "#baab85", 5);
      }
      this.combat(dt);
      stepEnemies(
        this.enemies,
        this.player,
        this.platforms,
        this.projectiles,
        this.tier,
        worldDt,
        this.freezeTime > 0,
        (amount, direction) => this.damage(amount, direction),
      );
      this.collect();
      for (const projectile of this.projectiles) {
        projectile.x += projectile.vx * worldDt;
        projectile.y += projectile.vy * worldDt;
        projectile.life -= worldDt;
        if (
          overlap(this.player, {
            x: projectile.x - projectile.radius,
            y: projectile.y - projectile.radius,
            w: projectile.radius * 2,
            h: projectile.radius * 2,
          })
        ) {
          this.damage(1, Math.sign(projectile.vx));
          projectile.life = 0;
        }
      }
      this.projectiles = this.projectiles.filter((p) => p.life > 0);
      for (const hazard of this.room.hazards) {
        if (!overlap(this.player, hazard)) continue;
        const active =
          hazard.kind === "spikes" ||
          Math.sin((this.worldTime * Math.PI * 2) / (hazard.period ?? 2)) > 0.3;
        if (active && this.freezeTime <= 0)
          this.damage(hazard.kind === "spikes" ? 2 : 1);
      }
      if (this.player.y > this.room.height + 80 && this.screen === "playing")
        this.die();
      if (this.input.consume("interact")) this.interaction?.action();
    }
    if (this.options.assist && this.hasDagger)
      this.player.sand = Math.min(
        this.player.maxSand,
        this.player.sand + dt * 0.12,
      );
    // A spent dagger can always recover one grain by waiting, preventing a traversal softlock.
    if (
      this.hasDagger &&
      this.player.sand < 1 &&
      !this.rewinding &&
      this.player.dashTime <= 0
    ) {
      this.sandRefill += dt;
      if (this.sandRefill > 7) {
        this.player.sand = 1;
        this.sandRefill = 0;
        this.notify("A last grain returns to the Dagger.");
      }
    } else this.sandRefill = 0;
    this.footstep += dt;
    if (
      this.player.grounded &&
      Math.abs(this.player.vx) > 80 &&
      this.footstep > 0.24
    ) {
      this.sound.play("step");
      this.footstep = 0;
    }
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 150 * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    const cameraSpeed = 1 - Math.exp(-dt * 7);
    this.camera.x +=
      (clamp(
        this.player.x - 540 + this.player.face * 65,
        0,
        Math.max(0, this.room.width - 1280),
      ) -
        this.camera.x) *
      cameraSpeed;
    this.camera.y +=
      (clamp(this.player.y - 390, 0, Math.max(0, this.room.height - 720)) -
        this.camera.y) *
      cameraSpeed;
    this.input.endStep();
  }
}
