import { beforeEach, describe, expect, it, vi } from "vitest";
import { Game } from "../src/game/Game";
import { ROOMS, START, validateWorld } from "../src/game/world";
import {
  ABILITIES,
  ORDER,
  enemyStats,
  hasRequirement,
  objective,
} from "../src/game/progression";
import { parseSave } from "../src/game/storage";
import { platformPositions, stepPlayer } from "../src/game/physics";
import type { Ability, SaveData, StoryFlag } from "../src/game/types";

const DT = 1 / 120;
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});
function game() {
  const g = new Game();
  g.options.music = false;
  g.options.sfx = false;
  g.enterRoom(START.room, undefined, START);
  g.setScreen("playing");
  return g;
}
function tick(g: Game, seconds: number) {
  for (let i = 0; i < seconds / DT; i++) g.update(DT);
}
function place(g: Game, x: number, floor: number) {
  Object.assign(g.player, {
    x,
    y: floor - g.player.h,
    vx: 0,
    vy: 0,
    grounded: true,
    coyote: 0.11,
    wall: 0,
    ledge: null,
  });
  g.input.clear();
}
function jump(g: Game, target: number, dash = false, dashFrame = 30) {
  g.input.press("jump");
  let landed = false,
    minimumY = g.player.y,
    minimumSand = g.player.sand;
  for (let i = 0; i < 190; i++) {
    if (Math.abs(target - g.player.x) > 9) {
      const direction = target > g.player.x ? "right" : "left";
      g.input.release(direction === "right" ? "left" : "right");
      g.input.press(direction);
    } else {
      g.input.release("left");
      g.input.release("right");
    }
    if (dash && i === dashFrame) g.input.press("dash");
    g.update(DT);
    if (g.screen === "story") g.closeStory();
    minimumY = Math.min(minimumY, g.player.y);
    minimumSand = Math.min(minimumSand, g.player.sand);
    if (i > 12 && g.player.grounded) {
      landed = true;
      break;
    }
  }
  g.input.clear();
  return {
    landed,
    minimumY,
    minimumSand,
    x: g.player.x,
    feet: g.player.y + g.player.h,
  };
}

describe("connected palace and guided progression", () => {
  it("has valid unique content and a return connection for every passage", () => {
    expect(validateWorld()).toEqual([]);
    for (const room of Object.values(ROOMS))
      for (const door of room.doors) {
        expect(
          ROOMS[door.to].doors.some((d) => d.to === room.id),
          `${room.id} → ${door.to} has no return route`,
        ).toBe(true);
      }
  });
  it("makes each next power reachable without granting a future power", () => {
    const abilities = new Set<Ability>(),
      flags = new Set<StoryFlag>();
    const reachable = () => {
      const visited = new Set(["palace"]),
        queue = ["palace"];
      for (const id of queue)
        for (const door of ROOMS[id].doors) {
          if (
            !visited.has(door.to) &&
            hasRequirement(door.requires, abilities, flags)
          ) {
            visited.add(door.to);
            queue.push(door.to);
          }
        }
      return visited;
    };
    for (const ability of ORDER) {
      const room = Object.values(ROOMS).find((r) =>
        r.pickups.some((p) => p.kind === ability),
      )!;
      expect(reachable().has(room.id), `Cannot reach ${ability}`).toBe(true);
      if (ability === "rewind") expect(reachable().has("tower")).toBe(false);
      if (ability === "slow") expect(reachable().has("cistern")).toBe(false);
      abilities.add(ability);
      if (ability === "freeze") flags.add("water");
    }
    expect(reachable().has("corrupted")).toBe(true);
    expect(reachable().has("throne")).toBe(false);
    flags.add("guardian");
    expect(reachable().size).toBe(12);
  });
  it("keeps the critical objective in sync with every milestone", () => {
    const g = game();
    expect(g.quest.room).toBe("gardens");
    g.abilities.add("rewind");
    expect(g.quest.room).toBe("observatory");
    g.abilities.add("slow");
    expect(g.quest.room).toBe("cistern");
    g.abilities.add("freeze");
    expect(g.quest.room).toBe("water-gardens");
    g.flags.add("water");
    expect(g.quest.room).toBe("upper");
    g.abilities.add("dash");
    expect(g.quest.room).toBe("corrupted");
    g.flags.add("guardian");
    expect(g.quest.room).toBe("throne");
    g.flags.add("victory");
    expect(objective(g.abilities, g.flags).room).toBe("palace");
  });
});

