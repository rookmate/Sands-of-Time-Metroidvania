import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { HISTORY_HEART, HISTORY_ROOM } from "../src/campaign/history";
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
function earlyCourt() {
  const h = reach(
    new CampaignHarness({ immortal: false }),
    (g) => g.room.id === "daybreak",
  );
  run(h.rewardRoute([[35], "use", [1785], "use"]));
  expect(h.game.room.id).toBe("garden-court");
  expect(h.game.journey.completed).toHaveLength(17);
  return h;
}

it.each(["gardens-first", "sky-first"] as const)(
  "solves accounts in %s order, returns to the campaign and independently replays the mortal inputs",
  (regionOrder) => {
    const h = new CampaignHarness({
      immortal: false,
      investigateHistory: true,
      regionOrder,
      ...(regionOrder === "sky-first"
        ? { resilienceSeed: 42, exploreEraWing: true, exploreEchoes: true }
        : {}),
    });
    const report = h.step(240000);
    expect(report.status, report.error ?? "").toBe("passed");
    expect(h.game.journey.completed).toHaveLength(40);
    const read = h.game.journey.history.read;
    expect(read).toEqual(
      regionOrder === "gardens-first"
        ? ["decree", "bowls", "plan", "sill", "witness"]
        : ["plan", "bowls", "decree", "sill", "witness"],
    );
    expect(h.game.journey.history.opened).toBe(true);
    expect(h.game.collected.has(HISTORY_HEART)).toBe(true);
    const replay = new CampaignGame({ persist: false });
    replay.begin();
    const result = CampaignTrace.replay(replay, h.trace.events);
    expect(result.journey).toEqual(h.game.journey);
    expect([...result.collected]).toEqual([...h.game.collected]);
    expect(result.player).toEqual(h.game.player);
  },
);

it("lets an observant player open the sill at milestone 17 without collecting clues or advancing the story", () => {
  const h = earlyCourt(),
    g = h.game;
  const chronology = {
    dagger: g.hasDagger,
    farah: g.journey.farah,
    sword: g.journey.sword,
  };
  const door = CAMPAIGN_ROOMS["garden-court"].doors.find(
    (d) => d.to === HISTORY_ROOM,
  )!;
  expect(g.doorBlock(door)).toContain("freight sill");
  expect(campaignMap(g)).not.toContain("Witnesses' room");
  run(h.walk(765));
  input(g, "down", "interact");
  expect(g.story?.title).toBe("The facing lowers");
  expect(g.journey.history).toEqual({ opened: true, read: [] });
  expect(g.doorBlock(door)).toBeNull();
  expect(campaignMap(g)).toContain('data-map-room="witness-room"');
  expect(campaignMap(g)).not.toContain("Witnesses' room");
  g.closeStory();
  input(g, "interact");
  expect(g.room.id).toBe(HISTORY_ROOM);
  expect(g.journey.completed).toHaveLength(17);
  expect({
    dagger: g.hasDagger,
    farah: g.journey.farah,
    sword: g.journey.sword,
  }).toEqual(chronology);
  run(h.rewardRoute([[85], "use"]));
  expect(g.room.id).toBe("garden-court");
  run(h.walk(615));
  input(g, "interact");
  expect(g.story?.title).toBe("The worn heel stone");
  expect(g.story?.detail).toContain("stays open");
});

