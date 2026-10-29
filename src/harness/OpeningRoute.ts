import type { CampaignHarness } from "./CampaignHarness";
import { SUN_HEART, SUN_VAULT } from "../campaign/opening";

export class OpeningRoute {
  constructor(private h: CampaignHarness) {}
  *notice() {
    const h = this.h;
    yield* h.rewardRoute([[455], [605, 535]]);
    h.require(
      h.game.interaction?.label.includes("Dagger-shaped") === true,
      "Sun vault must explain its seal before the Dagger",
    );
    yield* h.use();
    h.require(h.game.room.id === "siege", "Sun seal opened too early");
  }
  *return() {
    const h = this.h;
    const milestones = [...h.game.journey.completed];
    // Rewind real movement after the Dagger, without changing mechanisms.
    yield* h.walk(1430);
    h.game.input.clear();
    h.game.input.press("rewind");
    for (let i = 0; i < 48; i++) yield* h.tick();
    h.game.input.clear();
    yield* h.rewardRoute([
      [1180],
      [850, 650],
      [710],
      [400, 650],
      [165],
      "use",
      [1040],
      [790, 650],
      [455],
      [605, 535],
      "use",
    ]);
    h.require(h.game.room.id === SUN_VAULT, "Dagger did not open sun vault");
    yield* h.rewardRoute([
      [200],
      "use",
      [245],
      [365, 530],
      [425],
      [650, 420],
      [705],
      [930, 310],
      [990],
    ]);
    h.require(h.game.collected.has(SUN_HEART), "Sun vault upgrade missed");
    h.require(
      h.game.player.maxHealth === 7,
      "First life upgrade did not apply",
    );
    if (h.resilienceSeed !== null) {
      h.recover("respawn");
      h.recover("reload");
    }
    yield* h.rewardRoute([
      [100],
      "use",
      [790],
      [1040, 650],
      [2085],
      "use",
      [290],
      [410, 530],
      [445],
      [655, 430],
      [730],
      [955, 350],
      [1390],
    ]);
    h.require(
      h.game.room.id === "treasury",
      "Opening did not return to treasury",
    );
    h.require(
      JSON.stringify(h.game.journey.completed) === JSON.stringify(milestones),
      "Optional exploration advanced the story",
    );
  }
}
