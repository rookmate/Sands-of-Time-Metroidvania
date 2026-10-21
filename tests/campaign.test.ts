import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Harness } from "../src/harness/Harness";
import { ORDER } from "../src/game/progression";
import { ROOMS } from "../src/game/world";

let storage: Map<string, string>;
beforeEach(() => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  storage = new Map([
    ["sands-of-time:journey:v1", "existing player save"],
    ["sands-of-time:options:v1", '{"music":true}'],
  ]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

function finish(harness: Harness) {
  const report = harness.step(120000);
  expect(report.status, report.error ?? JSON.stringify(report)).toBe("passed");
  expect(report.deaths).toBe(0);
  expect(report.health).toBeGreaterThan(0);
  return report;
}

it("finishes the mortal main route using movement, combat, powers, and interactions", () => {
  const harness = new Harness({ immortal: false, explore: false });
  const report = finish(harness);
  expect(harness.game.screen).toBe("ending");
  expect(report.abilities).toEqual(ORDER);
  expect(report.flags).toEqual(["water", "guardian", "victory"]);
  expect(report.bosses.map((b) => b.defeated)).toEqual([true, true]);
  expect(harness.game.saved?.flags).toContain("victory");
});

it("plays all twelve rooms, collects every permanent upgrade, and defeats both bosses while immortal", () => {
  const harness = new Harness();
  const report = finish(harness);
  expect(report.rooms.sort()).toEqual(Object.keys(ROOMS).sort());
  expect(report.abilities).toEqual(ORDER);
  expect(report.powersUsed.sort()).toEqual([...ORDER].sort());
  expect(report.collected).toEqual(
    expect.arrayContaining(["baths-heart", "archive-heart", "palace-heart"]),
  );
  expect(report.bosses).toHaveLength(2);
  for (const boss of report.bosses) {
    expect(boss.defeated).toBe(true);
    expect(boss.phases).toEqual([0, 1]);
    expect(boss.telegraphs).toBeGreaterThan(0);
  }
  expect(harness.game.player.maxHealth).toBe(9);
  expect(harness.game.screen).toBe("ending");
  expect([...storage.values()]).toEqual([
    "existing player save",
    '{"music":true}',
  ]);
  console.info("Campaign harness report", JSON.stringify(report));
});

it.each(["guardian", "vizier"] as const)(
  "runs the %s encounter with live attacks and both phases",
  (scenario) => {
    const harness = new Harness({ scenario });
    const report = finish(harness);
    expect(report.bosses[0].defeated).toBe(true);
    expect(report.bosses[0].phases).toEqual([0, 1]);
    expect(report.bosses[0].telegraphs).toBeGreaterThan(1);
    if (scenario === "vizier")
      expect(report.bosses[0].projectiles).toBeGreaterThan(3);
    expect(report.health).toBe(6);
    expect(
      harness.game.flags.has(scenario === "vizier" ? "victory" : "guardian"),
    ).toBe(true);
  },
);

it("pauses, single-steps, and resumes without advancing the simulation while paused", () => {
  const harness = new Harness();
  harness.pause();
  expect(harness.status).toBe("paused");
  expect(harness.report().frames).toBe(0);
  harness.step();
  expect(harness.status).toBe("paused");
  expect(harness.report().frames).toBe(1);
  harness.resume();
  expect(harness.status).toBe("running");
  harness.step(60);
  expect(harness.report().frames).toBe(61);
});

it("ignores lethal damage and knockback in immortal mode", () => {
  const harness = new Harness({ scenario: "vizier" });
  const g = harness.game;
  g.player.invincible = 0;
  const before = { health: g.player.health, vx: g.player.vx, vy: g.player.vy };
  g.damage(100, -1);
  expect({ health: g.player.health, vx: g.player.vx, vy: g.player.vy }).toEqual(
    before,
  );
  expect(g.screen).toBe("playing");
});

it("never reads or writes the player's persistent save or settings", () => {
  const read = vi.spyOn(localStorage, "getItem");
  const write = vi.spyOn(localStorage, "setItem");
  const harness = new Harness({ scenario: "guardian" });
  harness.game.setOption("music", true);
  finish(harness);
  expect(read).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
  expect(harness.game.saved?.flags).toContain("guardian");
});

it("fails with the route step, room, and coordinates when traversal gets stuck", () => {
  const harness = new Harness();
  harness.game.player.wallLock = 100;
  const report = harness.step(2000);
  expect(report.status).toBe("failed");
  expect(report.error).toContain("Could not walk to 455");
  expect(report.error).toContain("room palace");
  expect(report.error).toContain("x=");
  const frame = report.frames;
  expect(harness.step().frames).toBe(frame);
});

it("treats a missed platform and falling into a pit as failures even while immortal", () => {
  const harness = new Harness();
  harness.game.player.y = harness.game.room.height + 100;
  expect(harness.step().status).toBe("failed");
  expect(harness.report().error).toContain("fell out of the room");
});
