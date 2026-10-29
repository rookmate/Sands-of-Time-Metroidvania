import { setMaxListeners } from "node:events";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { parseCampaign } from "../src/campaign/state";
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
import { WING, WING_IDS, WING_HEART } from "../src/campaign/eraWing";
import { overlap } from "../src/game/physics";
import { campaignMap } from "../src/ui/campaignMap";

function reach(
  room: string,
  predicate: (g: CampaignGame) => boolean = () => true,
) {
  const h = new CampaignHarness({ immortal: false, exploreEraWing: true });
  for (
    let i = 0;
    i < 120000 &&
    !(h.game.room.id === room && predicate(h.game)) &&
    h.status !== "failed";
    i++
  )
    h.step();
  expect(h.status, h.error ?? "").not.toBe("failed");
  expect(h.game.room.id).toBe(room);
  expect(predicate(h.game)).toBe(true);
  return h;
}
function tick(g: CampaignGame, frames = 1, ...actions: Action[]) {
  g.input.clear();
  for (const a of actions) g.input.press(a);
  for (let i = 0; i < frames; i++) g.update(1 / 120);
  g.input.clear();
}
function* hWalk(g: CampaignGame) {
  g.input.clear();
  g.input.press("left");
  for (let i = 0; i < 120 && g.player.x > 245; i++) {
    g.update(1 / 120);
    yield;
  }
  g.input.clear();
}
function safe(g: CampaignGame) {
  expect(
    g.platforms.filter((p) => !p.oneWay).some((p) => overlap(g.player, p)),
  ).toBe(false);
  expect(g.screen).toBe("playing");
}

it("plays the wing through normal inputs and independently replays its whole mortal campaign", () => {
  const h = new CampaignHarness({
    immortal: false,
    exploreEraWing: true,
    exploreEchoes: true,
    resilienceSeed: 42,
    regionOrder: "sky-first",
  });
  const report = h.step(240000);
  expect(report.status, report.error ?? "").toBe("passed");
  expect(h.game.journey.completed).toHaveLength(40);
  expect(WING_IDS.every((id) => h.game.visited.has(id))).toBe(true);
  expect(h.game.collected.has(WING_HEART)).toBe(true);
  expect(h.game.journey.wing).toEqual({ era: "intact", discovered: true });
  expect(h.game.journey.echoes.solved).toHaveLength(4);
  const replay = new CampaignGame({ persist: false });
  replay.begin();
  const result = CampaignTrace.replay(replay, h.trace.events);
  expect(result.journey).toEqual(h.game.journey);
  expect([...result.collected]).toEqual([...h.game.collected]);
  expect(result.player).toEqual(h.game.player);
});

it("makes the intact wall physically block passage and leaves a mirror and exit reachable", () => {
  const g = reach("mirror-reception").game;
  tick(g, 240, "right");
  expect(g.player.x + g.player.w).toBe(600);
  expect(g.doorBlock(CAMPAIGN_ROOMS[g.room.id].doors[1])).toContain(
    "Intact wall",
  );
  tick(g, 130, "left");
  expect(g.player.x).toBeLessThan(260);
  expect(campaignMap(g)).toContain("Twin mirror wing · intact");
  // Map queries gates from every source room, not just the current room.
  expect(g.doorBlock(CAMPAIGN_ROOMS["fallen-arcade"].doors[1])).toBeNull();
  tick(g, 1, "interact");
  expect(g.journey.wing.era).toBe("ruined");
  expect(g.doorBlock(CAMPAIGN_ROOMS["fallen-arcade"].doors[1])).toContain(
    "Fallen arch",
  );
  expect(g.doorBlock(CAMPAIGN_ROOMS["mirror-reception"].doors[1])).toBeNull();
  safe(g);
});

