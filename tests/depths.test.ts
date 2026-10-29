import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { DepthsRoute } from "../src/harness/DepthsRoute";
import { DEPTHS_HEART, DEPTHS_IDS } from "../src/campaign/depthsRooms";
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
  "completes the full mortal descent and %s campaign with exact-input replay",
  (regionOrder) => {
    const h = new CampaignHarness({
      immortal: false,
      exploreDepths: true,
      regionOrder,
      ...(regionOrder === "sky-first"
        ? {
            resilienceSeed: 42,
            exploreEchoes: true,
            exploreEraWing: true,
            investigateHistory: true,
            exploreEnemyTraversal: true,
            rivalOutcome: "released" as const,
            exploreMastery: true,
            exploreConsequences: true,
          }
        : {}),
    });
    expect(h.step(240000).status, h.error ?? "").toBe("passed");
    expect(h.game.journey.completed).toHaveLength(40);
    expect(h.game.journey.depths).toEqual({
      diverted: true,
      seals: 2,
      resolved: true,
    });
    expect(DEPTHS_IDS.every((id) => h.game.visited.has(id))).toBe(true);
    expect(parseCampaign(JSON.stringify(h.game.saved))).not.toBeNull();
    const replay = new CampaignGame({ persist: false });
    replay.begin();
    const result = CampaignTrace.replay(replay, h.trace.events);
    expect(result.journey).toEqual(h.game.journey);
    expect(result.player).toEqual(h.game.player);
    expect([...result.collected]).toEqual([...h.game.collected]);
    expect(result.checkpoint).toEqual(h.game.checkpoint);
  },
);

it("foreshadows the hatch on the first reservoir visit, gates access on restoration and abilities, and leaves the main pipe open", () => {
  const h = reach(
    new CampaignHarness({ immortal: false }),
    (g) => g.room.id === "sluice-reservoir",
  );
  run(h.rewardRoute([[290]]));
  run(h.drop(430, 430));
  run(h.rewardRoute([[500]]));
  run(h.drop(720, 530));
  run(h.walk(565));
  run(h.drop(565, 650));
  const g = h.game,
    completed = [...g.journey.completed];
  input(g, "interact");
  expect(g.story?.title).toBe("A sound beneath the reservoir");
  expect(JSON.stringify(g.story)).toContain("stronger sword and Time Dash");
  g.closeStory();
  run(h.walk(725));
  input(g, "interact");
  expect(g.room.id).toBe("sluice-reservoir");
  expect(g.doorBlock(CAMPAIGN_ROOMS[g.room.id].doors.at(-1)!)).toContain(
    "Submerged cracked hatch",
  );
  expect(g.doorBlock(CAMPAIGN_ROOMS[g.room.id].doors[1])).toBeNull();
  expect(g.journey.completed).toEqual(completed);
  expect(g.journey.depths).toEqual({
    diverted: false,
    seals: 0,
    resolved: false,
  });
});

it("returns up the physical well ladder before solving anything and recovers an empty-sand missed race", () => {
  const h = reach(
    new CampaignHarness({ immortal: false, exploreDepths: true }),
    (g) => g.room.id === "depths-well",
  );
  const g = h.game,
    journey = [...g.journey.completed];
  run(h.drop(175, 950));
  g.input.clear();
  g.input.press("jump");
  run(
    h.until(
      () => g.player.grip === "sounding-ladder" && g.player.y <= 254,
      600,
    ),
  );
  g.input.press("left");
  run(h.tick());
  g.input.clear();
  run(h.rewardRoute([[65], "use"]));
  expect(g.room.id).toBe("sluice-reservoir");
  expect(g.journey.completed).toEqual(journey);
  // A fresh continuous route supplies the later traversal checkpoint.
  const race = reach(
    new CampaignHarness({ immortal: false, exploreDepths: true }),
    (g) => g.room.id === "depths-race",
  );
  race.game.player.sand = 0; // explicit depletion case, never a resource grant
  run(race.rewardRoute([[430]]));
  run(race.jump(650, 700));
  run(race.walk(175));
  race.game.input.clear();
  race.game.input.press("jump");
  run(
    race.until(
      () =>
        race.game.player.grip === "filter-ladder" && race.game.player.y <= 364,
      300,
    ),
  );
  race.game.input.press("left");
  run(race.tick());
  race.game.input.clear();
  run(race.rewardRoute([[65], "use", [175], "use"]));
  expect(race.game.room.id).toBe("depths-lock");
  expect(race.game.player.sand).toBe(race.game.player.maxSand);
  expect(race.game.journey.echoes.solved).toContain("depths-lock");
});

