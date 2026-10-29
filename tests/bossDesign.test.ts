import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setMaxListeners } from "node:events";
import { spawnEnemies, stepEnemies } from "../src/game/enemies";
import { bossGuards, bossLane } from "../src/game/bosses";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { reloadCampaign } from "../src/harness/CampaignTrace";
import type { Player, Projectile } from "../src/game/types";
import type { Action } from "../src/game/input";
import { Sound } from "../src/game/audio";
import { drawBossTell } from "../src/render/bosses";
import type { Context } from "../src/render/shapes";
const DT = 1 / 120;
beforeEach(() => {
  vi.spyOn(Sound.prototype, "start").mockImplementation(() => {});
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  setMaxListeners(0, window, document);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function arena(kind: "king" | "double") {
  const e = spawnEnemies(
    [{ kind, x: 800, y: 650, patrol: [0, 2000] }],
    0,
    false,
    false,
  )[0];
  e.cooldown = 0;
  const p = { x: 730, y: 594, w: 30, h: 56 } as Player;
  const shots: Projectile[] = [],
    damage = vi.fn();
  const step = (count = 1, frozen = false) => {
    for (let i = 0; i < count; i++)
      stepEnemies(
        [e],
        p,
        [{ x: 0, y: 650, w: 2000, h: 150 }],
        shots,
        0,
        DT,
        frozen,
        damage,
      );
  };
  return { e, p, shots, damage, step };
}
it("commits the King's sweep instead of tracking a cross or changing it into a projectile", () => {
  const { e, p, step, shots, damage } = arena("king");
  step();
  const lane = bossLane(e),
    face = e.face;
  p.x = e.x + 80;
  step(109);
  expect(e.face).toBe(face);
  expect(shots).toHaveLength(0);
  expect(damage).not.toHaveBeenCalled();
  expect(bossLane(e)).toEqual(lane);
  expect(e.telegraph).toBe(0);
  expect(e.cooldown).toBeGreaterThan(1);
  expect(e.vx).toBe(0);
  expect(bossGuards(e, p, false)).toBe(false);
});
it("warns both second-phase sweeps and does not add a surprise followup when health crosses during the first tell", () => {
  const a = arena("king");
  a.step();
  a.e.health = 8;
  a.step(109);
  expect(a.e.telegraph).toBe(0);
  a.step(140);
  expect(a.e.bossAttack?.followup).toBe(true);
  a.step(109);
  expect(a.e.telegraph).toBeCloseTo(0.72, 2);
  expect(a.e.bossAttack?.followup).toBe(false);
  expect(a.e.bossAttack?.duration).toBe(0.72);
  a.step(87);
  expect(a.e.telegraph).toBe(0);
  expect(a.e.cooldown).toBeGreaterThan(1);
  expect(a.damage).toHaveBeenCalledTimes(3);
});
it("makes double bolts alternate learnable low/high lanes only in phase two, with recovery after each", () => {
  const { e, p, step, shots } = arena("double");
  step();
  expect(e.bossAttack?.move).toBe("low");
  const face = e.face;
  p.x = 900;
  step(109);
  expect(shots).toHaveLength(1);
  expect(shots[0]).toMatchObject({ y: 626, vx: face * 320, radius: 8 });
  expect(e.face).toBe(face);
  e.health = 5;
  step(140);
  expect(e.bossAttack?.move).toBe("high");
  step(109);
  expect(shots[1].y).toBe(540);
  expect(shots[1].y + shots[1].radius).toBeLessThan(p.y);
  step(140);
  expect(e.bossAttack?.move).toBe("low");
});
it("holds a boss windup in Freeze, stretches it with world dt, and opens the frontal guard while frozen", () => {
  const { e, p, step } = arena("king");
  step();
  expect(bossGuards(e, p, false)).toBe(true);
  expect(bossGuards(e, p, true)).toBe(false);
  const tell = e.telegraph;
  step(120, true);
  expect(e.telegraph).toBe(tell);
  stepEnemies([e], p, [], [], 0, 0.1 * 0.38, false, () => {});
  expect(e.telegraph).toBeCloseTo(tell - 0.038);
});
it.each(["king", "vizier"] as const)(
  "resets live %s attacks on Retry and Continue without changing checkpoint or campaign state",
  (scenario) => {
    const h = new CampaignHarness({ scenario, immortal: false });
    const g = h.game;
    g.input.press("right");
    for (let i = 0; i < 5000 && !g.enemies.some((e) => e.bossAttack); i++)
      g.update(DT);
    g.input.clear();
    expect(g.enemies.some((e) => e.bossAttack)).toBe(true);
    const checkpoint = { ...g.checkpoint },
      saved = structuredClone(g.journey);
    g.player.invincible = 0;
    g.damage(100);
    expect(g.screen).toBe("death");
    g.respawn();
    expect(g.checkpoint).toEqual(checkpoint);
    expect(g.enemies.every((e) => !e.bossAttack)).toBe(true);
    const continued = reloadCampaign(g);
    expect(continued.checkpoint).toEqual(checkpoint);
    expect(continued.enemies.every((e) => !e.bossAttack)).toBe(true);
    expect(continued.journey.completed).toEqual(saved.completed);
    expect(continued.journey.rewards).toEqual(saved.rewards);
  },
);
it("uses real sword inputs to deflect once on a guard, hit its back, and open a frozen guard", () => {
  const h = new CampaignHarness({ scenario: "king", immortal: false }),
    g = h.game;
  g.update(DT);
  const e = g.enemies[0];
  Object.assign(g.player, { x: 1100, face: 1 });
  Object.assign(e, { x: 1160, cooldown: 0, face: -1 });
  g.update(DT);
  expect(e.bossAttack).toBeDefined();
  const strike = () => {
    g.input.press("attack");
    for (let i = 0; i < 8; i++) g.update(DT);
    g.input.clear();
  };
  const hp = e.health;
  strike();
  expect(e.health).toBe(hp);
  expect(e.attackId).toBe(g.attackId);
  g.input.press("freeze"); // acquired only after King; not yet usable
  g.update(DT);
  expect(g.freezeTime).toBe(0);
  // Backside fixture isolates contact; no optional upgrade is involved.
  g.input.clear();
  Object.assign(g.player, { x: 1220, face: -1, attackCooldown: 0, attack: 0 });
  strike();
  expect(e.health).toBeLessThan(hp);
  const d = new CampaignHarness({ scenario: "vizier", immortal: false }).game;
  d.update(DT);
  const clone = d.enemies.find((e) => e.kind === "double")!;
  Object.assign(d.player, { face: 1 });
  Object.assign(clone, { x: 860, cooldown: 0 });
  d.update(DT);
  const health = clone.health;
  d.input.press("freeze");
  d.update(DT);
  d.input.clear();
  expect(d.freezeTime).toBeGreaterThan(0);
  d.input.press("attack");
  for (let i = 0; i < 8; i++) d.update(DT);
  expect(clone.health).toBeLessThan(health);
});
it("renders the exact committed sweep rectangle, countdown and opening without depending on animation time", () => {
  const { e, step } = arena("king");
  step();
  const calls: { name: string; args: unknown[] }[] = [];
  const c = new Proxy({} as Context, {
    get:
      (_, name) =>
      (...args: unknown[]) =>
        calls.push({ name: String(name), args }),
    set: () => true,
  });
  drawBossTell(c, e, false);
  const r = bossLane(e);
  expect(calls).toContainEqual({
    name: "strokeRect",
    args: [r.x, r.y, r.w, r.h],
  });
  expect(
    calls.some(
      (c) => c.name === "fillText" && c.args[0] === "Low sweep · jump or flank",
    ),
  ).toBe(true);
  e.telegraph = 0;
  calls.length = 0;
  drawBossTell(c, e, false);
  expect(calls.some((c) => c.name === "strokeRect")).toBe(false);
  expect(
    calls.some(
      (c) => c.name === "fillText" && c.args[0] === "Opening · strike",
    ),
  ).toBe(true);
});

it.each(["king", "vizier"] as const)(
  "wins the mortal %s encounter with depleted sand, no optional upgrades, and ordinary defensive inputs",
  (scenario) => {
    const g = new CampaignHarness({ scenario, immortal: false }).game;
    g.player.sand = 0;
    const seen = new Set<string>();
    let previous: Action[] = [];
    for (
      let i = 0;
      i < 12000 && !g.puzzles.state.solved && g.screen === "playing";
      i++
    ) {
      const e = g.enemies.find((e) => !e.dead && !e.protected);
      const actions: Action[] = [];
      if (e) {
        const target = e.x - (e.kind === "king" && e.telegraph > 0 ? 235 : 55);
        const dx = target - g.player.x;
        if (Math.abs(dx) > 7) actions.push(dx > 0 ? "right" : "left");
        else if (g.player.face < 0) actions.push("right");
        if (
          e.kind === "double" &&
          e.bossAttack?.move === "low" &&
          e.telegraph > 0 &&
          e.telegraph < 0.23 &&
          g.player.grounded
        )
          actions.push("jump");
        if (i % 40 === 0) actions.push("attack");
        if (e.bossAttack)
          seen.add(`${e.phase}:${e.bossAttack.move}:${e.bossAttack.duration}`);
      }
      for (const a of previous) if (!actions.includes(a)) g.input.release(a);
      for (const a of actions) if (!previous.includes(a)) g.input.press(a);
      previous = actions;
      g.update(DT);
    }
    expect(g.screen).toBe("playing");
    expect(g.puzzles.state.solved).toBe(true);
    expect(g.player.health).toBeGreaterThan(0);
    expect(g.journey.rewards.attunement).toBeNull();
    expect(g.journey.echoes.solved).toEqual([]);
    expect(g.journey.wing.discovered).toBe(false);
    expect(seen).toContain(scenario === "king" ? "1:sweep:0.72" : "1:high:0.9");
    const defeated = [...g.journey.defeated],
      sand = g.player.sand;
    for (let i = 0; i < 120; i++) g.update(DT);
    expect(g.journey.defeated).toEqual(defeated);
    expect(new Set(defeated).size).toBe(defeated.length);
    expect(g.player.sand).toBe(sand);
  },
);
it("prevents passive frontal arrow kills while retaining Farah's recovery hits", () => {
  const g = new CampaignHarness({ scenario: "king", immortal: false }).game;
  // At the practice checkpoint the Prince and Farah are outside the King's
  // patrol reach. Waiting cannot solve the boss for them.
  for (let i = 0; i < 120 * 32; i++) g.update(DT);
  const e = g.enemies[0];
  expect(e.dead).toBe(false);
  expect(e.health).toBe(e.maxHealth);
  expect(g.companion).not.toBeNull();
  expect(bossGuards(e, g.companion!, false)).toBe(true);
  e.bossAttack = { move: "sweep", duration: 0.9, followup: false };
  e.telegraph = 0;
  e.cooldown = 1.15;
  for (let i = 0; i < 120; i++) g.update(DT);
  expect(e.health).toBeLessThan(e.maxHealth);
});

it("draws the keeper's warning and live jet, then removes the danger outline throughout safe recovery", async () => {
  const { drawDepths } = await import("../src/render/depths");
  const g = new CampaignHarness({ immortal: false }).game;
  g.enterRoom("depths-heart");
  g.depths.active = true;
  const calls: { name: string; args: unknown[] }[] = [];
  const c = new Proxy({} as Context, {
    get:
      (_, name) =>
      (...args: unknown[]) =>
        calls.push({ name: String(name), args }),
    set: () => true,
  });
  for (const clock of [0.75, 1.75, 3]) {
    g.depths.clock = clock;
    calls.length = 0;
    drawDepths(c, g);
    const jet = g.depths.jet!;
    expect(
      calls.some((c) => c.name === "strokeRect" && c.args[0] === jet.x),
    ).toBe(clock < 2.5);
    if (clock === 0.75)
      expect(calls).toContainEqual({
        name: "fillRect",
        args: [jet.x, jet.y - 13, jet.w / 2, 5],
      });
  }
});
it("keeps Sahir's opening cue out of unaccepted and released appearances", async () => {
  const { drawRival } = await import("../src/render/rival");
  const labels: unknown[] = [];
  const c = new Proxy({} as Context, {
    get:
      (_, name) =>
      (...args: unknown[]) => {
        if (name === "measureText") return { width: 120 };
        if (name === "fillText") labels.push(args[0]);
      },
    set: () => true,
  });
  const e = {
    x: 820,
    y: 562,
    w: 50,
    h: 88,
    face: -1,
    hitFlash: 0,
    telegraph: 0,
    cooldown: 0,
  };
  drawRival(c, e, false);
  expect(labels).not.toContain("Opening · strike");
  drawRival(c, { ...e, cooldown: 1.6 }, false);
  expect(labels).toContain("Opening · strike");
});

it("keeps Farah safe through a real Slow/flank outside the King's committed sweep", () => {
  const g = new CampaignHarness({ scenario: "king", immortal: false }).game;
  g.input.press("right");
  for (let i = 0; i < 800 && !g.enemies.some((e) => e.telegraph > 0); i++)
    g.update(DT);
  const e = g.enemies[0],
    f = g.companion!,
    health = f.health;
  expect(e.face).toBe(-1);
  g.input.press("slow");
  g.update(DT);
  g.input.release("slow");
  expect(g.slowTime).toBeGreaterThan(0);
  for (let i = 0; i < 200 && g.player.x < e.x + 150; i++) g.update(DT);
  g.input.clear();
  // The delayed following trail catches up before the slowed tell ends.
  for (let i = 0; i < 600 && e.telegraph > 0; i++) g.update(DT);
  expect(f.x).toBeGreaterThan(bossLane(e).x + bossLane(e).w);
  expect(f.health).toBe(health);
  expect(e.telegraph).toBe(0);
});
it.each([false, true])(
  "damages Farah in the actual release area of either sweep, followup=%s",
  (followup) => {
    const g = new CampaignHarness({ scenario: "king", immortal: false }).game;
    g.update(DT);
    const e = g.enemies[0],
      f = g.companion!;
    Object.assign(e, {
      x: 1300,
      face: -1,
      health: 8,
      telegraph: DT / 2,
      bossAttack: {
        move: "sweep",
        duration: followup ? 0.72 : 0.9,
        followup: !followup,
      },
    });
    Object.assign(f, { x: 1240, y: 594, holding: { x: 1255, y: 650 } });
    const health = f.health;
    g.update(DT);
    expect(f.health).toBe(health - 1);
    expect(e.telegraph > 0).toBe(!followup);
    expect(e.bossImpact).toBeUndefined();
    // Pausing the world through rewind cannot repeat the consumed release.
    g.input.press("rewind");
    for (let i = 0; i < 200; i++) g.update(DT);
    expect(f.health).toBe(health - 1);
  },
);
