import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { Sound } from "../src/game/audio";
beforeEach(() => {
  vi.spyOn(Sound.prototype, "start").mockImplementation(() => {});
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  setMaxListeners(0, window, document);
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it.each(["gardens-first", "sky-first"] as const)(
  "plays Sahir's mortal route, %s, and replays the full campaign",
  (regionOrder) => {
    const h = new CampaignHarness({
      immortal: false,
      rivalOutcome: regionOrder === "gardens-first" ? "released" : "defeated",
      regionOrder,
      ...(regionOrder === "sky-first"
        ? {
            resilienceSeed: 42,
            exploreEchoes: true,
            exploreEraWing: true,
            investigateHistory: true,
            exploreEnemyTraversal: true,
          }
        : {}),
    });
    expect(h.step(240000).status, h.error ?? "").toBe("passed");
    expect(h.game.journey.rival).toEqual({
      bouts: 2,
      named: true,
      oath: true,
      outcome: h.rivalOutcome,
    });
    const replay = new CampaignGame({ persist: false });
    replay.begin();
    const result = CampaignTrace.replay(replay, h.trace.events);
    expect(result.journey).toEqual(h.game.journey);
    expect(result.player).toEqual(h.game.player);
  },
);

import { RivalRoute } from "../src/harness/RivalRoute";
import { RIVAL_IDS, freshRival } from "../src/campaign/rival";
import { parseCampaign } from "../src/campaign/state";
import { campaignMap } from "../src/ui/campaignMap";
import type { Action } from "../src/game/input";
function reach(h: CampaignHarness, condition: (g: CampaignGame) => boolean) {
  for (
    let i = 0;
    i < 180000 && !condition(h.game) && h.status !== "failed";
    i++
  )
    h.step();
  expect(h.error).toBeNull();
  expect(condition(h.game)).toBe(true);
  return h;
}
function run(route: Generator<void>) {
  for (const _ of route) {
    /* recorded inputs */
  }
}
function input(g: CampaignGame, ...actions: Action[]) {
  g.input.clear();
  actions.forEach((a) => g.input.press(a));
  g.update(1 / 120);
  g.input.clear();
}
function atSite(id: string) {
  return reach(
    new CampaignHarness({ immortal: false, rivalOutcome: "defeated" }),
    (g) => g.room.id === id,
  );
}
it.each(RIVAL_IDS)(
  "resets interrupted %s duels across exit, actual death/Retry and reload; commits each result once",
  (id) => {
    const h = atSite(id);
    let g = h.game;
    const before = structuredClone(g.journey.rival);
    run(h.rewardRoute([[175], "use", [445], "use"]));
    const accept = g.interaction!.action;
    accept();
    accept();
    expect(g.enemies.filter((e) => !e.dead)).toHaveLength(1);
    expect(g.companion).toBeNull();
    const farah = g.journey.farah;
    // A damaged, frozen opponent is transient, even when a checkpoint is written mid-duel.
    input(g, "freeze");
    if (id !== "crest-court")
      run(
        h.rewardRoute([
          [480, 590],
          [660, 530],
          ...(id === "crest-rest"
            ? ([[700], [880, 530]] as [number, number?][])
            : ([[820]] as [number][])),
        ]),
      );
    else run(h.walk(770));
    input(g, "attack");
    expect(g.enemies[0].health).toBeLessThan(g.enemies[0].maxHealth);
    g.save(false);
    h.game = reloadCampaign(g);
    g = h.game;
    expect(g.room.id).toBe(id);
    expect(g.enemies).toHaveLength(0);
    expect(g.journey.rival).toEqual(before);
    run(h.rewardRoute([[445], "use"]));
    expect(g.enemies[0].health).toBe(g.enemies[0].maxHealth);
    g.player.invincible = 0;
    g.damage(100);
    expect(g.screen).toBe("death");
    g.respawn();
    expect(g.enemies).toHaveLength(0);
    expect(g.journey.rival).toEqual(before);
    run(h.rewardRoute([[445], "use", [55], "use"]));
    expect(g.enemies.some((e) => e.kind === "rival")).toBe(false);
    expect(g.journey.farah).toBe(farah);
    expect(!!g.companion).toBe(farah === "following" || farah === "restored");
    // Re-enter through the real reciprocal doorway, then win with ordinary inputs.
    input(g, "interact");
    expect(g.room.id).toBe(id);
    run(h.rewardRoute([[175], "use", [445], "use"]));
    const sand = g.player.sand;
    run(new RivalRoute(h).duel());
    const result = structuredClone(g.journey.rival);
    expect(result.bouts).toBe(id === "crest-court" ? 1 : 2);
    expect(result.outcome).toBe(id === "crest-rest" ? "defeated" : null);
    expect(g.player.sand).toBeLessThanOrEqual(sand - 2); // no kill sand, including frozen kill
    expect(g.journey.defeated.some((x) => x.startsWith(id + ":"))).toBe(false);
    accept(); // old callback cannot duplicate an earned duel
    expect(g.enemies.filter((e) => !e.dead)).toHaveLength(0);
    g.player.invincible = 0;
    g.damage(100);
    g.respawn();
    h.game = reloadCampaign(g);
    g = h.game;
    expect(g.journey.rival).toEqual(result);
    run(h.rewardRoute([[445], "use"]));
    expect(g.enemies).toHaveLength(0);
    expect(g.journey.rival).toEqual(result);
  },
);
it("keeps out-of-order gallery presence harmless and clues rereadable before any duel", () => {
  const h = reach(
    new CampaignHarness({
      immortal: false,
      regionOrder: "sky-first",
      rivalOutcome: "released",
    }),
    (g) => g.room.id === "archive-stair",
  );
  run(h.rewardRoute([[885], "use", [295], "use"]));
  const g = h.game;
  const roll = { ...g.story };
  expect(g.journey.rival).toEqual({
    bouts: 0,
    named: true,
    oath: true,
    outcome: null,
  });
  run(h.rewardRoute([[445], "use"]));
  expect(g.enemies).toHaveLength(0);
  expect(g.toast).toContain("Cypress court");
  run(h.rewardRoute([[295], "use"]));
  expect(g.story).toMatchObject(roll);
  expect(g.journey.completed).toHaveLength(28);
  h.game = reloadCampaign(g);
  expect(h.game.journey.rival).toEqual(g.journey.rival);
});
it("requires the roll for release, allows abandoning a final fight, and never reverses or repeats a resolution", () => {
  const h = atSite("crest-rest");
  let g = h.game;
  // Earlier gallery clues normally teach this; an unread roll still allows a rematch.
  g.journey.rival.oath = false;
  run(h.rewardRoute([[175], "use", [585], "use"]));
  expect(g.journey.rival.outcome).toBeNull();
  expect(g.toast).toContain("muster roll");
  run(h.rewardRoute([[445], "use", [585], "use"]));
  expect(g.journey.rival.outcome).toBeNull();
  run(h.rewardRoute([[55], "use"]));
  input(g, "interact");
  run(h.rewardRoute([[295], "use", [585], "use"]));
  const release = g.interaction!.action;
  expect(g.journey.rival.outcome).toBe("released");
  const health = g.player.maxHealth,
    collected = [...g.collected],
    sand = g.player.sand;
  release();
  release();
  if (g.screen === "story") g.closeStory();
  run(h.rewardRoute([[445], "use"]));
  expect(g.enemies).toHaveLength(0);
  expect(g.player.maxHealth).toBe(health);
  expect([...g.collected]).toEqual(collected);
  expect(g.player.sand).toBe(sand);
  expect(campaignMap(g)).toContain("released");
  g.player.invincible = 0;
  g.damage(100);
  g.respawn();
  h.game = reloadCampaign(g);
  g = h.game;
  expect(g.journey.rival.outcome).toBe("released");
  run(h.rewardRoute([[445], "use", [295], "use"]));
  expect(g.enemies).toHaveLength(0);
  expect(g.journey.rival.outcome).toBe("released");
});
it("migrates v9 checkpoints without disturbing predecessor progress and rejects impossible rival state", () => {
  const h = atSite("crest-rest");
  h.game.save(false);
  const old = JSON.parse(JSON.stringify(h.game.saved));
  old.journey.version = 9;
  delete old.journey.rival;
  const migrated = parseCampaign(JSON.stringify(old));
  expect(migrated?.journey).toEqual({
    ...old.journey,
    version: 14,
    rival: freshRival(),
  });
  expect(migrated?.collected).toEqual(old.collected);
  expect(migrated?.checkpoint).toEqual(old.checkpoint);
  for (const rival of [
    { ...freshRival(), bouts: 3 },
    { ...freshRival(), outcome: "released" },
    { ...freshRival(), bouts: 2, outcome: "released" },
    { ...freshRival(), oath: true },
  ]) {
    const invalid = structuredClone(migrated!);
    invalid.journey.rival = rival as typeof invalid.journey.rival;
    expect(parseCampaign(JSON.stringify(invalid))).toBeNull();
  }
});
it("finishes the mortal campaign while skipping every rival doorway", () => {
  const h = new CampaignHarness({ immortal: false, regionOrder: "sky-first" });
  expect(h.step(240000).status, h.error ?? "").toBe("passed");
  expect(h.game.journey.rival).toEqual(freshRival());
  expect(RIVAL_IDS.some((id) => h.game.visited.has(id))).toBe(false);
  expect(h.game.journey.completed).toHaveLength(40);
});
it("lets ordinary jump inputs evade the committed thrust and punish its recovery without spending sand", () => {
  const h = atSite("crest-court"),
    g = h.game;
  run(h.rewardRoute([[175], "use", [445], "use", [710]]));
  g.input.clear();
  run(h.until(() => g.enemies[0].telegraph > 0));
  const e = g.enemies[0],
    facing = e.face,
    health = g.player.health,
    sand = g.player.sand;
  run(h.until(() => e.telegraph < 0.22));
  run(h.jump(880, 650));
  expect(e.face).toBe(facing);
  expect(g.player.health).toBe(health);
  expect(g.player.sand).toBe(sand);
  expect(e.rivalMove).toBeUndefined();
  expect(e.cooldown).toBeGreaterThan(0.3);
  run(h.walk(e.x + 55));
  input(g, "left", "attack");
  expect(e.health).toBeLessThan(e.maxHealth);
});
it("casts at gallery height with a full warning and safe shelter below; a missed muster jump can recover", () => {
  const h = atSite("crest-gallery"),
    g = h.game;
  run(h.rewardRoute([[175], "use", [445], "use"]));
  g.input.clear();
  run(h.until(() => g.enemies[0].telegraph > 0));
  const e = g.enemies[0],
    health = g.player.health;
  expect(e.rivalMove).toBe("cast");
  expect(e.telegraph).toBeGreaterThan(1);
  run(h.walk(700));
  run(h.until(() => g.projectiles.some((p) => p.x < 400)));
  expect(g.player.health).toBe(health);
  expect(g.player.y + g.player.h).toBe(650);
  const final = atSite("crest-rest");
  run(final.rewardRoute([[445], [480, 590], [660, 530]]));
  run(final.drop(780, 650));
  expect(final.game.player.health).toBeGreaterThan(0);
  run(final.jump(900, 530));
  expect(final.game.player.y + final.game.player.h).toBe(530);
});
