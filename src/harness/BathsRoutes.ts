import { DepthsRoute } from "./DepthsRoute";
import { EraWingRoute } from "./EraWingRoute";
import { EchoRoute } from "./EchoRoute";
import type { CampaignHarness } from "./CampaignHarness";
import {
  cooperationApproach,
  cooperationClimb,
  cooperationFinish,
} from "./cooperationRoute";
import { cisternRoute, galleryRoute } from "./rewardsRoute";
import { VESSEL_ID } from "../campaign/rewards";
export class BathsRoutes {
  constructor(private h: CampaignHarness) {}
  *bathsApproach() {
    yield* this.h.walk(1305);
    yield* this.h.use(); // Baths narrative anchor. Exploration below changes no story.
    yield* this.h.walk(260);
    yield* this.h.jump(360, 530);
    yield* this.h.walk(420);
    yield* this.h.jump(650, 420);
    yield* this.h.walk(690);
    yield* this.h.jump(940, 310);
    yield* this.h.walk(1155);
    yield* this.h.use();
    yield* this.h.walk(255);
    yield* this.h.use(); // Intake on reservoir balcony.
    yield* this.h.walk(290);
    yield* this.h.drop(430, 430);
    yield* this.h.walk(500);
    yield* this.h.drop(720, 530);
    yield* this.h.walk(840);
    yield* this.h.walk(1145);
    yield* this.h.use();
    this.h.require(
      this.h.game.room.id === "bathworks",
      "Did not follow reservoir pipe",
    );
  }
  *bathsSluice() {
    yield* this.h.walk(235);
    yield* this.h.use(); // Fountain checkpoint before changing regional state.
    yield* this.h.walk(525);
    yield* this.h.use();
    this.h.require(
      this.h.game.journey.baths.drained,
      "Sluice did not drain Baths",
    );
    if (this.h.resilienceSeed !== null) {
      this.h.recover("respawn");
      this.h.require(
        this.h.game.journey.baths.drained,
        "Retry lost regional drainage",
      );
      this.h.recover("reload");
      this.h.require(
        this.h.game.journey.baths.drained,
        "Reload lost regional drainage",
      );
      this.h.disruptions.push({ room: "bathworks", kind: "sluice" });
    }
    if (this.h.cooperate) {
      yield* this.h.rewardRoute(cooperationApproach);
      if (this.h.resilienceSeed !== null) {
        this.h.recover("respawn");
        this.h.recover("reload");
        this.h.require(
          this.h.game.journey.cooperation.phase === "primed",
          "Lost Farah's raised step",
        );
      }
      yield* this.h.rewardRoute(cooperationClimb);
      if (this.h.resilienceSeed !== null) {
        this.h.game.input.clear();
        for (let i = 0; i < 1000; i++) yield* this.h.tick();
        yield* this.h.jump(860, 650); // Expired span: miss onto the safe floor.
        yield* this.h.rewardRoute(cooperationClimb);
        this.h.disruptions.push({
          room: "spillway",
          kind: "cooperation-recovery",
        });
      }
      yield* this.h.rewardRoute(cooperationFinish);
      this.h.require(
        this.h.game.journey.cooperation.phase === "reunited",
        "Farah did not reunite",
      );
    }
    // Use the permanent drained stair, then climb through the changed pool.
    yield* this.h.walk(855);
    yield* this.h.use();
    this.h.require(
      this.h.game.room.id === "baths-main",
      "Drained stair failed",
    );
    yield* this.h.walk(820);
    yield* this.h.drop(810, 540);
    yield* this.h.jump(550, 530);
    yield* this.h.walk(650);
    yield* this.h.jump(835, 420);
    yield* this.h.walk(885);
    yield* this.h.use();
    // From the stair landing the wheel remains below; upper pools are above.
    yield* this.h.walk(440);
    yield* this.h.jump(540, 530);
    yield* this.h.walk(630);
    yield* this.h.jump(840, 420);
  }
  *bathsReturn() {
    // Upper Baths reward is awarded at its story exit, before this optional return.
    yield* this.h.walk(35);
    yield* this.h.use();
    yield* this.h.walk(1435);
    yield* this.h.use();
    this.h.require(
      this.h.game.room.id === "maintenance",
      "Sword/Dash return gate failed",
    );
    yield* this.h.walk(260);
    yield* this.h.jump(370, 520);
    yield* this.h.jump(920, 650, 40);
    if (this.h.optionalRewards)
      yield* this.h.rewardRoute(galleryRoute(this.h.optionalRewards));
    if (this.h.exploreEchoes) yield* new EchoRoute(this.h).play();
    if (this.h.exploreEraWing) yield* new EraWingRoute(this.h).play();
    yield* this.h.walk(1015);
    yield* this.h.use();
    yield* this.h.walk(1145);
    yield* this.h.use();
    this.h.require(
      this.h.game.room.id === "baths-main",
      "Maintenance shortcut failed",
    );
    // The unlocked grate works from the previously visited rotunda too.
    yield* this.h.walk(585);
    yield* this.h.use();
    this.h.require(
      this.h.game.room.id === "maintenance",
      "Shortcut was not permanent",
    );
    yield* this.h.walk(1145);
    yield* this.h.use();
    yield* this.h.walk(455);
    yield* this.h.jump(550, 530);
    yield* this.h.walk(650);
    yield* this.h.jump(835, 420);
    yield* this.h.walk(885);
    yield* this.h.use();
    yield* this.h.walk(440);
    yield* this.h.jump(540, 530);
    yield* this.h.walk(630);
    yield* this.h.jump(840, 420);
    if (this.h.optionalRewards) {
      yield* this.h.rewardRoute(cisternRoute);
      this.h.require(
        this.h.game.collected.has(VESSEL_ID),
        "Missed cistern vessel",
      );
    }
    if (this.h.exploreDepths) yield* new DepthsRoute(this.h).play();
    yield* this.h.walk(1125);
    yield* this.h.use();
    yield* this.h.walk(310);
    yield* this.h.jump(435, 520);
    yield* this.h.walk(485);
    yield* this.h.jump(700, 400);
    yield* this.h.walk(745);
    yield* this.h.jump(1050, 300);
    yield* this.h.walk(2085);
    yield* this.h.use();
    this.h.require(
      this.h.game.room.id === "daybreak",
      "Return changed story route",
    );
  }
}
