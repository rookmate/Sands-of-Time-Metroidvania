import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { TRAVERSAL_HEART, scarabOnPlate } from "../src/campaign/enemyTraversal";
import { EnemyTraversalRoute } from "../src/harness/EnemyTraversalRoute";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { parseCampaign } from "../src/campaign/state";
import { campaignMap } from "../src/ui/campaignMap";
import { Sound } from "../src/game/audio";
import type { Action } from "../src/game/input";

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
function input(g: CampaignGame, ...actions: Action[]) {
  g.input.clear();
  actions.forEach((a) => g.input.press(a));
  g.update(1 / 120);
  g.input.clear();
}
function run(route: Generator<void>) {
  for (const _ of route) {
    /* normal input route */
  }
}

it.each(["gardens-first", "sky-first"] as const)(
  "plays the optional mortal pens in %s order and independently replays the full campaign",
  (regionOrder) => {
    const h = new CampaignHarness({
      immortal: false,
      exploreEnemyTraversal: true,
      regionOrder,
      ...(regionOrder === "sky-first"
        ? {
            resilienceSeed: 42,
            exploreEraWing: true,
            exploreEchoes: true,
            investigateHistory: true,
          }
        : {}),
    });
    expect(h.step(240000).status, h.error ?? "").toBe("passed");
    expect(h.game.journey.traversal).toEqual({ broken: true, latched: true });
    expect(h.game.collected.has(TRAVERSAL_HEART)).toBe(true);
    const replay = new CampaignGame({ persist: false });
    replay.begin();
    const result = CampaignTrace.replay(replay, h.trace.events);
    expect(result.journey).toEqual(h.game.journey);
    expect(result.player).toEqual(h.game.player);
  },
);

function pens() {
  return reach(
    new CampaignHarness({ immortal: false, exploreEnemyTraversal: true }),
    (g) => g.room.id === "ram-run",
  );
}
function crossing() {
  return reach(
    new CampaignHarness({ immortal: false, exploreEnemyTraversal: true }),
    (g) => g.room.id === "scarab-crossing",
  );
}
function strike(h: CampaignHarness) {
  h.game.input.release("attack");
  h.game.input.press("attack");
  for (let i = 0; i < 50; i++) run(h.tick());
}
it("requires a committed ram impact, preserves the breach through death/reload, and leaves combat intact", () => {
  const h = pens(),
    g = h.game;
  run(h.rewardRoute([[175], "use", [285], "use"]));
  expect(g.companion).toBeNull();
  expect(g.journey.farah).toBe("following");
  // Sword attacks at the masonry do not open it. A charge must hit it.
  run(h.walk(360));
  run(h.jump(790, 650));
  input(g, "freeze");
  run(h.walk(835));
  for (let i = 0; i < 4; i++) strike(h);
  expect(g.journey.traversal.broken).toBe(false);
  // Let that early freeze expire before baiting the ram.
  g.input.clear();
  run(h.until(() => g.freezeTime === 0));
  run(h.until(() => !!g.enemies[0].charge));
  run(h.until(() => g.enemies[0].telegraph < 0.25));
  g.input.press("jump");
  run(h.until(() => g.journey.traversal.broken));
  g.input.clear();
  run(h.until(() => g.player.grounded));
  expect(g.platforms.some((p) => p.x === 900 && p.h === 650)).toBe(false);
  expect(campaignMap(g)).toContain("Ram wall broken");
  const checkpoint = g.checkpoint;
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  g.respawn();
  expect(g.checkpoint).toEqual(checkpoint);
  h.game = reloadCampaign(g);
  expect(h.game.journey.traversal.broken).toBe(true);
  run(h.rewardRoute([[285], "use"]));
  expect(h.game.journey.traversal.broken).toBe(true);
  expect(h.game.platforms.some((p) => p.x === 900 && p.h === 650)).toBe(false);
});

