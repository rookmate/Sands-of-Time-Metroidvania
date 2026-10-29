import type { CampaignGame } from "./CampaignGame";
import { ECHO_CHAMBERS } from "./echoRooms";
import type { Platform, Player, Vec } from "../game/types";
import type { Action } from "../game/input";
import { distance, overlap, stepPlayer } from "../game/physics";

const STEP = 1 / 120;
const MAX_FRAMES = 8 * 120;
const LIFE_FRAMES = 24 * 120;
const MOVEMENT: Action[] = ["left", "right", "jump", "down", "interact"];
type Frame = { held: Action[]; pressed: Action[] };
// This input port has no DOM listeners and accepts only the movement whitelist.
class EchoInput {
  private held: Action[] = [];
  private pressed = new Set<Action>();
  load(frame: Frame) {
    this.held = frame.held;
    this.pressed = new Set(frame.pressed);
  }
  down(action: Action) {
    return this.held.includes(action);
  }
  consume(action: Action) {
    return this.pressed.delete(action);
  }
}
export class Echoes {
  phase: "idle" | "recording" | "playing" = "idle";
  actor: Player | null = null;
  private origin: Player | null = null;
  private tape: Frame[] = [];
  private cursor = 0;
  private life = 0;
  private gateTime = 0;
  private port = new EchoInput();
  constructor(private g: CampaignGame) {}
  get chamber() {
    return ECHO_CHAMBERS[this.g.room.id];
  }
  get available() {
    return !!this.chamber && this.g.hasDagger;
  }
  get frames() {
    return this.tape.length;
  }
  get status() {
    if (this.phase === "recording")
      return `Recording ${Math.floor(this.frames / 120)} / 8s · C replay · X cancel`;
    if (this.phase === "playing")
      return `Echo ${Math.ceil((LIFE_FRAMES - this.life) / 120)}s · loop ${Math.floor(this.cursor / 120)} / ${(this.frames / 120).toFixed(1)}s · C replace · X cancel`;
    return "C record · 1 sand · up to 8s · X cancel";
  }
  clear() {
    this.phase = "idle";
    this.actor = this.origin = null;
    this.tape = [];
    this.cursor = this.life = 0;
    this.gateTime = 0;
  }
  private near(body: Player, v: Vec) {
    return distance({ x: body.x + body.w / 2, y: body.y + body.h }, v) < 45;
  }
  get plateHeld() {
    const c = this.chamber;
    return (
      !!c &&
      [this.g.player, this.actor].some(
        (b) => b && b.grounded && this.near(b, c.plate),
      )
    );
  }
  get solved() {
    return this.g.journey.echoes.solved.includes(this.g.room.id);
  }
  get open() {
    return (
      this.solved || (this.chamber?.bell ? this.gateTime > 0 : this.plateHeld)
    );
  }
  platforms(base: Platform[]) {
    if (!this.chamber) return base;
    return [
      ...base,
      ...(!this.open ? [{ ...this.chamber.gate }] : []),
      ...(this.chamber.bridge && (this.solved || this.plateHeld)
        ? [this.chamber.bridge]
        : []),
    ];
  }
  private ring(body: Player) {
    const bell = this.chamber?.bell;
    if (bell && this.near(body, bell) && this.plateHeld) this.gateTime = 4;
  }
  private command() {
    const g = this.g;
    if (this.phase === "recording") {
      if (this.frames < 60) {
        g.notify("Record at least half a second before replaying.");
        return;
      }
      this.gateTime = 0;
      this.phase = "playing";
      this.actor = structuredClone(this.origin);
      g.notify(
        "Echo repeats for 24s. Only striped plates and marked bells answer it.",
      );
      return;
    }
    if (!this.available || !g.abilities.has("rewind")) {
      g.notify(
        "Echoes answer only inside the waterkeepers' striped chambers, with the Dagger.",
      );
      return;
    }
    if (g.player.sand < 1) {
      g.notify("An echo recording costs 1 sand. Rest at the entry fountain.");
      return;
    }
    // Starting from rest makes loop resets legible and collision-safe.
    if (
      !g.player.grounded ||
      g.player.grip ||
      g.player.ledge ||
      g.player.dashTime > 0
    ) {
      g.notify("Begin an echo recording while standing on a floor or shelf.");
      return;
    }
    this.clear();
    g.player.sand -= 1;
    this.origin = {
      ...structuredClone(g.player),
      attack: 0,
      attackCooldown: 0,
      combo: 0,
      comboWindow: 0,
      sand: 0,
    };
    this.phase = "recording";
    g.notify(
      "Recording movement and marked bells. C replays; X cancels. Other time powers cancel the tape.",
    );
  }
  // Called before the player's ordinary fixed step; never invokes game commands.
  step() {
    const g = this.g;
    if (g.input.consume("cancelEcho")) {
      this.clear();
      g.notify("Echo cancelled. Spent sand stays spent.");
    }
    const incompatible = (
      ["rewind", "slow", "freeze", "dash"] as Action[]
    ).some((a) => g.input.down(a) || g.input.snapshotPressed().includes(a));
    if (incompatible || !g.hasDagger) this.clear();
    if (g.input.consume("echo") && !incompatible) this.command();
    if (this.phase === "recording") {
      this.tape.push({
        held: g.input.snapshotHeld().filter((a) => MOVEMENT.includes(a)),
        pressed: g.input.snapshotPressed().filter((a) => MOVEMENT.includes(a)),
      });
      if (this.frames === MAX_FRAMES) this.command();
    }
    this.gateTime = Math.max(0, this.gateTime - STEP);
    if (this.phase !== "playing" || !this.actor) return;
    if (this.life++ >= LIFE_FRAMES) {
      this.clear();
      g.notify("Echo faded. Record again or rest at the fountain.");
      return;
    }
    if (this.cursor === this.frames) {
      this.actor = structuredClone(this.origin)!;
      this.cursor = 0;
    }
    this.port.load(this.tape[this.cursor++]);
    // Same movement/collision code as the Prince. No combat, collection, saves,
    // powers, story, companion commands or arbitrary interaction dispatch.
    stepPlayer(this.actor, this.port, g.platforms, STEP, g.room.width, g.grips);
    if (this.port.consume("interact")) this.ring(this.actor);
    if (this.actor.y > g.room.height + 80) {
      this.clear();
      g.notify("Echo lost its footing. Record a fresh route.");
    }
  }
  controls() {
    const c = this.chamber;
    if (!c) return [];
    return [
      ...(c.bell
        ? [
            {
              ...c.bell,
              label: "Ring marked echo bell · 4s",
              action: () => this.ring(this.g.player),
            },
          ]
        : []),
      {
        ...c.latch,
        label: this.solved
          ? "Echo latch secured"
          : "Secure the echo latch permanently",
        action: () => {
          if (this.solved) {
            this.g.notify("This latch is already secured.");
            return;
          }
          if (
            overlap(this.g.player, c.gate) ||
            this.g.player.x < c.gate.x + c.gate.w
          ) {
            this.g.notify(
              "Cross the echo gate while its striped mechanisms are held, then secure this latch.",
            );
            return;
          }
          this.g.journey.echoes.solved.push(this.g.room.id);
          this.clear();
          this.g.history = [];
          this.g.save(false);
          this.g.notify(
            this.g.room.id === "echo-span"
              ? "The divided ascent is secured. Its span and gallery return arch stay open. The keepers' marks record two hands working as one."
              : "Latch secured. The gate stays open through death and reload; the next chamber is open.",
          );
        },
      },
    ];
  }
}
