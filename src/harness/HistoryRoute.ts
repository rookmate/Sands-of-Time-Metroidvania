import type { CampaignHarness } from "./CampaignHarness";

// A real return from Learning, using the irrigated court stair both ways.
export class HistoryRoute {
  constructor(private h: CampaignHarness) {}
  *reveal() {
    const h = this.h;
    const milestones = h.game.journey.completed.length;
    yield* h.rewardRoute([[85], "use", [1715], "use", [85], "use"]);
    yield* h.drop(930, 650);
    yield* h.rewardRoute([[765], "use"]); // Examine the sill before pressing it.
    h.game.input.clear();
    h.game.input.press("down");
    h.game.input.press("interact");
    yield* h.tick();
    h.game.input.clear();
    yield* h.until(() => h.game.screen === "playing", 10);
    h.require(h.game.journey.history.opened, "Cypress facing did not lower");
    yield* h.use();
    h.require(
      h.game.room.id === "witness-room",
      "Witness room entrance missed",
    );
    yield* h.rewardRoute([[345], "use", [725], "use", [1040]]);
    h.require(
      h.game.collected.has("witness-room-heart"),
      "Witness heart missed",
    );
    h.require(
      h.game.journey.history.read.includes("witness"),
      "Witness names missed",
    );
    h.require(
      h.game.journey.completed.length === milestones,
      "Mystery advanced the story",
    );
    yield* h.rewardRoute([
      [85],
      "use",
      [250],
      [350, 530],
      [400],
      [620, 420],
      [680],
      [920, 310],
      [1135],
      "use",
      [260],
      [360, 530],
      [420],
      [650, 420],
      [690],
      [940, 310],
      [1145],
      "use",
      [2085],
      "use",
    ]);
    h.require(h.game.room.id === "learning", "Mystery return missed Learning");
  }
}