function firstRelief() {
  return reach(
    new CampaignHarness({ immortal: false, exploreDepths: true }),
    (g) => g.room.id === "depths-heart" && g.journey.depths.seals === 1,
  );
}
it("persists each guardian phase through real death, Retry, Continue and revisit without duplicating rewards", () => {
  const h = firstRelief();
  let g = h.game;
  expect(g.depths.active).toBe(true);
  expect(g.depths.jet?.x).toBe(515);
  const checkpoint = { ...g.checkpoint },
    collected = [...g.collected],
    chronology = {
      farah: g.journey.farah,
      completed: [...g.journey.completed],
      era: g.journey.wing.era,
    };
  expect(checkpoint.room).toBe("depths-heart");
  expect(parseCampaign(JSON.stringify(g.saved))?.journey.depths.seals).toBe(1);
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  g.respawn();
  expect(g.depths.active).toBe(false);
  expect(g.journey.depths.seals).toBe(1);
  g = h.game = reloadCampaign(g);
  expect(g.depths.active).toBe(false);
  expect(g.echoes.phase).toBe("idle");
  expect(g.checkpoint).toEqual(checkpoint);
  run(h.rewardRoute([[305], "use"]));
  run(new DepthsRoute(h).west()); // already secured, no duplicate outcome
  run(new DepthsRoute(h).east());
  expect(parseCampaign(JSON.stringify(g.saved))?.journey.depths.seals).toBe(2);
  g = h.game = reloadCampaign(g);
  expect(g.journey.depths.seals).toBe(2);
  expect(g.depths.jet).toBeNull();
  run(h.rewardRoute([[785], "use"]));
  expect(g.journey.depths.resolved).toBe(true);
  expect(g.depths.active).toBe(false);
  run(h.use());
  expect([...g.collected]).toEqual(collected);
  expect({
    farah: g.journey.farah,
    completed: g.journey.completed,
    era: g.journey.wing.era,
  }).toEqual(chronology);
  expect(g.companion).toBeNull();
  expect(campaignMap(g)).toContain(
    "Keeper resting; reciprocal rotunda lift open",
  );
  g = h.game = reloadCampaign(g);
  run(
    h.rewardRoute([[1495], "use", [260], [370, 530], [420], [650, 420], [850]]),
  );
  expect(g.collected.has(DEPTHS_HEART)).toBe(true);
  const max = g.player.maxHealth;
  run(h.rewardRoute([[940], [850]]));
  expect(g.player.maxHealth).toBe(max);
  g.save(false);
  const loaded = reloadCampaign(g);
  expect(loaded.player.maxHealth).toBe(max);
  expect(loaded.journey.depths.resolved).toBe(true);
});

it("gives real warning before pressure damage, respects Freeze, and clears an interrupted test on exit", () => {
  const h = reach(
    new CampaignHarness({ immortal: false, exploreDepths: true }),
    (g) => g.room.id === "depths-heart" && g.depths.active,
  );
  const g = h.game;
  expect(g.depths.jet).toMatchObject({ warning: true, live: false, x: 420 });
  // Stand in the real curtain after its warning, without bypassing collision.
  run(h.walk(455));
  const hp = g.player.health;
  g.input.clear();
  run(h.until(() => g.player.health < hp, 800));
  expect(g.player.health).toBe(hp - 1);
  input(g, "freeze");
  const clock = g.depths.clock;
  for (let i = 0; i < 60; i++) g.update(1 / 120);
  expect(g.depths.clock).toBe(clock);
  run(h.rewardRoute([[55], "use"]));
  expect(g.room.id).toBe("depths-race");
  expect(g.depths.active).toBe(false);
  expect(g.journey.depths.seals).toBe(0);
  run(h.use());
  expect(g.room.id).toBe("depths-heart");
  expect(g.depths.jet).toBeNull();
});

