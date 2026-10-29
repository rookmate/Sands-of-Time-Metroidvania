import { spawnEnemies, stepEnemies } from "../src/game/enemies";
import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { Sound } from "../src/game/audio";
import { Renderer } from "../src/render/Renderer";
import * as regions from "../src/render/regions";
import * as scenery from "../src/render/scenery";
import * as campaign from "../src/render/campaign";
import * as actors from "../src/render/actors";
import type { Context } from "../src/render/shapes";

let reduced = false;
let canvases = 0;
const calls: {
  name: string;
  args: unknown[];
  fill?: string | CanvasGradient | CanvasPattern;
}[] = [];
function canvas() {
  const context = new Proxy({} as Context, {
    get(target, property) {
      if (property in target) return Reflect.get(target, property);
      if (String(property).startsWith("create"))
        return () => ({ addColorStop() {} });
      return (...args: unknown[]) =>
        calls.push({ name: String(property), args, fill: target.fillStyle });
    },
    set(target, property, value) {
      Reflect.set(target, property, value);
      return true;
    },
  });
  canvases++;
  return {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
}
beforeEach(() => {
  reduced = false;
  canvases = 0;
  calls.length = 0;
  vi.spyOn(Sound.prototype, "start").mockImplementation(() => {});
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      matchMedia: () => ({
        get matches() {
          return reduced;
        },
      }),
    }),
  );
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false, createElement: canvas }),
  );
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  setMaxListeners(0, window, document);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("caches both authored moments separately and reuses them on return", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.enterRoom("fallen-arcade");
  const build = vi.spyOn(scenery, "buildBackdrop");
  const r = new Renderer(canvas(), () => g);
  r.draw();
  const count = canvases;
  r.draw();
  expect(canvases).toBe(count);
  g.journey.wing.era = "ruined";
  r.draw();
  expect(build.mock.calls.map((call) => call[1])).toEqual(["intact", "ruined"]);
  g.journey.wing.era = "intact";
  r.draw();
  expect(build).toHaveBeenCalledTimes(2);
  for (const id of ["baths-main", "prison", "orrery", "depths-lock", "siege"]) {
    g.enterRoom(id);
    r.draw();
  }
  g.enterRoom("fallen-arcade");
  r.draw();
  expect(
    build.mock.calls.filter((call) => call[0].id === "fallen-arcade"),
  ).toHaveLength(3);
});

it("draws scenery behind collision surfaces, landmarks and actors without changing campaign state", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.enterRoom("prison");
  const motion = vi.spyOn(regions, "drawRegionMotion"),
    terrain = vi.spyOn(scenery, "drawPlatform"),
    objects = vi.spyOn(campaign, "drawCampaignObjects"),
    actor = vi.spyOn(actors, "drawPrince");
  const before = JSON.stringify({
    journey: g.journey,
    player: g.player,
    platforms: g.platforms,
    hazards: g.room.hazards,
    checkpoint: g.checkpoint,
    world: g.worldTime,
  });
  new Renderer(canvas(), () => g).draw();
  const order = [motion, terrain, objects, actor].map(
    (spy) => spy.mock.invocationCallOrder[0],
  );
  expect(order.every(Number.isFinite)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(
    JSON.stringify({
      journey: g.journey,
      player: g.player,
      platforms: g.platforms,
      hazards: g.room.hazards,
      checkpoint: g.checkpoint,
      world: g.worldTime,
    }),
  ).toBe(before);
});

it("honors live reduced motion while retaining authoritative hazard timing", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.enterRoom("steam-chambers");
  const motion = vi.spyOn(regions, "drawRegionMotion");
  const r = new Renderer(canvas(), () => g);
  g.worldTime = 2;
  g.visualTime = 100;
  r.draw();
  expect(motion.mock.lastCall?.[3]).toBe(2);
  reduced = true;
  calls.length = 0;
  r.draw();
  expect(motion.mock.lastCall?.[3]).toBe(0);
  // Gameplay telegraphs keep using world time, even when decorative steam stops.
  const vent = g.room.hazards[0];
  const hazardFill = () =>
    calls.find(
      (call) =>
        call.name === "fillRect" &&
        call.args[0] === vent.x &&
        call.args[1] === vent.y - 300,
    )?.fill;
  expect(hazardFill()).toBe("#d8b97f12");
  calls.length = 0;
  g.worldTime = 0.5;
  r.draw();
  expect(motion.mock.lastCall?.[3]).toBe(0);
  expect(hazardFill()).toBe("#d8b97f44");
  expect(g.worldTime).toBe(0.5);
  reduced = false;
  r.draw();
  expect(motion.mock.lastCall?.[3]).toBe(0.5);
});

