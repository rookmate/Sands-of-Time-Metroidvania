import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { parseCampaign } from "../src/campaign/state";
import { cooperationControls } from "../src/campaign/cooperation";
import { Sound } from "../src/game/audio";
import { mapMarkup } from "../src/ui/map";

beforeEach(() => {
  vi.spyOn(Sound.prototype, "start").mockImplementation(() => {});
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function advance(h: CampaignHarness, until: (g: CampaignGame) => boolean) {
  for (let i = 0; i < 100000 && !until(h.game) && h.status !== "failed"; i++)
    h.step();
  expect(h.status, h.error ?? "").not.toBe("failed");
  expect(until(h.game)).toBe(true);
}
function reach(phase: string) {
  const h = new CampaignHarness({ immortal: false });
  advance(h, (g) => g.journey.cooperation.phase === phase);
  return h;
}

it("physically scouts a separate room, teaches the step, crosses without Dash, reunites and opens a real return loop", () => {
  const h = reach("scouting");
  const g = h.game;
  expect(g.room.id).toBe("bathworks");
  expect(g.companion).not.toBeNull();
  expect(g.journey.farah).toBe("following");
  const anchors = [...g.journey.completed];
  advance(h, (g) => g.journey.cooperation.phase === "ready");
  expect(g.companion).toBeNull(); // Farah is in the loft, not following through doors.
  expect(g.quest.text).toContain("valve loft");
  expect(mapMarkup(g)).toContain("valve loft");
  const exit = CAMPAIGN_ROOMS["upper-baths"].doors.find((d) => d.milestone)!;
  expect(g.doorBlock(exit)).toContain("Reunite");
  advance(h, (g) => g.journey.cooperation.phase === "crossed");
  expect(g.room.id).toBe("spillway");
  expect(g.player.y + g.player.h).toBe(420);
  expect(g.abilities.has("dash")).toBe(false);
  expect(g.journey.completed).toEqual(anchors);
  expect(g.platforms.some((p) => p.x === 790 && p.y === 420)).toBe(true);
  advance(h, (g) => g.journey.cooperation.phase === "reunited");
  expect(g.room.id).toBe("valve-loft");
  expect(g.companion).not.toBeNull();
  expect(g.doorBlock(exit)).not.toContain("Reunite");
  advance(h, (g) => g.room.id === "sluice-reservoir");
  expect(g.player.y + g.player.h).toBe(530);
  expect(g.journey.completed).toEqual(anchors);
  const replay = CampaignTrace.replay(
    new CampaignHarness({ immortal: false }).game,
    h.trace.events,
  );
  expect(replay.journey).toEqual(g.journey);
  expect(replay.player).toEqual(g.player);
});

it.each(["scouting", "primed", "crossed", "reunited"])(
  "keeps %s progress across Retry, checkpoint reload, leaving and returning",
  (phase) => {
    const h = reach(phase);
    let g = h.game;
    const before = structuredClone(g.journey);
    g.save(false);
    g.player.invincible = 0;
    g.damage(100);
    expect(g.screen).toBe("death");
    g.respawn();
    expect(g.journey).toEqual(before);
    g = reloadCampaign(g);
    expect(g.journey).toEqual(before);
    const room = g.room.id;
    g.enterRoom("baths-main", "bathworks");
    g.update(1 / 120);
    expect(g.journey.farah).toBe("following");
    if (phase !== "reunited") expect(g.companion).toBeNull();
    g.enterRoom(room);
    g.update(1 / 120);
    expect(g.journey.cooperation.phase).toBe(phase);
    expect(g.journey.completed).toEqual(before.completed);
    if (phase === "crossed") {
      // Reload starts at the near-side fountain, but the permanent bridge is up.
      expect(g.platforms.some((p) => p.x === 790 && p.y === 420)).toBe(true);
    }
  },
);

it("expires safely, permits a fresh signal, and excludes permanent steps from movement rewind", () => {
  const h = new CampaignHarness({ immortal: false });
  advance(h, (g) => g.journey.cooperation.remaining > 0);
  const g = h.game;
  expect(g.player.y + g.player.h).toBe(420);
  const anchors = [...g.journey.completed];
  g.input.clear();
  for (let i = 0; i < 1000; i++) g.update(1 / 120);
  expect(g.journey.cooperation.remaining).toBe(0);
  expect(g.journey.cooperation.phase).toBe("primed");
  expect(g.platforms.some((p) => p.x === 450 && p.y === 475)).toBe(true);
  expect(g.platforms.some((p) => p.x === 790 && p.y === 420)).toBe(false);
  // Still beside the upper bell; use normal input to reset the entire window.
  g.input.press("interact");
  g.update(1 / 120);
  expect(g.journey.cooperation.remaining).toBe(8);
  g.input.clear();
  for (let i = 0; i < 60; i++) g.update(1 / 120);
  g.input.press("rewind");
  for (let i = 0; i < 20; i++) g.update(1 / 120);
  expect(g.journey.cooperation.phase).toBe("primed");
  expect(g.journey.cooperation.remaining).toBeLessThan(7.6);
  expect(g.journey.completed).toEqual(anchors);
});

it("migrates v3 without starting cooperation or losing optional rewards, and validates phase state", () => {
  const h = new CampaignHarness({
    immortal: false,
    optionalRewards: "stillness",
  });
  advance(h, (g) => g.collected.has("keeper-cistern-vessel"));
  const raw = JSON.parse(JSON.stringify(h.game.saved));
  raw.journey.version = 3;
  delete raw.journey.cooperation;
  const migrated = parseCampaign(JSON.stringify(raw))!;
  expect(migrated).not.toBeNull();
  expect(migrated.journey.version).toBe(10);
  expect(migrated.journey.cooperation).toEqual({
    phase: "idle",
    travel: 0,
    remaining: 0,
  });
  expect(migrated.journey.rewards).toEqual(raw.journey.rewards);
  expect(migrated.collected).toEqual(raw.collected);
  for (const cooperation of [
    { phase: "nonsense", travel: 1, remaining: 0 },
    { phase: "scouting", travel: 4, remaining: 0 },
    { phase: "crossed", travel: 0, remaining: 0 },
    { phase: "reunited", travel: 1, remaining: 9 },
  ])
    expect(
      parseCampaign(
        JSON.stringify({
          ...migrated,
          journey: { ...migrated.journey, cooperation },
        }),
      ),
    ).toBeNull();
});

it("finishes while declining cooperation and preserves later Farah chronology", () => {
  const h = new CampaignHarness({
    immortal: false,
    cooperate: false,
    exploreBaths: false,
  });
  const report = h.step(240000);
  expect(report.status, report.error ?? "").toBe("passed");
  expect(report.cooperation.phase).toBe("idle");
  expect(report.rooms).not.toContain("spillway");
  expect(
    report.scenes
      .filter((s) => ["tomb", "sunset", "honor"].includes(s.id))
      .map((s) => s.farah),
  ).toEqual(["gone", "dead", "restored"]);
  expect(report.milestones).toHaveLength(40);
  // Returning later cannot dispatch a dead/gone/separated/restored Farah.
  for (const state of ["separated", "gone", "dead", "restored"] as const) {
    h.game.journey.farah = state;
    h.game.enterRoom("bathworks");
    h.game.update(1 / 120);
    expect(cooperationControls(h.game)).toHaveLength(0);
    expect(h.game.journey.farah).toBe(state);
  }
});