describe("acrobatic movement", () => {
  it("holds simulation and menu input while mobile portrait mode blocks play", () => {
    const g = game();
    const x = g.player.x;
    const worldTime = g.worldTime;
    g.orientationBlocked = true;
    g.input.press("right");
    g.menuKey("map");
    tick(g, 1);
    expect(g.screen).toBe("playing");
    expect(g.player.x).toBe(x);
    expect(g.playTime).toBe(0);
    expect(g.worldTime).toBe(worldTime);
    g.orientationBlocked = false;
    tick(g, 0.2);
    expect(g.player.x).toBeGreaterThan(x);
    expect(g.playTime).toBeGreaterThan(0);
  });
  it("clears a thin terrace at full running speed without hitting its underside", () => {
    const g = game();
    g.enterRoom("gardens");
    g.enemies = [];
    place(g, 290, 650);
    g.player.vx = 325;
    const result = jump(g, 410);
    expect(result.feet).toBeCloseTo(530);
  });
  it("accelerates, jumps over a courtyard gap, and lands without tunneling", () => {
    const g = game();
    g.enemies = [];
    place(g, 790, 650);
    const result = jump(g, 1040);
    expect(result.landed).toBe(true);
    expect(result.x).toBeGreaterThan(950);
    expect(result.feet).toBeCloseTo(650);
    expect(result.minimumY).toBeLessThan(500);
  });
  it.each([
    ["gardens", 290, 650, 410, 530],
    ["gardens", 445, 530, 655, 430],
    ["gardens", 730, 430, 955, 350],
    ["tower", 190, 1370, 310, 1240],
    ["tower", 395, 1240, 585, 1110],
    ["tower", 690, 1110, 875, 980],
    ["tower", 835, 980, 670, 850],
    ["tower", 555, 850, 415, 720],
    ["tower", 420, 720, 600, 590],
    ["tower", 700, 590, 900, 460],
    ["tower", 985, 460, 1160, 330],
    ["observatory", 310, 650, 435, 530],
    ["observatory", 485, 530, 750, 425],
    ["upper", 320, 650, 455, 520],
    ["upper", 530, 520, 740, 400],
    ["upper", 850, 400, 1080, 300],
    ["water-gardens", 400, 650, 525, 525],
    ["water-gardens", 570, 525, 795, 425],
    ["water-gardens", 870, 425, 1120, 525],
  ])(
    "allows the %s jump from %i/%i to %i/%i",
    (room, x, floor, target, destination) => {
      const g = game();
      g.enterRoom(String(room));
      g.enemies = [];
      place(g, Number(x), Number(floor));
      const result = jump(g, Number(target));
      expect(result.landed, JSON.stringify(result)).toBe(true);
      expect(result.feet, JSON.stringify(result)).toBeCloseTo(
        Number(destination),
      );
    },
  );
  it("uses dash to cross the corrupted causeway", () => {
    const g = game();
    g.enterRoom("corrupted");
    g.enemies = [];
    g.abilities.add("dash");
    place(g, 505, 520);
    const result = jump(g, 1015, true);
    expect(result.landed, JSON.stringify(result)).toBe(true);
    expect(result.x).toBeGreaterThan(900);
    expect(result.minimumSand).toBeLessThan(6);
  });
  it.each([
    [420, 520, 810, 570, 30],
    [960, 570, 1470, 650, 47],
  ])(
    "crosses the final bridge from %i/%i to %i/%i",
    (x, floor, target, destination, dashFrame) => {
      const g = game();
      g.enterRoom("bridge");
      g.enemies = [];
      g.abilities.add("dash");
      place(g, x, floor);
      const result = jump(g, target, true, dashFrame);
      expect(result.landed, JSON.stringify(result)).toBe(true);
      expect(result.feet).toBeCloseTo(destination);
      expect(result.x).toBeGreaterThan(target - 80);
    },
  );
  it("crosses the cistern using Slow Time and the rising water lift", () => {
    const g = game();
    g.enterRoom("cistern");
    g.enemies = [];
    g.abilities.add("slow");
    place(g, 405, 710);
    g.input.press("slow");
    const first = jump(g, 605);
    expect(first.landed, JSON.stringify(first)).toBe(true);
    expect(first.feet).toBeCloseTo(620);
    g.worldTime = 0.5;
    g.platforms = platformPositions(g.room.platforms, g.worldTime);
    place(g, 720, 620);
    const second = jump(g, 1010);
    expect(second.landed, JSON.stringify(second)).toBe(true);
    expect(second.feet).toBeCloseTo(575);
    g.worldTime = 0.5;
    g.platforms = platformPositions(g.room.platforms, g.worldTime);
    place(g, 1070, 575);
    const third = jump(g, 1250);
    expect(third.landed, JSON.stringify(third)).toBe(true);
    expect(third.feet).toBeCloseTo(g.platforms[5].y);
    g.worldTime = 3.5;
    g.platforms = platformPositions(g.room.platforms, g.worldTime);
    place(g, 1290, g.platforms[5].y);
    const final = jump(g, 1580);
    expect(final.landed, JSON.stringify(final)).toBe(true);
    expect(final.feet).toBeCloseTo(430);
    expect(g.abilities.has("freeze")).toBe(true);
  });
  it("carries the Prince on a moving platform without drift or falling through", () => {
    const g = game();
    g.enterRoom("cistern");
    g.enemies = [];
    place(g, 550, 620);
    const startX = g.player.x;
    tick(g, 0.5);
    expect(g.player.x).toBeGreaterThan(startX + 90);
    expect(g.player.grounded).toBe(true);
    expect(g.player.y + 56).toBeCloseTo(620);
  });
  it("allows a coyote jump shortly after leaving an edge", () => {
    const g = game();
    const p = g.player;
    place(g, 80, 400);
    p.grounded = false;
    p.coyote = 0.08;
    g.input.press("jump");
    stepPlayer(p, g.input, [], DT, 1280);
    expect(p.vy).toBeLessThan(-650);
  });
  it("buffers a jump pressed before landing", () => {
    const g = game();
    place(g, 190, 650);
    g.player.y -= 7;
    g.player.grounded = false;
    g.player.coyote = 0;
    g.player.vy = 280;
    g.input.press("jump");
    tick(g, 0.08);
    expect(g.player.vy).toBeLessThan(-500);
    expect(g.player.y).toBeLessThan(580);
  });
  it("wall-jumps away from contact and climbs a caught ledge", () => {
    const g = game();
    place(g, 170, 450);
    g.player.grounded = false;
    g.player.coyote = 0;
    g.player.wall = 1;
    g.input.press("jump");
    stepPlayer(
      g.player,
      g.input,
      [{ x: 200, y: 200, w: 50, h: 400 }],
      DT,
      1280,
    );
    expect(g.player.vx).toBeLessThan(0);
    expect(g.player.vy).toBeLessThan(-600);
    g.input.clear();
    g.player.ledge = { x: 210, y: 200 };
    g.input.press("jump");
    stepPlayer(
      g.player,
      g.input,
      [{ x: 200, y: 200, w: 50, h: 400 }],
      DT,
      1280,
    );
    expect(g.player.ledge).toBeNull();
    expect(g.player.y).toBeLessThan(150);
  });
});