it("bounds animated machinery to the viewport even in a very wide room", () => {
  const c = canvas().getContext("2d")!;
  const room = { ...CAMPAIGN_ROOMS.prison, width: 50000 };
  regions.drawRegionMotion(c, room, "intact", 12, 24439, false);
  expect(calls.length).toBeLessThan(420);
  expect(calls.filter((call) => call.name === "translate")).toHaveLength(6);
  expect(regions.regionArt(CAMPAIGN_ROOMS["crown-warden"])).toBe("prison");
  expect(regions.regionArt(CAMPAIGN_ROOMS["crown-baths"])).toBe("baths");
});

it("keeps rendering when the browser has no motion-preference API", () => {
  Reflect.deleteProperty(window, "matchMedia");
  const g = new CampaignGame({ persist: false });
  g.begin();
  expect(() => new Renderer(canvas(), () => g).draw()).not.toThrow();
});

it.each(["freezeTime", "slowTime"] as const)(
  "keeps the moving Prince and afterimages animated during %s",
  (power) => {
    const g = new CampaignGame({ persist: false });
    g.begin();
    g[power] = 2;
    g.input.press("right");
    const prince = vi.spyOn(actors, "drawPrince");
    const motion = vi.spyOn(regions, "drawRegionMotion");
    const r = new Renderer(canvas(), () => g);
    const x = g.player.x;
    for (let i = 0; i < 30; i++) g.update(1 / 120);
    const ghost = { x: g.player.x - 100, y: g.player.y, face: 1 };
    g.ghosts.push(ghost);
    g.player.dashTime = 0.1;
    r.draw();
    expect(g.player.x).toBeGreaterThan(x + 50);
    expect(g.visualTime).toBeCloseTo(0.25);
    expect(g.worldTime).toBeCloseTo(power === "freezeTime" ? 0 : 0.0625);
    expect(motion.mock.lastCall?.[3]).toBe(g.worldTime);
    expect(prince).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining(ghost),
      g.visualTime,
      true,
      g.hasDagger,
    );
    expect(prince.mock.calls.every((call) => call[2] === g.visualTime)).toBe(
      true,
    );
  },
);

it("bounds impact shake during Freeze and suppresses it for menus and motion settings", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.freezeTime = 2;
  g.shake = 0.075;
  g.options.shake = true;
  const r = new Renderer(canvas(), () => g);
  r.draw();
  const cameraX = () => {
    calls.length = 0;
    r.draw();
    return Number(calls.find((call) => call.name === "translate")?.args[0]);
  };
  g.visualTime = 0.01;
  const first = cameraX();
  g.visualTime = 0.03;
  expect(cameraX()).not.toBe(first);
  expect(Math.abs(cameraX() + g.camera.x)).toBeLessThan(1);
  reduced = true;
  expect(cameraX()).toBeCloseTo(-g.camera.x);
  reduced = false;
  g.options.shake = false;
  expect(cameraX()).toBeCloseTo(-g.camera.x);
  g.options.shake = true;
  g.setScreen("pause");
  expect(cameraX()).toBeCloseTo(-g.camera.x);
});

it("keeps ordinary windup warnings nondirectional when the Prince crosses sides", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.enterRoom("release");
  const e = spawnEnemies(
    [{ kind: "guard", x: 500, y: 650, patrol: [0, 1280] }],
    0,
    false,
    false,
  )[0];
  Object.assign(e, { face: 1, cooldown: 0 });
  Object.assign(g.player, { x: 550, y: 594 });
  const hurt = vi.fn();
  stepEnemies([e], g.player, g.platforms, [], g.tier, 1 / 120, false, hurt);
  expect(e.telegraph).toBeGreaterThan(0);
  const c = canvas().getContext("2d")!;
  const cue = () => {
    calls.length = 0;
    actors.drawEnemy(c, e, g.worldTime, false);
    // The underfoot brace marks the source. It has no arrowhead or safe side.
    return calls.filter(
      (call) =>
        ["moveTo", "lineTo"].includes(call.name) && Number(call.args[1]) > 640,
    );
  };
  const before = cue();
  expect(before.map((call) => call.args)).toEqual([
    [503, 644],
    [517, 648],
    [531, 644],
  ]);
  g.player.x = 450;
  for (let i = 0; i < 30; i++)
    stepEnemies([e], g.player, g.platforms, [], g.tier, 1 / 120, false, hurt);
  expect(e.face).toBe(1); // The simulation tracks the target without changing this pose.
  expect(cue()).toEqual(before);
  e.face = -1;
  expect(cue()).toEqual(before);
  for (let i = 0; i < 30; i++)
    stepEnemies([e], g.player, g.platforms, [], g.tier, 1 / 120, false, hurt);
  expect(hurt).toHaveBeenCalledWith(1, -1);
});
