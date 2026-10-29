import type { CampaignHarness } from "./CampaignHarness";

// Starts at the Tower elevator exit. No grants, warps, or direct puzzle writes.
export class FinaleRoute {
  constructor(private h: CampaignHarness) {}
  *play() {
    const h = this.h;
    yield* h.rewardRoute([[175], "use", [305], "use"]);
    if (!h.game.journey.consequences.liftRepaired) {
      yield* h.rewardRoute([
        [280],
        [400, 530],
        [450],
        [650, 420],
        [725],
        [1040, 420, 22],
      ]);
    }
    yield* h.rewardRoute([[1085], "use"]);
    if (h.resilienceSeed !== null) {
      h.recover("reload");
      yield* this.bathsClimb();
    }
    yield* h.rewardRoute([[1185], "use", [175], "use", [315], "use"]);
    // The west mirror tells you which receiver it illuminates; no hidden code.
    if (!h.game.puzzles.state.values[0]) yield* h.use();
    yield* this.hallClimb();
    yield* h.rewardRoute([[1065], "use"]);
    if (h.resilienceSeed !== null) {
      h.recover("respawn");
      h.recover("reload");
      yield* this.hallClimb();
    }
    yield* h.rewardRoute([
      [1185],
      "use",
      [175],
      "use",
      [585],
      "use",
      [270],
      [380, 530],
      [440],
      [630, 410],
    ]);
    if (h.game.journey.rival.outcome === "released") yield* h.walk(1100);
    else {
      yield* h.walk(705);
      h.game.input.clear();
      h.game.input.press("right");
      h.game.input.press("jump");
      h.action = "Catch the high prison chain";
      for (let i = 0; i < 300 && h.game.player.grip !== "high-chain-bar"; i++) {
        h.aim(865);
        yield* h.tick();
      }
      h.require(h.game.player.grip === "high-chain-bar", "Missed high chain");
      h.game.input.clear();
      yield* h.jump(1100, 410);
    }
    yield* h.rewardRoute([[1185], "use"]);
    h.require(
      h.game.room.id === "hourglass",
      "Service crown did not reach Hourglass",
    );
  }
  *bathsClimb() {
    const h = this.h;
    yield* h.rewardRoute([[305], "use"]);
    if (!h.game.journey.consequences.liftRepaired)
      yield* h.rewardRoute([
        [280],
        [400, 530],
        [450],
        [650, 420],
        [725],
        [1040, 420, 22],
      ]);
  }
  *hallClimb() {
    yield* this.h.rewardRoute([
      [310],
      [430, 530],
      [490],
      [680, 420],
      [750],
      [1020, 420],
    ]);
  }
}
