import type { CampaignHarness } from "./CampaignHarness";

// All authored actions use ordinary movement and E. No state or actor grants.
export class ConsequencesRoute {
  constructor(private h: CampaignHarness) {}
  *store() {
    const h = this.h;
    yield* h.rewardRoute([
      [205],
      "use",
      [665],
      "use",
      [260],
      [370, 530],
      [420],
      [650, 420],
      [985],
      "use",
    ]);
    h.require(
      h.game.journey.consequences.nimaRescued,
      "Nima's grille did not open",
    );
    yield* h.walk(1150);
    yield* h.until(() => h.game.player.grounded && h.game.player.y > 580, 300);
    yield* h.rewardRoute([[55], "use"]);
    h.require(h.game.room.id === "root-conduit", "Store return failed");
  }
  *refuge() {
    const h = this.h,
      water = h.game.journey.palace.irrigated;
    yield* h.rewardRoute([
      [885],
      "use",
      [435],
      "use",
      [260],
      [370, 530],
      [420],
      [650, 420],
      [985],
      "use",
    ]);
    h.require(
      h.game.journey.consequences.liftRepaired === water,
      "Lift repair ignored garden water",
    );
    yield* h.walk(1150);
    yield* h.until(() => h.game.player.grounded && h.game.player.y > 580, 300);
    yield* h.rewardRoute([[1135], "use"]);
    h.require(h.game.room.id === "lamp-refuge", "Lift bypassed prison locks");
    yield* h.rewardRoute([[55], "use"]);
    h.require(h.game.room.id === "cypress-crown", "Refuge return failed");
  }
  *lift() {
    const h = this.h;
    yield* h.rewardRoute([[735], "use", [435], "use", [1135], "use"]);
    h.require(
      h.game.room.id === "warden-loft",
      "Repaired lift failed its round trip",
    );
  }
}
