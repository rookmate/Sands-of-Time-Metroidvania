import { ConsequencesRoute } from "./ConsequencesRoute";
import { MasteryRoute } from "./MasteryRoute";
import { RivalRoute } from "./RivalRoute";
import type { CampaignHarness } from "./CampaignHarness";
import type { RewardStep } from "./rewardsRoute";

// Authored input routes. No actor placement, granted items or puzzle-state writes.
export class PalaceRoutes {
  constructor(private h: CampaignHarness) {}
  private *route(steps: RewardStep[]) {
    yield* this.h.rewardRoute(steps);
  }
  private recover(kind: string) {
    if (this.h.resilienceSeed === null) return;
    this.h.recover("respawn");
    this.h.recover("reload");
    this.h.disruptions.push({ room: this.h.game.room.id, kind });
  }
  private *climb(id: string, top: number) {
    const h = this.h;
    h.game.input.clear();
    h.game.input.press("jump");
    yield* h.until(
      () =>
        h.game.player.grip === id &&
        h.game.player.y <= top - h.game.player.h + 1,
      600,
    );
    h.game.input.press("right");
    yield* h.until(
      () => h.game.player.grip === null && h.game.player.grounded,
      240,
    );
    h.game.input.clear();
  }
  private *crownToLearning() {
    if (this.h.exploreConsequences)
      yield* new ConsequencesRoute(this.h).refuge();
    if (this.h.investigateHistory) yield* this.route([[485], "use"]);
    yield* this.route([
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
    this.h.require(
      this.h.game.room.id === "learning",
      "Canopy did not return to Learning",
    );
  }
  *gardens() {
    const h = this.h;
    yield* this.route([[85], "use", [1715], "use", [85], "use"]);
    if (h.rivalOutcome) yield* new RivalRoute(h).court();
    if (h.exploreMastery) yield* new MasteryRoute(h).explore();
    if (h.investigateHistory) yield* this.route([[195], "use"]);
    yield* this.route([[500], [1135], "use"]);
    h.require(
      h.game.room.id === "root-conduit",
      "Garden descent missed root conduit",
    );
    if (h.exploreConsequences) yield* new ConsequencesRoute(h).store();
    yield* this.route([
      [260],
      [370, 520],
      [920, 530, 40],
      [970],
      [960, 530],
      [1020],
      [1110, 420],
      [1085],
      "use",
    ]);
    h.require(
      h.game.journey.palace.irrigated,
      "Garden irrigation not restored",
    );
    if (h.resilienceSeed !== null) {
      yield* h.walk(960);
      yield* h.drop(1140, 650);
      yield* h.walk(1115);
      yield* h.use();
      this.recover("garden-recovery");
    }
    if (h.regionOrder === "sky-first") {
      // The changed irrigation opens a new exit rather than requiring the conduit twice.
      if (h.resilienceSeed !== null)
        yield* this.route([[960, 530], [1020], [1110, 420]]);
      yield* this.route([[1195], "use"]);
      yield* this.crownToLearning();
      return;
    }
    yield* this.route([
      [960],
      [960, 530],
      [900],
      [400, 520, 40],
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
    ]);
    yield* this.crownToLearning();
  }
  *sky() {
    const h = this.h;
    yield* this.route([[885], "use"]);
    if (h.investigateHistory) yield* this.route([[505], "use"]);
    yield* h.walk(235);
    yield* this.climb("archive-ladder", 310);
    if (h.resilienceSeed !== null) {
      yield* this.route([[85], "use", [185], "use"]);
      h.game.input.clear();
      for (let i = 0; i < 800; i++) yield* h.tick();
      yield* this.route([[260], [360, 530], [420], [650, 420], [690]]);
      h.game.input.clear();
      h.game.input.press("jump");
      h.game.input.press("right");
      for (let i = 0; i < 60; i++) yield* h.tick();
      h.game.input.clear();
      yield* h.until(() => h.game.player.grounded, 600);
      h.require(
        h.game.player.y + h.game.player.h === 650,
        "Closed shutter did not return to safe floor",
      );
      h.disruptions.push({ room: h.game.room.id, kind: "shutter-expiry" });
      yield* this.route([
        [185],
        "use",
        [260],
        [360, 530],
        [420],
        [650, 420],
        [690],
        [920, 310],
        [1035],
        "use",
      ]);
    } else {
      yield* this.route([
        [85],
        "use",
        [185],
        "use",
        [260],
        [360, 530],
        [420],
        [650, 420],
        [690],
        [920, 310],
        [1035],
        "use",
      ]);
    }
    h.require(h.game.journey.palace.sky, "Roof lens not pinned");
    if (h.resilienceSeed !== null) {
      yield* this.route([[945], "use"]);
      this.recover("lens-recovery");
    }
    yield* this.route([[1145], "use", [340]]);
    for (const grip of h.game.grips) {
      h.game.input.clear();
      h.game.input.press("jump");
      h.game.input.press("right");
      yield* h.until(() => h.game.player.grip === grip.id, 300);
    }
    yield* this.route([[1120, 650], [1145], "use"]);
    h.require(
      h.game.room.id === "cypress-crown",
      "Lens roof shortcut missed canopy",
    );
    yield* this.crownToLearning();
  }
  *prison() {
    const h = this.h;
    yield* this.route([[1185], "use"]);
    if (h.rivalOutcome) yield* new RivalRoute(h).muster(h.rivalOutcome);
    yield* this.route([[1145], "use", [485], "use", [235]]);
    if (h.resilienceSeed !== null) {
      yield* this.route([[185], "use"]);
      this.recover("counterweight-recovery");
      yield* h.walk(235);
    }
    yield* this.climb("chain-ladder", 420);
    yield* this.route([
      [395],
      [820, 420, 40],
      [1120, 420],
      [1145],
      "use",
      [585],
      "use",
    ]);
    h.require(h.game.journey.palace.prisonOpen, "Prison locks not released");
    if (h.resilienceSeed !== null) {
      yield* this.route([[335], "use"]);
      this.recover("prison-release-recovery");
    }
    if (h.exploreConsequences) yield* new ConsequencesRoute(h).lift();
    // Walk the real cross-region archive return in both directions.
    yield* this.route([
      [885],
      "use",
      [1135],
      "use",
      [1145],
      "use",
      [500],
      [850],
      [85],
      "use",
    ]);
    h.require(h.game.room.id === "prison", "Upper cell shortcut failed");
  }
}
