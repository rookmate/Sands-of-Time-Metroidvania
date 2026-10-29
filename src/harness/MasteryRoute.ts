import type { CampaignHarness } from "./CampaignHarness";

// Uses the same inputs as manual play, including release/repress for wall kicks.
export class MasteryRoute {
  constructor(private h: CampaignHarness) {}
  *wall() {
    const h = this.h,
      g = h.game;
    yield* h.walk(430);
    g.input.clear();
    g.input.press("right");
    g.input.press("jump");
    yield* h.until(() => g.player.wall === 1, 180);
    // Wall run gains height while Jump is held. Kick before the slide begins.
    for (let i = 0; i < 20; i++) yield* h.tick();
    g.input.release("jump");
    yield* h.tick();
    g.input.press("jump");
    g.input.release("right");
    g.input.press("left");
    yield* h.until(
      () => g.player.grounded && g.player.y + g.player.h < 400,
      300,
    );
    g.input.clear();
    yield* h.walk(275);
    yield* h.use();
  }
  *rope() {
    const h = this.h,
      g = h.game;
    yield* h.rewardRoute([[300], [390, 530]]);
    for (const id of ["practice-rope", "practice-bar"]) {
      const grip = g.grips.find((v) => v.id === id)!;
      g.input.clear();
      g.input.press("jump");
      for (let i = 0; i < 300 && g.player.grip !== id; i++) {
        h.aim(grip.x - 15);
        yield* h.tick();
      }
      h.require(g.player.grip === id, "Missed practice handhold " + id);
    }
    yield* h.jump(1075, 310);
    yield* h.walk(1075);
    yield* h.use();
  }
  *dash() {
    const h = this.h,
      g = h.game;
    yield* h.rewardRoute([[300], [390, 530], [610, 420], [630]]);
    g.input.clear();
    g.input.press("jump");
    for (let i = 0; i < 300 && g.player.grip !== "practice-long-rope"; i++) {
      h.aim(805);
      yield* h.tick();
    }
    h.require(g.player.grip === "practice-long-rope", "Missed dash rope");
    yield* h.jump(1330, 310, 42);
    yield* h.walk(1355);
    if (!g.journey.mastery.solved.includes("mastery-dash")) yield* h.use();
    yield* h.walk(1485);
  }
  *explore() {
    const h = this.h;
    yield* h.drop(645, 650);
    yield* h.walk(645);
    yield* h.use();
    yield* this.wall();
    yield* h.rewardRoute([[335], "use"]);
    yield* this.rope();
    yield* h.rewardRoute([[1175], "use"]);
    yield* this.dash();
    // The earned seals offer a short return without repeating solved jumps.
    yield* h.rewardRoute([
      [1355],
      "use",
      [55],
      "use",
      [1075],
      "use",
      [55],
      "use",
      [275],
      "use",
      [55],
      "use",
    ]);
    h.require(
      h.game.room.id === "garden-court",
      "Movement chamber return missed",
    );
  }
}
