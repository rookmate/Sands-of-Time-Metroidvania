import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PalaceRoutes } from "../src/harness/PalaceRoutes";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { refugeAccount } from "../src/campaign/consequences";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { parseCampaign } from "../src/campaign/state";
import { campaignMap } from "../src/ui/campaignMap";
import type { CampaignSave } from "../src/campaign/types";
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
  "remembers the rescue and repair through the full mortal %s route and exact-input replay",
  (regionOrder) => {
    const h = new CampaignHarness({
      immortal: false,
      regionOrder,
      exploreConsequences: true,
      investigateHistory: true,
      ...(regionOrder === "sky-first"
        ? {
            resilienceSeed: 42,
            rivalOutcome: "released" as const,
            exploreEraWing: true,
            exploreEchoes: true,
            exploreMastery: true,
            exploreEnemyTraversal: true,
          }
        : {}),
    });
    expect(h.step(240000).status, h.error ?? "").toBe("passed");
    expect(h.game.journey.completed).toHaveLength(40);
    expect(h.game.journey.consequences).toEqual({
      nimaRescued: true,
      liftRepaired: true,
    });
    expect(parseCampaign(JSON.stringify(h.game.saved))).not.toBeNull();
    const replay = new CampaignGame({ persist: false });
    replay.begin();
    const result = CampaignTrace.replay(replay, h.trace.events);
    expect(result.journey).toEqual(h.game.journey);
    expect(result.player).toEqual(h.game.player);
    expect(result.checkpoint).toEqual(h.game.checkpoint);
    expect([...result.collected]).toEqual([...h.game.collected]);
  },
);

function inStore() {
  return reach(
    new CampaignHarness({ immortal: false, exploreConsequences: true }),
    (g) => g.room.id === "lamp-store",
  );
}
function freeNima(h: CampaignHarness) {
  run(
    h.rewardRoute([
      [665],
      "use",
      [260],
      [370, 530],
      [420],
      [650, 420],
      [985],
      "use",
    ]),
  );
}

it("keeps the actual grille solid until the release, saves the rescue once, and preserves the main checkpoint through death/Retry and reload", () => {
  const h = inStore(),
    g = h.game;
  const checkpoint = { ...g.checkpoint },
    collected = [...g.collected],
    health = g.player.maxHealth;
  expect(g.platforms.some((p) => p.x === 760 && p.h === 160)).toBe(true);
  run(h.walk(700)); // The real solid bar stops an approach along the floor.
  g.input.press("right");
  for (let i = 0; i < 90; i++) g.update(1 / 120);
  g.input.clear();
  expect(g.player.x + g.player.w).toBeLessThanOrEqual(760);
  expect(g.journey.consequences.nimaRescued).toBe(false);
  freeNima(h);
  expect(g.platforms.some((p) => p.x === 760 && p.h === 160)).toBe(false);
  expect(g.journey.consequences.nimaRescued).toBe(true);
  expect((g.saved as CampaignSave).journey.consequences.nimaRescued).toBe(true);
  run(h.use());
  expect(g.story).toBeNull();
  expect(g.checkpoint).toEqual(checkpoint);
  expect([...g.collected]).toEqual(collected);
  expect(g.player.maxHealth).toBe(health);
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  g.respawn();
  expect(g.checkpoint).toEqual(checkpoint);
  expect(g.room.id).toBe(checkpoint.room);
  expect(g.journey.consequences.nimaRescued).toBe(true);
  h.game = reloadCampaign(g);
  expect(h.game.journey.consequences).toEqual(g.journey.consequences);
  expect(h.game.checkpoint).toEqual(checkpoint);
  // A physical return to the store finds an empty bed and an open grille.
  run(h.rewardRoute([[85], "use", [1715], "use", [85], "use"]));
  run(h.drop(930, 650));
  run(h.rewardRoute([[1135], "use", [205], "use", [665]]));
  expect(h.game.room.id).toBe("lamp-store");
  expect(h.game.platforms.some((p) => p.x === 760 && p.h === 160)).toBe(false);
  input(h.game, "interact");
  expect(h.game.story?.title).toBe("Gone to the lamp refuge");
  expect(h.game.enemies).toHaveLength(0);
});

it("allows a dry, empty refuge first and leaves both exits usable without rescuing anyone", () => {
  const h = reach(
    new CampaignHarness({
      immortal: false,
      regionOrder: "sky-first",
      exploreConsequences: true,
    }),
    (g) => g.room.id === "lamp-refuge",
  );
  const g = h.game;
  expect(g.journey.consequences).toEqual({
    nimaRescued: false,
    liftRepaired: false,
  });
  run(
    h.rewardRoute([[435], "use", [260], [370, 530], [420], [650, 420], [985]]),
  );
  input(g, "interact");
  expect(g.story?.title).toBe("A dry drive");
  g.closeStory();
  expect(g.journey.consequences.liftRepaired).toBe(false);
  expect(g.checkpoint.room).not.toBe("lamp-refuge");
  run(h.walk(1150));
  run(h.until(() => g.player.grounded && g.player.y > 580, 300));
  input(g, "interact");
  expect(g.room.id).toBe("lamp-refuge");
  expect(g.doorBlock(CAMPAIGN_ROOMS["lamp-refuge"].doors[1])).toContain(
    "Broken drive",
  );
  run(h.rewardRoute([[55], "use"]));
  expect(g.room.id).toBe("cypress-crown");
});