describe("time, combat, and persistent progression", () => {
  it("rewinds position and health while sand continues to decrease", () => {
    const g = game();
    g.abilities.add("rewind");
    g.input.press("right");
    tick(g, 0.65);
    g.input.release("right");
    const laterX = g.player.x;
    g.player.health = 2;
    g.input.press("rewind");
    tick(g, 0.2);
    g.input.release("rewind");
    expect(g.player.x).toBeLessThan(laterX - 50);
    expect(g.player.health).toBe(6);
    expect(g.player.sand).toBeLessThan(6);
    expect(g.collected.size).toBe(0);
  });
  it("does not duplicate consumed clouds by rewinding", () => {
    const g = game();
    g.abilities.add("rewind");
    g.player.sand = 2;
    tick(g, 0.8);
    place(g, 605, 525);
    tick(g, 0.02);
    expect(g.collected.has("palace-sand")).toBe(true);
    const afterPickup = g.player.sand;
    g.input.press("rewind");
    tick(g, 0.15);
    g.input.release("rewind");
    place(g, 605, 525);
    tick(g, 0.02);
    expect(g.player.sand).toBeLessThan(afterPickup);
  });
  it("slows moving platforms and freezes enemies, while the Prince moves normally", () => {
    const g = game();
    g.abilities.add("slow");
    g.abilities.add("freeze");
    g.input.press("slow");
    tick(g, 1);
    expect(g.worldTime).toBeCloseTo(0.25, 1);
    g.input.press("freeze");
    const x = g.enemies[0].x,
      time = g.worldTime;
    g.input.press("right");
    tick(g, 0.5);
    expect(g.enemies[0].x).toBe(x);
    expect(g.worldTime).toBeCloseTo(time);
    expect(g.player.x).toBeGreaterThan(300);
    expect(platformPositions(ROOMS.cistern.platforms, 1)[3].x).not.toBe(
      ROOMS.cistern.platforms[3].x,
    );
  });
  it("rejects locked powers and unaffordable powers without spending sand", () => {
    const g = game();
    g.input.press("freeze");
    tick(g, DT);
    expect(g.player.sand).toBe(6);
    expect(g.freezeTime).toBe(0);
    g.abilities.add("freeze");
    g.player.sand = 1;
    g.input.release("freeze");
    g.input.press("freeze");
    tick(g, DT);
    expect(g.freezeTime).toBe(0);
    expect(g.player.sand).toBe(1);
    expect(ABILITIES.freeze.cost).toBe(2);
  });
  it("recovers an emergency grain so traversal never requires a restart", () => {
    const g = game();
    g.player.sand = 0;
    tick(g, 7.1);
    expect(g.player.sand).toBe(1);
  });
  it("only damages each target once per strike and doubles damage under Sand Prison", () => {
    const g = game();
    place(g, 1250, 650);
    g.player.face = 1;
    const enemy = g.enemies[0];
    enemy.x = 1310;
    enemy.cooldown = 10;
    g.input.press("attack");
    tick(g, 0.2);
    expect(enemy.health).toBe(2);
    tick(g, 0.2);
    g.freezeTime = 4;
    g.input.release("attack");
    g.input.press("attack");
    tick(g, 0.2);
    expect(enemy.dead).toBe(true);
  });
  it("scales old rooms and adds stronger types after milestones", () => {
    const g = game();
    expect(g.enemies.length).toBe(1);
    const original = g.enemies[0].health;
    g.abilities = new Set(ORDER);
    g.enterRoom("palace");
    expect(g.enemies.length).toBe(2);
    expect(g.enemies[0].health).toBeGreaterThan(original);
    expect(enemyStats(4, "guard").reward).toBeLessThan(
      enemyStats(0, "guard").reward,
    );
  });
  it("opens the garden event, courtyard lift, and final gates in order", () => {
    const g = game();
    g.abilities = new Set(["rewind", "slow", "freeze"]);
    g.enterRoom("water-gardens");
    place(g, 1115, 525);
    g.interaction!.action();
    expect(g.flags.has("water")).toBe(true);
    g.closeStory();
    g.enterRoom("palace");
    place(g, 65, 650);
    expect(g.interaction?.label).toBe("Palace lift");
    g.interaction!.action();
    expect(g.room.id).toBe("upper");
    g.enterRoom("corrupted");
    place(g, 1795, 650);
    g.interaction!.action();
    expect(g.room.id).toBe("corrupted");
    g.flags.add("guardian");
    g.interaction!.action();
    expect(g.room.id).toBe("bridge");
  });
  it("saves at a fountain, survives death, and restores abilities after reload", () => {
    const g = game();
    g.abilities.add("rewind");
    g.collected.add("memory-rewind");
    place(g, 285, 650);
    g.player.health = 1;
    g.player.sand = 0;
    g.interaction!.action();
    expect(g.player.health).toBe(6);
    expect(g.player.sand).toBe(6);
    g.player.invincible = 0;
    g.damage(10);
    expect(g.screen).toBe("death");
    g.respawn();
    expect(g.room.id).toBe("palace");
    expect(g.player.x).toBe(285);
    const reloaded = new Game();
    expect(reloaded.saved?.abilities).toContain("rewind");
    expect(reloaded.saved?.checkpoint.x).toBe(285);
  });
  it("ends the story on the Vizier’s defeat and preserves victory on return", () => {
    const g = game();
    g.abilities = new Set(ORDER);
    g.flags.add("guardian");
    g.enterRoom("throne");
    const boss = g.enemies[0];
    boss.health = 1;
    boss.x = 850;
    place(g, 790, 650);
    g.player.face = 1;
    g.input.press("attack");
    tick(g, 0.05);
    expect(g.screen).toBe("ending");
    expect(g.flags.has("victory")).toBe(true);
    expect(g.saved?.flags).toContain("victory");
    g.enterRoom("throne");
    expect(g.enemies).toEqual([]);
  });
});

describe("save boundary", () => {
  const valid: SaveData = {
    version: 1,
    room: "palace",
    checkpoint: { x: 285, y: 594 },
    abilities: ["rewind"],
    flags: [],
    collected: ["memory-rewind"],
    visited: ["palace", "gardens"],
    maxHealth: 6,
    playTime: 30,
    deaths: 0,
  };
  it("accepts a versioned journey", () =>
    expect(parseSave(JSON.stringify(valid))).toEqual(valid));
  it.each([
    null,
    "{",
    "{}",
    JSON.stringify({ ...valid, room: "missing" }),
    JSON.stringify({ ...valid, checkpoint: { x: -20, y: 0 } }),
    JSON.stringify({ ...valid, abilities: ["fly"] }),
    JSON.stringify({ ...valid, flags: ["unknown"] }),
    JSON.stringify({ ...valid, maxHealth: 100 }),
  ])("discards invalid saves safely", (raw) =>
    expect(parseSave(raw)).toBeNull(),
  );
  it("does not crash when storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("Denied");
      },
      setItem: () => {
        throw new Error("Quota");
      },
    });
    const g = game();
    expect(() => g.save()).not.toThrow();
    expect(g.toast).toContain("unavailable");
  });
});
