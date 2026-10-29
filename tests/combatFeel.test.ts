import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Game } from "../src/game/Game";
import { SWORD, swordHitbox, swordPhase } from "../src/game/combat";
import { spawnEnemies, stepEnemies } from "../src/game/enemies";
import type { EnemySpawn, Room } from "../src/game/types";
const DT = 1 / 120;
const room: Room = {
  id: "arena",
  name: "Arena",
  region: "Palace",
  chapter: "Test",
  theme: "palace",
  width: 1280,
  height: 720,
  map: { x: 0, y: 0 },
  mapLabel: "Arena",
  platforms: [{ x: 0, y: 650, w: 1280, h: 70 }],
  doors: [],
  pickups: [],
  enemies: [],
  hazards: [],
  hint: "",
};
beforeEach(() => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function setup(kind: EnemySpawn["kind"] = "guard") {
  const g = new Game({
    persist: false,
    rooms: { arena: room },
    start: { room: "arena", x: 400, y: 594 },
  });
  g.options.music = false;
  Object.assign(g.player, {
    x: 400,
    y: 594,
    grounded: true,
    face: 1,
    invincible: 0,
  });
  g.enemies = spawnEnemies(
    [{ kind, x: 460, y: 650, patrol: [0, 1280] }],
    0,
    false,
    false,
  );
  g.enemies[0].cooldown = 10;
  g.setScreen("playing");
  return g;
}
function frames(g: Game, count: number) {
  for (let i = 0; i < count; i++) g.update(DT);
}
function press(g: Game) {
  g.input.release("attack");
  g.input.press("attack");
}
it("separates anticipation, one contact per target, and harmless recovery", () => {
  const g = setup(),
    e = g.enemies[0],
    health = e.health;
  press(g);
  frames(g, 5);
  expect(swordPhase(g.player)).toBe("windup");
  expect(e.health).toBe(health);
  frames(g, 1);
  expect(swordPhase(g.player)).toBe("active");
  expect(e.health).toBe(health - 1);
  frames(g, 12);
  expect(swordPhase(g.player)).toBe("recovery");
  expect(e.health).toBe(health - 1);
  // A new target arriving during recovery is a miss.
  const late = { ...e, id: 2, attackId: -1, x: 460, health: 5 };
  g.enemies.push(late);
  frames(g, 18);
  expect(late.health).toBe(5);
});
it.each([1, -1])(
  "uses the same forward reach facing %s, with no hit behind the back",
  (face) => {
    const g = setup();
    g.player.face = face;
    const box = swordHitbox(g.player);
    expect(
      face > 0 ? box.x + box.w - g.player.x - g.player.w : g.player.x - box.x,
    ).toBe(SWORD.reach);
    const e = g.enemies[0];
    e.x = face > 0 ? 493 : 400 - 64 - e.w + 1;
    const behind = { ...e, id: 2, x: face > 0 ? 350 : 450 };
    g.enemies.push(behind);
    g.freezeTime = 1;
    press(g);
    frames(g, 7);
    expect(e.health).toBe(e.maxHealth - 2);
    expect(behind.health).toBe(behind.maxHealth);
  },
);
it("buffers only a recent press, never repeats held input, and expires early presses", () => {
  const g = setup();
  g.enemies = [];
  press(g);
  frames(g, 30);
  press(g);
  frames(g, 10);
  expect(g.attackId).toBe(2);
  frames(g, 100);
  expect(g.attackId).toBe(2);
  press(g);
  frames(g, 6);
  press(g);
  frames(g, 50);
  expect(g.attackId).toBe(3);
});
it.each(["pause", "blur", "damage", "room"])(
  "discards queued attacks at %s boundaries",
  (boundary) => {
    const g = setup();
    g.enemies = [];
    press(g);
    frames(g, 30);
    press(g);
    frames(g, 1);
    const id = g.attackId;
    if (boundary === "blur") window.dispatchEvent(new Event("blur"));
    if (boundary === "pause") g.setScreen("pause");
    if (boundary === "damage") g.damage(1);
    if (boundary === "room")
      g.enterRoom("arena", undefined, { x: 400, y: 594 });
    if (g.screen === "pause") {
      const time = g.worldTime;
      frames(g, 120);
      expect(g.worldTime).toBe(time);
      g.setScreen("playing");
    }
    frames(g, 50);
    expect(g.attackId).toBe(id);
  },
);
it("keeps Freeze/Slow costs and durations on Prince time through repeated contacts", () => {
  const g = setup();
  g.abilities.add("freeze");
  g.abilities.add("slow");
  const e = g.enemies[0];
  e.health = e.maxHealth = 100;
  g.input.press("freeze");
  press(g);
  frames(g, 1);
  expect(g.player.sand).toBe(4);
  expect(g.freezeTime).toBe(4);
  const time = g.worldTime;
  frames(g, 30);
  press(g);
  frames(g, 30);
  expect(g.freezeTime).toBeCloseTo(3.5);
  expect(g.worldTime).toBe(time);
  expect(g.player.sand).toBe(4);
  g.freezeTime = 0;
  g.input.press("slow");
  frames(g, 1);
  expect(g.player.sand).toBe(3);
  const start = g.worldTime;
  frames(g, 120);
  expect(g.slowTime).toBeCloseTo(5);
  expect(g.worldTime - start).toBeCloseTo(0.25);
});
it("cancels sword contact and its buffer on rewind without restoring enemy health or rewards", () => {
  const g = setup();
  g.abilities.add("rewind");
  frames(g, 30);
  press(g);
  frames(g, 7);
  const health = g.enemies[0].health;
  const sand = g.player.sand;
  g.input.press("rewind");
  frames(g, 15);
  expect(g.player.attack).toBe(0);
  expect(g.enemies[0].health).toBe(health);
  expect(g.player.sand).toBeLessThan(sand);
  g.input.release("rewind");
  frames(g, 60);
  expect(g.attackId).toBe(1);
});
it("uses collision-respecting short recoil, then lets the enemy attack again", () => {
  const g = setup(),
    e = g.enemies[0];
  // A wall stops recoil instead of letting a strike push through masonry.
  const wall = { x: e.x + e.w + 2, y: 0, w: 50, h: 650 };
  press(g);
  frames(g, 6);
  expect(e.hitStun).toBeGreaterThan(0);
  const damage = vi.fn();
  for (let i = 0; i < 20; i++)
    stepEnemies(
      [e],
      g.player,
      [...g.platforms, wall],
      [],
      0,
      DT,
      false,
      damage,
    );
  expect(e.x + e.w).toBeLessThanOrEqual(wall.x);
  expect(e.hitStun).toBe(0);
  e.x = 450;
  e.cooldown = 0;
  frames(g, 100);
  expect(g.player.health).toBeLessThan(g.player.maxHealth);
});
it("does not cancel committed ram or boss telegraphs, and does not repeat crowd rewards", () => {
  for (const kind of ["brute", "guardian", "rival"] as const) {
    const g = setup(kind),
      e = g.enemies[0];
    if (kind === "brute") {
      e.behavior = "ram";
      e.charge = { direction: -1, remaining: 1 };
    }
    e.telegraph = 0.8;
    g.freezeTime = 1;
    press(g);
    frames(g, 7);
    expect(e.telegraph).toBe(0.8);
    expect(e.hitStun ?? 0).toBe(0);
    if (kind === "brute") expect(e.charge?.remaining).toBe(1);
  }
  const g = setup();
  g.player.sand = 0;
  g.enemies = Array.from({ length: 3 }, (_, id) => ({
    ...g.enemies[0],
    id,
    health: 1,
  }));
  const play = vi.spyOn(g.sound, "play");
  press(g);
  frames(g, 7);
  expect(g.enemies.every((e) => e.dead)).toBe(true);
  expect(play.mock.calls.filter((c) => c[0] === "impact")).toHaveLength(1);
  const sand = g.player.sand;
  press(g);
  frames(g, 60);
  expect(g.player.sand).toBe(sand);
});