it("examines the threshold without opening it on ordinary E and keeps evidence rereadable after returning", () => {
  const h = earlyCourt(),
    g = h.game;
  run(h.rewardRoute([[435], "use", [195]]));
  input(g, "interact");
  const account = { ...g.story };
  expect(account.title).toBe("The court's account");
  expect(account.detail).toContain("worn sill");
  g.closeStory();
  run(h.walk(765));
  input(g, "interact");
  expect(g.input.describe(g.story?.detail ?? "")).toContain(
    "hold S and press E",
  );
  expect(g.journey.history.opened).toBe(false);
  g.closeStory();
  h.game = reloadCampaign(g);
  expect(h.game.room.id).toBe("garden-court");
  expect(h.game.journey.history).toEqual(g.journey.history);
  h.game.player.invincible = 0;
  h.game.damage(100);
  h.game.respawn();
  expect(h.game.journey.history).toEqual(g.journey.history);
  run(h.rewardRoute([[85], "use", [1785], "use", [195]]));
  const returned = h.game;
  expect(returned.interaction?.label).toContain("Reread");
  input(returned, "interact");
  expect(returned.story).toEqual(account);
  expect(g.journey.history.read).toEqual(["decree", "sill"]);
  expect(g.journey.completed).toHaveLength(17);
});

it("preserves the open entrance, names and one-time heart through actual death, Retry, reload and revisits", () => {
  const h = reach(
    new CampaignHarness({ immortal: false, investigateHistory: true }),
    (g) => g.collected.has(HISTORY_HEART),
  );
  let g = h.game;
  const health = g.player.maxHealth;
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  g.respawn();
  expect(g.room.id).toBe(HISTORY_ROOM);
  expect(g.journey.history.opened).toBe(true);
  g = reloadCampaign(g);
  h.game = g;
  expect(g.journey.history.read).toContain("witness");
  run(h.walk(725));
  expect(g.interaction?.label).toContain("Reread");
  input(g, "interact");
  expect(g.story?.title).toBe("The room the court denied");
  g.closeStory();
  run(h.rewardRoute([[1040], [85], "use", [765], "use", [1040]]));
  expect(g.room.id).toBe(HISTORY_ROOM);
  expect(g.player.maxHealth).toBe(health);
  expect([...g.collected].filter((id) => id === HISTORY_HEART)).toHaveLength(1);
  expect(g.journey.completed).toHaveLength(28);
  expect(parseCampaign(JSON.stringify(g.saved))).not.toBeNull();
});

it("migrates v7 checkpoints with predecessor discoveries intact and rejects malformed investigation state", () => {
  const h = reach(
    new CampaignHarness({ immortal: false, exploreEraWing: true }),
    (g) => g.journey.wing.discovered,
  );
  const old = JSON.parse(JSON.stringify(h.game.saved));
  old.journey.version = 7;
  delete old.journey.history;
  const migrated = parseCampaign(JSON.stringify(old))!;
  expect(migrated.journey.version).toBe(14);
  expect(migrated.journey.history).toEqual({ opened: false, read: [] });
  expect(migrated.journey.wing).toEqual(old.journey.wing);
  expect(migrated.journey.echoes).toEqual(old.journey.echoes);
  expect(migrated.collected).toEqual(old.collected);
  expect(migrated.journey.completed).toEqual(old.journey.completed);
  const loaded = new CampaignGame({ persist: false, save: migrated });
  loaded.start(true);
  expect(loaded.journey.history).toEqual({ opened: false, read: [] });
  for (const history of [
    null,
    { opened: "yes", read: [] },
    { opened: false, read: ["witness"] },
    { opened: true, read: ["decree", "decree"] },
    { opened: false, read: ["unknown"] },
  ]) {
    expect(
      parseCampaign(
        JSON.stringify({
          ...migrated,
          journey: { ...migrated.journey, history },
        }),
      ),
    ).toBeNull();
  }
});

it("finishes the main campaign while ignoring every mystery interaction", () => {
  const h = new CampaignHarness({ immortal: false, exploreBaths: false });
  expect(h.step(240000).status, h.error ?? "").toBe("passed");
  expect(h.game.journey.history).toEqual({ opened: false, read: [] });
  expect(h.game.visited.has(HISTORY_ROOM)).toBe(false);
  expect(h.game.collected.has(HISTORY_HEART)).toBe(false);
  expect(h.game.journey.completed).toHaveLength(40);
});