it("repairs independently of Nima, cannot bypass prison release, and persists the shortcut through Retry/reload", () => {
  const h = reach(
    new CampaignHarness({ immortal: false }),
    (g) => g.room.id === "learning" && g.journey.completed.length === 28,
  );
  run(new PalaceRoutes(h).gardens());
  run(h.rewardRoute([[85], "use", [1715], "use"]));
  run(h.drop(930, 650));
  run(
    h.rewardRoute([
      [885],
      "use",
      [260],
      [370, 530],
      [420],
      [650, 420],
      [985],
      "use",
    ]),
  );
  let g = h.game;
  const checkpoint = { ...g.checkpoint },
    collected = [...g.collected];
  expect(g.journey.consequences).toEqual({
    nimaRescued: false,
    liftRepaired: true,
  });
  expect(parseCampaign(JSON.stringify(g.saved))).not.toBeNull();
  expect(g.doorBlock(CAMPAIGN_ROOMS["lamp-refuge"].doors[1])).toContain(
    "prison locks",
  );
  expect(campaignMap(g)).toContain("Lift drive repaired; waiting");
  run(h.use()); // Reread the repaired drive, without another outcome or reward.
  expect(g.journey.consequences.liftRepaired).toBe(true);
  expect([...g.collected]).toEqual(collected);
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  g.respawn();
  expect(g.journey.consequences.liftRepaired).toBe(true);
  expect(g.checkpoint).toEqual(checkpoint);
  g = reloadCampaign(g);
  expect(g.journey.consequences.liftRepaired).toBe(true);
  expect(g.checkpoint).toEqual(checkpoint);
});

it("acknowledges prior discovery and mercy on a later visit without duplicate actors, rewards, or chronology changes", () => {
  const h = reach(
    new CampaignHarness({
      immortal: false,
      exploreConsequences: true,
      investigateHistory: true,
      rivalOutcome: "released",
    }),
    (g) => g.room.id === "lamp-refuge" && g.journey.palace.prisonOpen,
  );
  const g = h.game,
    chronology = {
      completed: [...g.journey.completed],
      farah: g.journey.farah,
      dagger: g.hasDagger,
    },
    collected = [...g.collected];
  expect(refugeAccount(g)).toContain("copied them beside our beds");
  expect(refugeAccount(g)).toContain("let Sahir finish his watch");
  run(h.walk(435));
  input(g, "interact");
  const account = { ...g.story };
  expect(account.title).toBe("Nima kept a light");
  expect(account.text).toContain("Sahir");
  g.closeStory();
  run(h.rewardRoute([[55], "use", [885], "use", [435]]));
  input(g, "interact");
  expect(g.story).toEqual(account);
  g.closeStory();
  expect(g.enemies).toHaveLength(0);
  expect([...g.collected]).toEqual(collected);
  expect({
    completed: g.journey.completed,
    farah: g.journey.farah,
    dagger: g.hasDagger,
  }).toEqual(chronology);
  expect(g.doorBlock(CAMPAIGN_ROOMS["lamp-refuge"].doors[1])).toBeNull();
  expect(campaignMap(g)).toContain("Repaired lift open");
});

it("migrates v11 and ending saves without inventing rescues or repairs, and rejects invalid decision state", () => {
  const h = inStore();
  freeNima(h);
  const old = JSON.parse(JSON.stringify(h.game.saved));
  old.journey.version = 11;
  delete old.journey.consequences;
  const migrated = parseCampaign(JSON.stringify(old))!;
  expect(migrated.journey.version).toBe(12);
  expect(migrated.journey.consequences).toEqual({
    nimaRescued: false,
    liftRepaired: false,
  });
  expect(migrated.journey.mastery).toEqual(old.journey.mastery);
  expect(migrated.journey.rival).toEqual(old.journey.rival);
  expect(migrated.collected).toEqual(old.collected);
  for (const consequences of [
    null,
    {},
    { nimaRescued: "yes", liftRepaired: false },
    { nimaRescued: false, liftRepaired: 1 },
    { nimaRescued: false, liftRepaired: true },
  ])
    expect(
      parseCampaign(
        JSON.stringify({
          ...migrated,
          journey: {
            ...migrated.journey,
            palace: { ...migrated.journey.palace, irrigated: false },
            consequences,
          },
        }),
      ),
    ).toBeNull();
  const ending = new CampaignHarness({ immortal: false, exploreBaths: false });
  expect(ending.step(240000).status, ending.error ?? "").toBe("passed");
  expect(ending.game.journey.consequences).toEqual({
    nimaRescued: false,
    liftRepaired: false,
  });
  expect(ending.game.visited.has("lamp-store")).toBe(false);
  expect(ending.game.visited.has("lamp-refuge")).toBe(false);
  const endSave = JSON.parse(JSON.stringify(ending.game.saved));
  endSave.journey.version = 11;
  delete endSave.journey.consequences;
  const restored = new CampaignGame({
    persist: false,
    save: parseCampaign(JSON.stringify(endSave))!,
  });
  restored.start(true);
  expect(restored.screen).toBe("ending");
  expect(restored.journey.completed).toHaveLength(40);
});

it("finishes with Nima rescued and the lift left broken", () => {
  const h = reach(
    new CampaignHarness({ immortal: false }),
    (g) => g.room.id === "learning" && g.journey.completed.length === 28,
  );
  run(h.rewardRoute([[85], "use", [1715], "use", [85], "use"]));
  run(h.drop(930, 650));
  run(h.rewardRoute([[1135], "use", [205], "use"]));
  freeNima(h);
  // Abandon the optional store through ordinary death/Retry. Its rescue survives.
  h.recover("respawn");
  expect(h.game.room.id).toBe("learning");
  expect(h.step(240000).status, h.error ?? "").toBe("passed");
  expect(h.game.journey.consequences).toEqual({
    nimaRescued: true,
    liftRepaired: false,
  });
});