it.each(["intact", "ruined"] as const)(
  "saves, reloads and retries a shared landing in %s",
  (era) => {
    const h = reach("mirror-reception", (g) => g.journey.wing.era === "ruined");
    const g = h.game;
    if (era === "intact") tick(g, 1, "interact");
    expect(g.journey.wing.era).toBe(era);
    const loaded = reloadCampaign(g);
    expect(loaded.journey.wing.era).toBe(era);
    tick(loaded, 2);
    safe(loaded);
    loaded.player.invincible = 0;
    loaded.damage(100);
    expect(loaded.screen).toBe("death");
    loaded.respawn();
    tick(loaded, 2);
    safe(loaded);
    expect(loaded.journey.wing.era).toBe(era);
    expect(loaded.echoes.phase).toBe("idle");
    expect(loaded.journey.completed).toHaveLength(17);
  },
);

it("clears echo and rewind memories at a switch, preserves sand and a single Farah's health", () => {
  const g = reach("mirror-vault", (g) => g.echoes.phase === "recording").game;
  const companionState = g.journey.farah;
  // Exercise the same following boundary on an optional return with Farah.
  g.journey.farah = "following";
  g.farah.enter();
  const actor = g.companion!;
  actor.health = 3;
  for (const _ of hWalk(g)) {
    /* move normally to the mirror */
  }
  const sand = g.player.sand;
  expect(g.interaction?.label).toContain("Twin mirror");
  tick(g, 1, "interact");
  expect(g.journey.wing.era).toBe("ruined");
  expect(g.echoes.phase).toBe("idle");
  expect(g.echoes.actor).toBeNull();
  expect(g.history).toEqual([]);
  expect(g.player.sand).toBe(sand);
  expect(g.companion).toBe(actor);
  expect(actor.health).toBe(3);
  expect(g.journey.farah).toBe("following");
  safe(g);
  tick(g, 1, "interact");
  expect(g.journey.wing.era).toBe("intact");
  expect(g.companion).toBe(actor);
  g.journey.farah = companionState;
});

it("keeps the upper mirror collision-safe in both directions and recovers missed stairs", () => {
  const g = reach("fallen-arcade", (g) => g.journey.wing.era === "intact").game;
  expect(g.player.y + g.player.h).toBe(310);
  const high = reloadCampaign(g);
  tick(high, 1, "interact");
  expect(high.journey.wing.era).toBe("ruined");
  safe(high);
  expect(high.doorBlock(CAMPAIGN_ROOMS[high.room.id].doors[1])).toContain(
    "Fallen arch",
  );
  tick(high, 1, "interact");
  expect(high.journey.wing.era).toBe("intact");
  tick(high, 1, "down");
  tick(high, 120);
  expect(high.player.y + high.player.h).toBe(650);
  safe(high);
  for (const _ of WING_IDS) expect(WING[_].mirrors.length).toBeGreaterThan(0);
});

it("migrates v6 without changing progress and persists a one-time gift and echo latch", () => {
  const h = reach("mirror-vault", (g) => g.journey.wing.discovered);
  const g = h.game;
  const loaded = reloadCampaign(g);
  expect(loaded.journey.wing.discovered).toBe(true);
  expect(loaded.journey.echoes.solved).toContain("mirror-vault");
  const health = g.player.maxHealth;
  for (const _ of h.walk(1140)) {
    /* revisit the heart */
  }
  expect(g.player.maxHealth).toBe(health);
  const old = JSON.parse(JSON.stringify(g.saved));
  old.journey.version = 6;
  delete old.journey.wing;
  const migrated = parseCampaign(JSON.stringify(old))!;
  expect(migrated.journey.wing).toEqual({ era: "intact", discovered: false });
  expect(migrated.journey.completed).toEqual(g.journey.completed);
  expect(migrated.collected).toContain(WING_HEART);
  for (const wing of [
    { era: "other", discovered: false },
    { era: "intact", discovered: 1 },
  ]) {
    expect(
      parseCampaign(
        JSON.stringify({ ...g.saved, journey: { ...g.journey, wing } }),
      ),
    ).toBeNull();
  }
});
