import type { CampaignHarness } from "./CampaignHarness";
import type { Action } from "../game/input";

// Optional continuous route from the maintenance far bank, using only inputs.
export class EchoRoute {
  constructor(private h: CampaignHarness) {}
  private *press(action: Action) {
    this.h.game.input.clear();
    this.h.game.input.press(action);
    yield* this.h.tick();
    this.h.game.input.clear();
  }
  private *wait(frames: number) {
    this.h.game.input.clear();
    for (let i = 0; i < frames; i++) yield* this.h.tick();
  }
  *play() {
    const h = this.h;
    yield* h.rewardRoute([
      [1060],
      [1130, 530],
      [1175],
      "use",
      [260],
      [360, 530],
      [420],
      [650, 420],
      [690],
      [820, 310],
      [1200],
      "use",
    ]);
    h.require(h.game.room.id === "echo-step", "Echo entrance missed");
    yield* h.walk(165);
    yield* h.use();
    yield* h.walk(305);
    yield* this.press("echo");
    yield* this.wait(120);
    yield* this.press("echo");
    yield* h.walk(1045);
    yield* h.use();
    h.require(h.game.echoes.solved, "Threshold latch failed");
    yield* h.walk(1175);
    yield* h.use();
    yield* h.walk(165);
    yield* h.use();
    yield* h.walk(305);
    yield* this.press("echo");
    yield* h.walk(745);
    yield* h.use();
    yield* this.press("echo");
    yield* h.walk(305);
    h.game.input.clear();
    yield* h.until(() => h.game.echoes.open, 600);
    yield* h.walk(1105);
    yield* h.use();
    h.require(h.game.echoes.solved, "Bell latch failed");
    yield* h.walk(1175);
    yield* h.use();
    yield* h.walk(165);
    yield* h.use();
    yield* h.walk(260);
    yield* h.jump(380, 530);
    yield* h.walk(415);
    yield* this.press("echo");
    yield* this.wait(360);
    yield* h.use();
    yield* this.press("echo");
    yield* h.jump(590, 420);
    yield* h.jump(790, 420);
    h.game.input.clear();
    yield* h.until(() => h.game.echoes.open, 600);
    yield* h.jump(1040, 420);
    yield* h.walk(1105);
    yield* h.use();
    h.require(h.game.echoes.solved, "Ascent latch failed");
    yield* h.walk(1175);
    yield* h.use();
    h.require(h.game.room.id === "echo-gallery", "Echo return arch missed");
    yield* h.walk(100);
    yield* h.use();
    yield* h.walk(970);
    yield* h.jump(970, 650);
  }
}