it("keeps pressure advancing during player-only rewind", () => {
  const h = reach(
    new CampaignHarness({ immortal: false, exploreDepths: true }),
    (g) => g.room.id === "depths-heart" && g.depths.active,
  );
  const g = h.game;
  run(h.walk(250));
  g.input.clear();
  for (let i = 0; i < 120; i++) g.update(1 / 120);
  const clock = g.depths.clock,
    world = g.worldTime;
  g.input.press("rewind");
  for (let i = 0; i < 30; i++) g.update(1 / 120);
  expect(g.rewinding).toBe(true);
  expect(g.worldTime).toBeGreaterThan(world);
  expect(g.depths.clock - clock).toBeCloseTo(30 / 120, 6);
});

it("makes a live frozen jet harmless after hit invincibility expires", () => {
  const h = reach(
    new CampaignHarness({ immortal: false, exploreDepths: true }),
    (g) => g.room.id === "depths-heart" && g.depths.active,
  );
  const g = h.game;
  run(h.walk(455));
  g.input.clear();
  run(h.until(() => !!g.depths.jet?.live, 600));
  input(g, "freeze");
  const clock = g.depths.clock,
    hp = g.player.health;
  run(h.walk(455));
  g.input.clear();
  for (let i = 0; i < 180; i++) g.update(1 / 120);
  expect(g.freezeTime).toBeGreaterThan(0);
  expect(g.depths.clock).toBe(clock);
  expect(g.depths.jet?.live).toBe(true);
  expect(g.player.health).toBe(hp);
  expect(g.player.x).toBeGreaterThan(420);
  expect(g.player.x).toBeLessThan(500);
});

it("migrates v12 and ending saves with predecessor state intact, rejects inconsistent phases, and never requires the descent", () => {
  const h = firstRelief(),
    old = JSON.parse(JSON.stringify(h.game.saved));
  old.journey.version = 12;
  delete old.journey.depths;
  const migrated = parseCampaign(JSON.stringify(old))!;
  expect(migrated.journey.version).toBe(13);
  expect(migrated.journey.depths).toEqual({
    diverted: false,
    seals: 0,
    resolved: false,
  });
  expect(migrated.journey.consequences).toEqual(old.journey.consequences);
  expect(migrated.journey.rival).toEqual(old.journey.rival);
  expect(migrated.collected).toEqual(old.collected);
  for (const depths of [
    null,
    {},
    { diverted: 1, seals: 0, resolved: false },
    { diverted: false, seals: 1, resolved: false },
    { diverted: true, seals: 3, resolved: false },
    { diverted: true, seals: 1, resolved: true },
  ])
    expect(
      parseCampaign(
        JSON.stringify({
          ...migrated,
          journey: { ...migrated.journey, depths },
        }),
      ),
    ).toBeNull();
  const ignored = new CampaignHarness({ immortal: false, exploreBaths: false });
  expect(ignored.step(240000).status, ignored.error ?? "").toBe("passed");
  expect(ignored.game.journey.depths).toEqual({
    diverted: false,
    seals: 0,
    resolved: false,
  });
  expect(DEPTHS_IDS.some((id) => ignored.game.visited.has(id))).toBe(false);
  const end = JSON.parse(JSON.stringify(ignored.game.saved));
  end.journey.version = 12;
  delete end.journey.depths;
  const restored = new CampaignGame({
    persist: false,
    save: parseCampaign(JSON.stringify(end))!,
  });
  restored.start(true);
  expect(restored.screen).toBe("ending");
  expect(restored.journey.completed).toHaveLength(40);
});
