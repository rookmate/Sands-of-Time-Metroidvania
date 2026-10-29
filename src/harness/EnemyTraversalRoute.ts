import type { CampaignHarness } from "./CampaignHarness";
import { scarabOnPlate } from "../campaign/enemyTraversal";

export class EnemyTraversalRoute {
  constructor(private h: CampaignHarness) {}
  *explore() {
    const h = this.h;
    yield* h.rewardRoute([[345], "use", [175], "use", [285], "use"]);
    yield* this.bait();
    yield* h.rewardRoute([[1175], "use", [175], "use"]);
    yield* this.cross();
    yield* h.rewardRoute([[1520], [1380]]);
    yield* h.drop(1380, 650);
    yield* h.rewardRoute([[55], "use", [55], "use"]);
    h.require(h.game.room.id === "zoo", "Pens return missed the zoo");
  }
  *bait() {
    const h = this.h,
      g = h.game;
    h.action = "Bait the hollow ram into the weakened wall";
    // Pass above the ram, land between it and the wall, then let it sight us.
    yield* h.walk(360);
    yield* h.jump(790, 650);
    g.input.clear();
    yield* h.until(() => !!g.enemies[0].charge, 900);
    yield* h.until(() => g.enemies[0].telegraph < 0.25, 120);
    g.input.press("jump");
    yield* h.until(() => g.journey.traversal.broken, 240);
    g.input.clear();
    yield* h.until(() => g.player.grounded, 240);
  }
  *cross() {
    const h = this.h,
      g = h.game;
    yield* h.rewardRoute([[300], [410, 530], [450], [565, 420]]);
    g.input.clear();
    h.action = "Wait for the scarab to weight the striped plate";
    yield* h.until(() => scarabOnPlate(g), 600);
    g.input.press("freeze");
    yield* h.tick();
    g.input.clear();
    h.require(g.freezeTime > 0, "Scarab was not frozen");
    yield* h.rewardRoute([
      [680],
      [860, 420],
      [940],
      [1140, 420],
      [1200],
      [1375, 420],
      "use",
    ]);
    h.require(g.journey.traversal.latched, "Crossing latch not secured");
  }
}
