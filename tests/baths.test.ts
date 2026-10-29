import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { parseCampaign } from "../src/campaign/state";
import { reloadCampaign } from "../src/harness/CampaignTrace";
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
function reach(predicate: (g: CampaignGame) => boolean) {
  const h = new CampaignHarness({ immortal: false });
  for (let i = 0; i < 30000 && !predicate(h.game) && h.status !== "failed"; i++)
    h.step();
  expect(h.status, h.error ?? "").not.toBe("failed");
  expect(predicate(h.game)).toBe(true);
  return h;
}
function gate(g: CampaignGame, id: string, to: string) {
  return g.doorBlock(CAMPAIGN_ROOMS[id].doors.find((d) => d.to === to)!);
}

it("shows closed routes before unlock and opens the water and sword/Dash routes in the actual campaign", () => {
  const h = reach((g) => g.room.id === "baths-main");
  const g = h.game;
  expect(gate(g, "baths-main", "bathworks")).toMatch(/Flooded|story/);
  expect(gate(g, "upper-baths", "maintenance")).toBeTruthy();
  expect(gate(g, "baths-main", "maintenance")).toBeTruthy();
  for (
    let i = 0;
    i < 10000 && !g.journey.baths.shortcut && h.status !== "failed";
    i++
  )
    h.step();
  expect(h.status, h.error ?? "").not.toBe("failed");
  expect(g.journey.completed).toHaveLength(17);
  expect(g.journey.sword).toBe(2);
  expect(g.abilities.has("dash")).toBe(true);
  expect(gate(g, "upper-baths", "maintenance")).toBeNull();
  expect(gate(g, "baths-main", "bathworks")).toBeNull();
  expect(gate(g, "baths-main", "maintenance")).toBeNull();
  expect(mapMarkup(g)).toContain("Rotunda grate open");
});

it("requires intake pressure and keeps drainage through Retry, fountain reload, and revisits", () => {
  const h = reach((g) => g.room.id === "bathworks");
  let g = h.game;
  const milestones = [...g.journey.completed];
  // Test an unopened intake through the same wheel action the player uses.
  g.journey.baths.intake = false;
  g.regionalControl!.action();
  expect(g.journey.baths.drained).toBe(false);
  g.journey.baths.intake = true;
  g.regionalControl!.action();
  expect(g.journey.completed).toEqual(milestones);
  g.checkpoint = { room: "bathworks", x: 235, y: 594 };
  g.save(false);
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  g.respawn();
  expect(g.journey.baths.drained).toBe(true);
  g = reloadCampaign(g);
  expect(g.journey.baths).toEqual({
    intake: true,
    drained: true,
    shortcut: false,
  });
  g.enterRoom("baths-main", "bathworks");
  g.update(1 / 120);
  expect(g.platforms.some((p) => p.x === 720 && p.y === 540)).toBe(true);
  g.enterRoom("sluice-reservoir", "bathworks");
  g.update(1 / 120);
  expect(g.platforms.some((p) => p.x === 920 && p.y === 530)).toBe(true);
  expect(g.journey.completed).toEqual(milestones);
});

it("does not advance chronology or regrant sword rewards on optional travel and completed exits", () => {
  const h = reach((g) => g.journey.baths.shortcut);
  const g = h.game;
  const before = {
    completed: [...g.journey.completed],
    collected: [...g.collected],
    sword: g.journey.sword,
    farah: g.journey.farah,
  };
  // Driver returns through the grate, upper pools, and completed story exit.
  for (
    let i = 0;
    i < 10000 && g.room.id !== "daybreak" && h.status !== "failed";
    i++
  )
    h.step();
  expect(h.status, h.error ?? "").not.toBe("failed");
  expect(g.room.id).toBe("daybreak");
  expect({
    completed: g.journey.completed,
    collected: [...g.collected],
    sword: g.journey.sword,
    farah: g.journey.farah,
  }).toEqual(before);
  g.save(false);
  expect(reloadCampaign(g).journey.baths.shortcut).toBe(true);
});

