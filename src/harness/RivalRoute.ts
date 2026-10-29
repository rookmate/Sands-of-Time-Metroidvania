import type { CampaignHarness } from "./CampaignHarness";
import type { RivalOutcome } from "../campaign/rival";

export class RivalRoute {
  constructor(private h: CampaignHarness) {}
  *court() {
    const h = this.h;
    yield* h.drop(975, 650);
    yield* h.rewardRoute([
      [975],
      "use",
      [175],
      "use",
      [295],
      "use",
      [445],
      "use",
    ]);
    yield* this.duel();
    yield* h.rewardRoute([[55], "use"]);
  }
  *gallery() {
    const h = this.h;
    yield* h.rewardRoute([
      [885],
      "use",
      [885],
      "use",
      [175],
      "use",
      [295],
      "use",
      [445],
      "use",
    ]);
    yield* this.duel();
    yield* h.rewardRoute([[55], "use", [85], "use"]);
    h.require(
      h.game.room.id === "learning",
      "Rival gallery return missed Learning",
    );
  }
  *muster(outcome: RivalOutcome) {
    const h = this.h;
    yield* h.rewardRoute([[725], "use", [175], "use", [295], "use"]);
    if (outcome === "released") yield* h.rewardRoute([[585], "use"]);
    else {
      yield* h.rewardRoute([[445], "use"]);
      yield* this.duel();
    }
    h.require(
      h.game.journey.rival.outcome === outcome,
      "Rival resolution missing",
    );
    yield* h.rewardRoute([[55], "use"]);
  }
  *duel() {
    const h = this.h,
      g = h.game;
    h.action = "Sahir's committed drill";
    const e = g.enemies[0];
    h.require(e?.kind === "rival", "No rival accepted");
    // Read the first tell from safe range before approaching. The route uses
    // ordinary Freeze and sword inputs, while dedicated tests exercise dodges.
    g.input.clear();
    yield* h.until(() => e.telegraph > 0, 600);
    if (g.room.id !== "crest-court") {
      yield* h.rewardRoute([
        [480, 590],
        [660, 530],
      ]);
      if (g.room.id === "crest-rest") yield* h.rewardRoute([[700], [880, 530]]);
      else yield* h.walk(790);
    } else yield* h.walk(710);
    g.input.clear();
    g.input.press("freeze");
    yield* h.tick();
    g.input.clear();
    for (let i = 0; i < 1200 && !e.dead; i++) {
      const dx = e.x - g.player.x;
      g.input.release(dx > 0 ? "left" : "right");
      g.input.press(dx > 0 ? "right" : "left");
      if (i % 42 === 0) {
        g.input.release("attack");
        g.input.press("attack");
      }
      if (
        (g.player.y + g.player.h > e.y + e.h + 60 ||
          (e.telegraph > 0 &&
            e.telegraph < 0.25 &&
            e.rivalMove === "thrust")) &&
        g.player.grounded
      ) {
        g.input.release("jump");
        g.input.press("jump");
      }
      yield* h.tick();
    }
    g.input.clear();
    h.require(
      e.dead,
      `Rival duel did not end ${JSON.stringify(e)} health=${g.player.health}`,
    );
    yield* h.until(() => g.player.grounded, 300);
  }
}
