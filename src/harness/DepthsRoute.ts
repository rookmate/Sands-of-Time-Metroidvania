import type { CampaignHarness } from "./CampaignHarness";
import { DEPTHS_HEART } from "../campaign/depthsRooms";

// From the sluice upper landing, through the complete optional descent and its
// earned lift. All progress, powers and resources come from ordinary inputs.
export class DepthsRoute {
  constructor(private h: CampaignHarness) {}
  *play() {
    const h = this.h;
    yield* h.rewardRoute([[235], [85], "use", [565], "use", [725], "use"]);
    h.require(h.game.room.id === "depths-well", "Reservoir hatch failed");
    yield* h.walk(290);
    yield* h.drop(470, 450);
    yield* h.walk(600);
    yield* h.drop(850, 610);
    yield* h.walk(780);
    yield* h.drop(530, 780);
    yield* h.walk(515);
    yield* h.use();
    yield* h.walk(660);
    yield* h.drop(800, 950);
    yield* h.rewardRoute([[1155], "use", [175], "use", [335]]);
    h.game.input.press("echo");
    yield* h.tick();
    h.game.input.clear();
    for (let i = 0; i < 120; i++) yield* h.tick();
    h.game.input.press("echo");
    yield* h.tick();
    h.game.input.clear();
    yield* h.rewardRoute([
      [430],
      [540, 530],
      [600],
      [800, 420],
      [870],
      [1050, 420],
      [1075],
      "use",
      [1185],
      "use",
    ]);
    h.require(
      h.game.echoes.phase === "idle",
      "Descent echo leaked through exit",
    );
    yield* h.rewardRoute([
      [260],
      [370, 300],
      [430],
      [1030, 420, 40],
      [1075],
      "use",
      [1175],
      "use",
    ]);
    yield* h.rewardRoute([[175], "use", [305], "use"]);
    yield* this.west();
    yield* this.east();
    yield* this.resolve();
    yield* h.rewardRoute([
      [1495],
      "use",
      [495],
      "use",
      [260],
      [370, 530],
      [420],
      [650, 420],
      [850],
    ]);
    h.require(h.game.collected.has(DEPTHS_HEART), "Spring heart missed");
    yield* h.walk(1100);
    yield* h.until(() => h.game.player.grounded && h.game.player.y > 580, 300);
    yield* h.rewardRoute([[1135], "use"]);
    h.require(
      h.game.room.id === "baths-main",
      "Spring lift did not reach rotunda",
    );
    yield* h.use();
    h.require(
      h.game.room.id === "depths-spring",
      "Spring lift was not reciprocal",
    );
    yield* h.use();
    h.require(h.game.room.id === "baths-main", "Lift return failed");
    yield* h.rewardRoute([
      [455],
      [550, 530],
      [650],
      [835, 420],
      [885],
      "use",
      [440],
      [540, 530],
      [630],
      [840, 420],
    ]);
  }
  *west() {
    const h = this.h;
    yield* h.rewardRoute([[250], [350, 620]]);
    h.game.input.clear();
    h.action = "Wait below the pressure curtain for its easing interval";
    yield* h.until(
      () => !h.game.depths.jet?.warning && !h.game.depths.jet?.live,
      800,
    );
    yield* h.rewardRoute([[420], [550, 500], [585], "use"]);
    h.require(h.game.journey.depths.seals >= 1, "West relief failed");
  }
  *east() {
    const h = this.h;
    yield* h.walk(730);
    yield* h.until(() => h.game.player.grounded && h.game.player.y > 680, 300);
    yield* h.walk(950);
    yield* h.jump(1070, 620);
    yield* h.walk(1110);
    yield* h.jump(1260, 500);
    yield* h.walk(1325);
    yield* h.use();
    h.require(h.game.journey.depths.seals === 2, "East relief failed");
  }
  *resolve() {
    const h = this.h;
    yield* h.walk(1470);
    yield* h.until(() => h.game.player.grounded && h.game.player.y > 680, 300);
    yield* h.rewardRoute([[785], "use"]);
    h.require(h.game.journey.depths.resolved, "Keeper did not rest");
  }
}
