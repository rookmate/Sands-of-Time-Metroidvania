import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { parseCampaign } from "../src/campaign/state";
import {
  ATTUNEMENTS,
  VESSEL_ID,
  type Attunement,
} from "../src/campaign/rewards";
import { reloadCampaign } from "../src/harness/CampaignTrace";
import { Sound } from "../src/game/audio";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";

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
  expect(until(h.game), h.error ?? h.action).toBe(true);
}

it.each(["patience", "stillness"] as const)(
  "physically explores both chambers and finishes with %s",
  (choice) => {
    const h = new CampaignHarness({ immortal: false, optionalRewards: choice });
    const report = h.step(240000);
    expect(report.status, report.error ?? "").toBe("passed");
    expect(report.rooms).toEqual(
      expect.arrayContaining(["echo-gallery", "keeper-cistern"]),
    );
    expect(report.rewards).toEqual({
      attunement: choice,
      inscription: true,
      maxSand: 8,
    });
    expect(report.collected.filter((id) => id === VESSEL_ID)).toHaveLength(1);
    expect(report.milestones).toHaveLength(40);
  },
);

it("keeps the visible service arch blocked until sword and Dash, then opens it without optional rewards", () => {
  const h = new CampaignHarness({ immortal: false });
  advance(h, (g) => g.room.id === "sluice-reservoir");
  const door = CAMPAIGN_ROOMS["sluice-reservoir"].doors.find(
    (d) => d.to === "keeper-cistern",
  )!;
  expect(h.game.doorBlock(door)).toBeTruthy();
  advance(h, (g) => g.room.id === "upper-baths");
  expect(h.game.doorBlock(door)).toBeTruthy();
  advance(h, (g) => g.room.id === "daybreak");
  expect(h.game.doorBlock(door)).toBeNull();
  expect(h.game.journey.rewards.attunement).toBeNull();
});

it.each(["patience", "stillness"] as const)(
  "persists %s once, applies only its stated effect, and keeps choices through Retry and reload",
  (choice: Attunement) => {
    const h = new CampaignHarness({ immortal: false, optionalRewards: choice });
    advance(h, (g) => g.journey.rewards.attunement !== null);
    let g = h.game;
    const milestones = [...g.journey.completed];
    // Visit the other seal through the same proximity interaction.
    const other = choice === "patience" ? "stillness" : "patience";
    g.player.x = ATTUNEMENTS[other].x - 15;
    g.player.y = 254;
    g.interaction!.action();
    expect(g.journey.rewards.attunement).toBe(choice);
    expect(g.journey.completed).toEqual(milestones);
    g.player.sand = 6;
    g.input.press("slow");
    g.update(1 / 120);
    expect(g.slowTime).toBe(choice === "patience" ? 9 : 6);
    expect(g.player.sand).toBe(5);
    g.input.clear();
    g.input.press("freeze");
    g.update(1 / 120);
    expect(g.freezeTime).toBe(4);
    expect(g.player.sand).toBe(choice === "stillness" ? 4 : 3);
    g.input.clear();
    g.input.press("dash");
    g.update(1 / 120);
    expect(g.player.dashTime).toBe(0.23);
    expect(g.player.sand).toBe(choice === "stillness" ? 3 : 2);
    g.input.clear();
    g.player.dashTime = 0;
    g.player.invincible = 0;
    g.damage(100);
    expect(g.screen).toBe("death");
    g.respawn();
    expect(g.journey.rewards.attunement).toBe(choice);
    g = reloadCampaign(g);
    expect(g.journey.rewards.attunement).toBe(choice);
    expect(g.journey.completed).toEqual(milestones);
  },
);

it("claims the vessel once and retains capacity, refill, and inscription across death, rewind, revisits and reload", () => {
  const h = new CampaignHarness({
    immortal: false,
    optionalRewards: "patience",
  });
  advance(h, (g) => g.journey.rewards.inscription);
  let g = h.game;
  const completed = [...g.journey.completed];
  expect(g.player.maxSand).toBe(8);
  expect(g.history).toHaveLength(0);
  g.player.invincible = 0;
  g.damage(100);
  g.respawn();
  expect(g.player.sand).toBe(8);
  g = reloadCampaign(g);
  expect(g.player.maxSand).toBe(8);
  expect(g.player.sand).toBe(8);
  expect(g.journey.rewards.inscription).toBe(true);
  // Returning over the pickup location cannot refill or increase capacity again.
  g.enterRoom("keeper-cistern", undefined, { x: 1095, y: 474 });
  g.player.sand = 3;
  g.update(1 / 120);
  expect(g.player.maxSand).toBe(8);
  expect(g.player.sand).toBe(3);
  for (let i = 0; i < 20; i++) g.update(1 / 120);
  g.input.press("rewind");
  g.update(1 / 120);
  expect(g.rewinding).toBe(true);
  expect(g.player.maxSand).toBe(8);
  expect(g.collected.has(VESSEL_ID)).toBe(true);
  expect(g.journey.completed).toEqual(completed);
});

it("migrates a v2 journey without granting discoveries and rejects malformed or premature rewards", () => {
  const h = new CampaignHarness({ immortal: false });
  advance(h, (g) => g.room.id === "daybreak");
  const raw = JSON.parse(JSON.stringify(h.game.saved));
  raw.journey.version = 2;
  delete raw.journey.rewards;
  const migrated = parseCampaign(JSON.stringify(raw))!;
  expect(migrated).not.toBeNull();
  expect(migrated.journey.rewards).toEqual({
    attunement: null,
    inscription: false,
  });
  expect(migrated.collected).toEqual(raw.collected);
  for (const rewards of [
    { attunement: "reach", inscription: false },
    { attunement: null, inscription: 1 },
    null,
  ]) {
    const bad = structuredClone(migrated);
    bad.journey.rewards = rewards as never;
    expect(parseCampaign(JSON.stringify(bad))).toBeNull();
  }
  const early = new CampaignHarness().game;
  early.save(false);
  const bad = JSON.parse(JSON.stringify(early.saved));
  bad.journey.rewards.attunement = "patience";
  expect(parseCampaign(JSON.stringify(bad))).toBeNull();
});

it("expires the optional shutter, retries from its lever, and crosses it with ordinary unmodified powers", () => {
  const h = new CampaignHarness({
    immortal: false,
    optionalRewards: "stillness",
  });
  advance(h, (g) => g.room.id === "keeper-cistern");
  const g = h.game;
  // No seal is required for the timed run. Exercise expiry without moving into the gap.
  g.journey.rewards.attunement = null;
  g.player.x = 205;
  g.interaction!.action();
  for (let i = 0; i < 610; i++) g.update(1 / 120);
  expect(g.puzzles.state.remaining).toBe(0);
  expect(g.puzzles.state.solved).toBe(false);
  expect(g.platforms.some((p) => p.x === 1000 && p.h === 650)).toBe(true);
  g.interaction!.action();
  expect(g.puzzles.state.remaining).toBe(5);
  // The route resumes at the entrance and uses its normal lever action again.
  advance(h, (g) => g.collected.has(VESSEL_ID));
  expect(g.journey.rewards.attunement).toBeNull();
  expect(g.puzzles.state.solved).toBe(true);
});
