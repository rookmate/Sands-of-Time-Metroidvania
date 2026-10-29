import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
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
it("plays all movement chambers during a mortal campaign", () => {
  const h = new CampaignHarness({ immortal: false, exploreMastery: true });
  expect(h.step(240000).status, h.error ?? "").toBe("passed");
  expect(h.game.journey.mastery.solved).toHaveLength(3);
  expect(h.game.collected.has("mastery-dash-heart")).toBe(true);
});

import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { MasteryRoute } from "../src/harness/MasteryRoute";
import { MASTERY_IDS, MASTERY_HEART } from "../src/campaign/mastery";
import { parseCampaign } from "../src/campaign/state";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { campaignMap } from "../src/ui/campaignMap";
import type { Action } from "../src/game/input";
function run(route: Generator<void>) {
  for (const _ of route) {
    /* normal fixed-step inputs */
  }
}
function reach(id: string) {
  const h = new CampaignHarness({ immortal: false, exploreMastery: true });
  for (
    let i = 0;
    i < 100000 && h.game.room.id !== id && h.status !== "failed";
    i++
  )
    h.step();
  expect(h.error).toBeNull();
  expect(h.game.room.id).toBe(id);
  return h;
}
function frames(h: CampaignHarness, actions: Action[], count = 1) {
  h.game.input.clear();
  actions.forEach((a) => h.game.input.press(a));
  for (let i = 0; i < count; i++) run(h.tick());
  h.game.input.clear();
}
it("integrates seeded sky-first exploration, earlier optional systems, and exact-input replay", () => {
  const h = new CampaignHarness({
    immortal: false,
    resilienceSeed: 42,
    regionOrder: "sky-first",
    exploreMastery: true,
    exploreEchoes: true,
    exploreEraWing: true,
    investigateHistory: true,
    exploreEnemyTraversal: true,
    rivalOutcome: "released",
  });
  // Existing assist and reduced-shake options need no new input or movement rules.

  h.game.options.shake = false;
  expect(h.step(240000).status, h.error ?? "").toBe("passed");
  const replay = new CampaignGame({ persist: false });

  replay.begin();
  const result = CampaignTrace.replay(replay, h.trace.events);
  expect(result.journey).toEqual(h.game.journey);
  expect(result.player).toEqual(h.game.player);
  expect(h.game.journey.mastery.solved).toEqual(MASTERY_IDS);
});
it.each(MASTERY_IDS)(
  "keeps %s unfinished across exit, death/Retry and checkpoint reload",
  (id) => {
    const h = reach(id),
      g = h.game;
    const checkpoint = structuredClone(g.checkpoint),
      earned = structuredClone(g.journey.mastery);
    const farah = g.journey.farah;
    run(h.rewardRoute([[55], "use"]));
    expect(g.room.id).not.toBe(id);
    expect(g.journey.mastery).toEqual(earned);
    const door = CAMPAIGN_ROOMS[g.room.id].doors.find((d) => d.to === id)!;
    run(h.rewardRoute([[door.x - 15], "use"]));
    expect(g.room.id).toBe(id);
    expect(g.companion).toBeNull();
    frames(h, ["freeze"]);
    g.save(false);
    expect(g.checkpoint).toEqual(checkpoint);
    const loaded = reloadCampaign(g);
    expect(loaded.room.id).toBe(checkpoint.room);
    expect(loaded.journey.mastery).toEqual(earned);
    g.player.invincible = 0;
    g.damage(100);
    expect(g.screen).toBe("death");
    g.respawn();
    expect(g.room.id).toBe(checkpoint.room);
    expect(g.journey.mastery).toEqual(earned);
    expect(g.journey.farah).toBe(farah);
  },
);
it("retries with empty sand immediately and returns borrowed sand on exit", () => {
  const h = reach("mastery-wall"),
    g = h.game;
  run(h.rewardRoute([[55], "use"]));
  frames(h, ["freeze"]);
  const sand = g.player.sand;
  run(h.rewardRoute([[645], "use"]));
  expect(g.player.sand).toBe(g.player.maxSand);
  const checkpoint = structuredClone(g.checkpoint);
  for (let i = 0; i < 3; i++) frames(h, ["freeze"]);
  expect(g.player.sand).toBe(0);
  run(h.rewardRoute([[295], "use"]));
  expect(g.player.sand).toBe(g.player.maxSand);
  expect(g.history).toHaveLength(0);
  expect(g.checkpoint).toEqual(checkpoint);
  run(h.rewardRoute([[55], "use"]));
  expect(g.player.sand).toBe(sand);
});
it("rewinds a dropped handhold, catches an unrecovered miss and resumes the intended route", () => {
  const h = reach("mastery-rope"),
    g = h.game;
  const health = g.player.health,
    checkpoint = structuredClone(g.checkpoint);
  run(h.rewardRoute([[300], [390, 530]]));
  g.input.clear();
  g.input.press("jump");
  run(
    h.until(() => {
      h.aim(525);
      return g.player.grip === "practice-rope";
    }, 300),
  );
  frames(h, [], 30);
  frames(h, ["down"], 35);
  expect(g.player.grip).toBeNull();
  frames(h, ["rewind"], 25);
  expect(g.player.grip).toBe("practice-rope");
  frames(h, ["down"], 180);
  expect(g.player.x).toBe(300);
  expect(g.player.y + g.player.h).toBe(650);
  expect(g.player.health).toBe(health);
  expect(g.checkpoint).toEqual(checkpoint);
  expect(g.player.grip).toBeNull();
  for (let i = 0; i < 3; i++) frames(h, ["freeze"]);
  expect(g.player.sand).toBe(0);
  frames(h, ["right"], 180);
  expect(g.player.x).toBe(300);
  expect(g.player.sand).toBe(g.player.maxSand);
  run(new MasteryRoute(h).rope());
  expect(g.journey.mastery.solved).toEqual(MASTERY_IDS.slice(0, 2));
});
it("saves each seal and the life memory once, including repeat routes and reload", () => {
  const h = reach("mastery-dash"),
    g = h.game;
  const checkpoint = structuredClone(g.checkpoint),
    before = g.player.maxHealth;
  run(new MasteryRoute(h).dash());
  expect(g.journey.mastery.solved).toEqual(MASTERY_IDS);
  expect(g.collected.has(MASTERY_HEART)).toBe(true);
  expect(g.player.maxHealth).toBe(Math.min(12, before + 1));
  expect(g.checkpoint).toEqual(checkpoint);
  const loaded = reloadCampaign(g);
  expect(loaded.journey.mastery.solved).toEqual(MASTERY_IDS);
  expect(loaded.collected.has(MASTERY_HEART)).toBe(true);
  run(h.rewardRoute([[1355], "use"]));
  run(new MasteryRoute(h).dash());
  expect(g.journey.mastery.solved).toEqual(MASTERY_IDS);
  expect(g.player.maxHealth).toBe(loaded.player.maxHealth);
});
it("migrates v10 saves without altering earlier state and validates ordered seals", () => {
  const h = reach("mastery-wall");
  h.game.save(false);
  const old = JSON.parse(JSON.stringify(h.game.saved));
  old.journey.version = 10;
  delete old.journey.mastery;
  const migrated = parseCampaign(JSON.stringify(old))!;
  expect(migrated.journey).toEqual({
    ...old.journey,
    version: 12,
    mastery: { solved: [] },
  });
  expect(migrated.checkpoint).toEqual(old.checkpoint);
  expect(migrated.collected).toEqual(old.collected);
  for (const solved of [
    ["mastery-dash"],
    ["mastery-wall", "mastery-wall"],
    ["bogus"],
  ]) {
    const bad = structuredClone(migrated);
    bad.journey.mastery.solved = solved;
    expect(parseCampaign(JSON.stringify(bad))).toBeNull();
  }
  const g = h.game;
  expect(g.doorBlock(CAMPAIGN_ROOMS["mastery-wall"].doors[1])).toContain(
    "seal",
  );
  expect(campaignMap(g)).toContain("0/3 seals secured");
});
it("lets an assisted player drop a missed ledge and retry the combined crossing", () => {
  const h = reach("mastery-dash"),
    g = h.game;
  g.options.assist = true;
  g.options.shake = false;
  run(h.rewardRoute([[300], [390, 530]]));
  frames(h, ["jump", "right"], 10);
  g.input.press("right");
  run(h.until(() => !!g.player.ledge, 240));
  expect(g.player.ledge).not.toBeNull();
  frames(h, ["down"], 200);
  expect(g.player.ledge).toBeNull();
  expect(g.player.x).toBe(300);
  run(new MasteryRoute(h).dash());
  expect(g.journey.mastery.solved).toEqual(MASTERY_IDS);
});