it("keeps hollow creatures killable and recall/reentry cannot farm sand or erase earned openings", () => {
  const h = crossing();
  let g = h.game;
  run(h.rewardRoute([[175], "use", [300], [410, 530], [450], [570, 420]]));
  input(g, "freeze");
  // Face the creature and use ordinary sword input, including frozen bonus damage.
  run(h.walk(g.enemies[0].x - 55));
  input(g, "right");
  for (let i = 0; i < 8 && !g.enemies[0].dead; i++) strike(h);
  expect(g.enemies[0].dead).toBe(true);
  expect(g.journey.defeated).toContain("scarab-crossing:0");
  const sand = g.player.sand;
  expect(sand).toBe(4);
  expect(scarabOnPlate(g)).toBe(false);
  run(h.drop(570, 650));
  run(h.rewardRoute([[285], "use"]));
  expect(g.enemies[0].dead).toBe(false);
  expect(g.player.sand).toBe(sand);
  run(h.rewardRoute([[55], "use", [1175], "use"]));
  expect(g.room.id).toBe("scarab-crossing");
  expect(g.player.sand).toBe(sand);
  // Reset restores a creature that has fallen off its platform, too.
  g.enemies[0].x = 950;
  g.enemies[0].y = 598;
  run(h.rewardRoute([[285], "use", [175], "use"]));
  expect(g.enemies[0].y + g.enemies[0].h).toBe(420);
  g = reloadCampaign(g);
  h.game = g;
  expect(
    g.journey.defeated.filter((id) => id === "scarab-crossing:0"),
  ).toHaveLength(1);
  run(new EnemyTraversalRoute(h).cross());
  const before = g.player.maxHealth;
  run(h.walk(1520));
  expect(g.collected.has(TRAVERSAL_HEART)).toBe(true);
  expect(g.player.maxHealth).toBe(before + 1);
  g.player.invincible = 0;
  g.damage(100);
  g.respawn();
  h.game = reloadCampaign(g);
  g = h.game;
  expect(g.journey.traversal).toEqual({ broken: true, latched: true });
  run(h.rewardRoute([[285], "use"]));
  expect(g.player.maxHealth).toBe(before + 1);
  expect(g.platforms.filter((p) => p.y === 420)).toHaveLength(4);
  run(new EnemyTraversalRoute(h).cross());
  run(h.walk(1520));
  expect(g.player.maxHealth).toBe(before + 1);
});

it("recovers a missed crossing and an empty dagger using the safe floor, fountain and recall", () => {
  const h = crossing(),
    g = h.game;
  run(h.rewardRoute([[175], "use", [300], [410, 530], [450], [565, 420]]));
  g.input.clear();
  run(h.until(() => scarabOnPlate(g)));
  input(g, "freeze");
  run(h.rewardRoute([[680], [860, 420]]));
  // A failed attempt lets the creature move again and retract the stones.
  g.input.clear();
  run(h.until(() => g.freezeTime === 0 && !scarabOnPlate(g)));
  run(h.until(() => g.player.grounded && g.player.y + g.player.h === 650));
  g.player.sand = 0;
  run(h.rewardRoute([[285], "use", [175], "use"]));
  expect(g.player.sand).toBe(g.player.maxSand);
  run(new EnemyTraversalRoute(h).cross());
  expect(g.journey.traversal.latched).toBe(true);
  expect(g.journey.completed).toHaveLength(11);
  expect(g.journey.rewards.attunement).toBeNull();
});

it("migrates v8 saves without losing predecessor state and validates bounded traversal state", () => {
  const h = reach(
    new CampaignHarness({
      immortal: false,
      exploreEraWing: true,
      investigateHistory: true,
    }),
    (g) => g.collected.has("witness-room-heart"),
  );
  const old = JSON.parse(JSON.stringify(h.game.saved));
  old.journey.version = 8;
  delete old.journey.traversal;
  const migrated = parseCampaign(JSON.stringify(old))!;
  expect(migrated.journey.version).toBe(9);
  expect(migrated.journey.traversal).toEqual({ broken: false, latched: false });
  expect({ ...migrated.journey, version: 8, traversal: undefined }).toEqual({
    ...old.journey,
    traversal: undefined,
  });
  expect(migrated.collected).toEqual(old.collected);
  for (const traversal of [
    null,
    { broken: 1, latched: false },
    { broken: false, latched: true },
  ])
    expect(
      parseCampaign(
        JSON.stringify({
          ...migrated,
          journey: { ...migrated.journey, traversal },
        }),
      ),
    ).toBeNull();
  expect(CAMPAIGN_ROOMS["ram-run"].availableAfter).toBe(11);
});

it("can kill and recall the required ram before opening its barrier", () => {
  const h = pens(),
    g = h.game;
  run(h.rewardRoute([[175], "use", [285], "use", [360]]));
  input(g, "freeze");
  run(h.walk(g.enemies[0].x - 55));
  input(g, "right");
  for (let i = 0; i < 7 && !g.enemies[0].dead; i++) strike(h);
  expect(g.enemies[0].dead).toBe(true);
  expect(g.player.sand).toBe(4);
  expect(g.journey.traversal.broken).toBe(false);
  run(h.rewardRoute([[285], "use"]));
  expect(g.player.sand).toBe(4);
  run(new EnemyTraversalRoute(h).bait());
  expect(g.journey.traversal.broken).toBe(true);
});
