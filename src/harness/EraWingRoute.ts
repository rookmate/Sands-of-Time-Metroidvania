import type { CampaignHarness } from "./CampaignHarness";
import type { Action } from "../game/input";

// Continuous optional detour, starting and ending on the maintenance far bank.
// Every switch, echo, collectible and doorway is reached through normal inputs.
export class EraWingRoute {
  constructor(private h: CampaignHarness) {}
  private *press(action: Action) {
    this.h.game.input.clear();
    this.h.game.input.press(action);
    yield* this.h.tick();
    this.h.game.input.clear();
  }
  *play() {
    const h = this.h;
    yield* h.rewardRoute([[1060], [1130, 530], [1175], "use", [935], "use"]);
    h.require(
      h.game.room.id === "mirror-reception",
      "Twin wing entrance missed",
    );
    yield* h.walk(245);
    yield* h.use(); // Ruin opens the reception wall.
    yield* h.walk(1175);
    yield* h.use();
    yield* h.rewardRoute([
      [260],
      [380, 530],
      [450],
      [600, 420],
      [690],
      [820, 310],
      [935],
      "use",
    ]);
    h.require(h.game.journey.wing.era === "intact", "Upper mirror failed");
    yield* h.walk(1175);
    yield* h.use();
    h.require(h.game.room.id === "mirror-vault", "Restored arch missed");
    yield* h.walk(165);
    yield* h.use(); // Rest before the paid echo puzzle.
    yield* h.walk(335);
    yield* this.press("echo");
    yield* h.walk(745);
    yield* h.use();
    yield* this.press("echo");
    yield* h.walk(335);
    h.game.input.clear();
    yield* h.until(() => h.game.echoes.open, 600);
    yield* h.walk(1045);
    yield* h.use();
    h.require(h.game.echoes.solved, "Wing echo latch failed");
    yield* h.walk(1140);
    yield* h.walk(1195);
    yield* h.use();
    h.require(h.game.journey.wing.discovered, "Unsent dedication missed");
    yield* h.walk(55);
    yield* h.use();
    yield* h.drop(1124, 650);
    yield* h.walk(55);
    yield* h.use();
    yield* h.walk(985);
    yield* h.use(); // Open the reception wall for the return.
    yield* h.walk(245);
    yield* h.use(); // Leave the wing intact; always safe on this landing.
    yield* h.walk(55);
    yield* h.use();
    h.require(h.game.room.id === "echo-gallery", "Wing exit missed");
    yield* h.walk(100);
    yield* h.use();
    yield* h.walk(970);
    yield* h.jump(970, 650);
  }
}