it.each(["baths-main", "bathworks", "upper-baths"])(
  "migrates a legacy %s checkpoint without losing story, items, or puzzle progress",
  (room) => {
    const h = reach((g) => g.room.id === room);
    h.game.checkpoint = {
      room,
      x: room === "upper-baths" ? 900 : 2100,
      y: 594,
    };
    h.game.save(false);
    const legacy = structuredClone(h.game.saved!);
    const raw = JSON.parse(JSON.stringify(legacy));
    raw.journey.version = 1;
    delete raw.journey.baths;
    if (room === "bathworks")
      raw.journey.puzzles.bathworks = {
        solved: true,
        values: [2, 1],
        remaining: 0,
        crateX: 0,
        wave: 0,
        lift: 0,
        activated: false,
      };
    raw.collected.push("baths-main-sand");
    if (room !== "baths-main") raw.collected.push("bathworks-sand");
    const migrated = parseCampaign(JSON.stringify(raw));
    expect(migrated).not.toBeNull();
    expect(migrated!.journey.version).toBe(11);
    expect(migrated!.journey.completed).toEqual(h.game.journey.completed);
    expect(migrated!.collected).toEqual(raw.collected);
    expect(migrated!.checkpoint.x).toBeLessThan(CAMPAIGN_ROOMS[room].width);
    expect(migrated!.journey.baths.drained).toBe(room !== "baths-main");
  },
);

it("finishes the mortal campaign while declining the optional maintenance route", () => {
  const h = new CampaignHarness({ immortal: false, exploreBaths: false });
  const report = h.step(240000);
  expect(report.status, report.error ?? "").toBe("passed");
  expect(report.rooms).not.toContain("maintenance");
  expect(report.collected).not.toContain("keeper-cistern-vessel");
  expect(report.rewards).toEqual({
    attunement: null,
    inscription: false,
    maxSand: 6,
  });
  expect(report.baths).toEqual({
    intake: true,
    drained: true,
    shortcut: false,
  });
  expect(report.milestones).toHaveLength(40);
});

it.each(["baths-main", "bathworks"])(
  "lets an unsolved v1 %s save use its replacement story exit",
  (room) => {
    const h = reach((g) => g.room.id === room);
    h.game.checkpoint = { room, x: 235, y: 594 };
    h.game.save(false);
    const raw = JSON.parse(JSON.stringify(h.game.saved));
    raw.journey.version = 1;
    delete raw.journey.baths;
    raw.journey.puzzles[room] = {
      solved: false,
      values: [],
      remaining: 0,
      crateX: room === "baths-main" ? 470 : 0,
      wave: 0,
      lift: 0,
      activated: false,
    };
    const save = parseCampaign(JSON.stringify(raw));
    expect(save).not.toBeNull();
    expect(save!.journey.puzzles[room]).toBeUndefined();
    const loaded = new CampaignGame({ persist: false, save: save! });
    loaded.start(true);
    if (room === "bathworks") {
      loaded.enterRoom("sluice-reservoir", undefined, { x: 255, y: 254 });
      loaded.update(1 / 120);
      loaded.interaction!.action(); // Replacement intake.
      loaded.enterRoom("bathworks", undefined, { x: 525, y: 594 });
      loaded.update(1 / 120);
      loaded.interaction!.action(); // Replacement sluice wheel.
      expect(loaded.journey.baths.drained).toBe(true);
    }
    const exit = CAMPAIGN_ROOMS[room].doors.find((d) => d.milestone === room)!;
    loaded.player.x = exit.x - 15;
    loaded.player.y = exit.y - loaded.player.h;
    loaded.interaction!.action();
    expect(loaded.room.id).toBe(
      room === "baths-main" ? "steam-chambers" : "upper-baths",
    );
    expect(loaded.journey.completed).toContain(room);
  },
);
