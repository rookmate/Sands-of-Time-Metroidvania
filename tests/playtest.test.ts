import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { parseCampaign } from "../src/campaign/state";
import type { Action } from "../src/game/input";
import { spawnEnemies } from "../src/game/enemies";

beforeEach(() => {
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

function advance(game: CampaignGame, frames: number, ...keys: Action[]) {
  game.input.clear();
  for (const key of keys) game.input.press(key);
  for (let i = 0; i < frames; i++) game.update(1 / 120);
}

it("finishes all forty sections with normal damage, assist off, and reloadable checkpoints", () => {
  const harness = new CampaignHarness({ immortal: false });
  const g = harness.game;
  let checkpoints = 0;
  let tookDamage = false;
  for (let i = 0; i < 240000 && harness.status === "running"; i++) {
    harness.step();
    if (g.player.health < g.player.maxHealth) tookDamage = true;
    if (g.journey.completed.length > checkpoints) {
      const raw = JSON.stringify(g.saved);
      const save = parseCampaign(raw);
      expect(save?.journey.completed).toEqual(g.journey.completed);
      expect(save?.room).toBe(g.room.id);
      vi.stubGlobal("window", new EventTarget());
      vi.stubGlobal(
        "document",
        Object.assign(new EventTarget(), { hidden: false }),
      );
      vi.stubGlobal("localStorage", {
        getItem: (key: string) =>
          key === "sands-of-time:campaign:v2" ? raw : null,
        setItem: vi.fn(),
      });
      const resumed = new CampaignGame();
      vi.spyOn(resumed.sound, "start").mockImplementation(() => {});
      resumed.start(true);
      expect(resumed.room.id).toBe(g.room.id);
      expect(resumed.journey.completed).toEqual(g.journey.completed);
      expect(resumed.hasDagger).toBe(g.hasDagger);
      expect(resumed.screen).toBe(checkpoints === 39 ? "ending" : "playing");
      checkpoints++;
    }
  }
  expect(harness.error).toBeNull();
  expect(harness.status).toBe("passed");
  expect(g.options.assist).toBe(false);
  expect(g.deaths).toBe(0);
  expect(checkpoints).toBe(40);
  expect(tookDamage).toBe(true);
  expect(g.player.sand).toBe(0); // The Dagger has been returned to Farah.
}, 15000);

it.each(["siege", "tomb"])(
  "keeps sand empty after a %s respawn and fountain visit without the Dagger",
  (room) => {
    const g = new CampaignGame({ persist: false });
    g.begin();
    g.checkpoint = { room, x: 235, y: 594 };
    g.respawn();
    expect(g.hasDagger).toBe(false);
    expect(g.player.sand).toBe(0);
    g.interaction!.action();
    expect(g.player.sand).toBe(0);
  },
);

it("does not gain sand from a sword kill while the Dagger is missing", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.journey.sword = 3;
  g.enterRoom("pursuit", undefined, { x: 400, y: 594 });
  g.enemies = spawnEnemies(
    [{ kind: "guard", x: 450, y: 650, patrol: [400, 700] }],
    4,
    false,
    false,
  );
  advance(g, 2, "attack");
  expect(g.enemies[0].dead).toBe(true);
  expect(g.player.sand).toBe(0);
});

it.each([2165, 2170])(
  "keeps mandatory items gated when using the treasury door at x=%s",
  (x) => {
    const g = new CampaignGame({ persist: false });
    g.begin();
    g.journey.completed = ["siege"];
    g.enterRoom("treasury", undefined, { x, y: 594 });
    expect(g.interaction?.label).toBe("Continue the story");
    g.interaction!.action();
    expect(g.room.id).toBe("treasury");
    expect(g.journey.completed).toEqual(["siege"]);
  },
);

it("can leave a completed area while pressed against its right edge", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.player.x = g.room.width - g.player.w;
  g.interaction!.action();
  expect(g.room.id).toBe("treasury");
  expect(g.journey.completed).toEqual(["siege"]);
});

function hangFromBar() {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.journey.dagger = true;
  g.abilities.add("rewind");
  g.player.sand = 6;
  g.enterRoom("aviary", undefined, { x: 340, y: 594 });
  g.enemies = [];
  advance(g, 2);
  advance(g, 40, "right", "jump");
  advance(g, 160);
  expect(g.player.grip).toBe("swing-0");
  return g;
}

it("restores a recorded handhold when rewinding a jump", () => {
  const g = hangFromBar();
  advance(g, 35, "right", "jump");
  expect(g.player.grip).toBeNull();
  advance(g, 35, "rewind");
  expect(g.player.grip).toBe("swing-0");
  advance(g, 10);
  expect(g.player.grip).toBe("swing-0");
  expect(g.player.y).toBe(465);
});

it("recovers a missed jump at a safe handhold instead of returning to the fall", () => {
  const g = hangFromBar();
  advance(g, 35, "right", "jump");
  advance(g, 300);
  expect(g.screen).toBe("death");
  expect(g.deathMemory?.grip).toBe("swing-0");
  g.emergencyRewind();
  advance(g, 10);
  expect(g.screen).toBe("playing");
  expect(g.player.grip).toBe("swing-0");
  advance(g, 15, "right", "jump");
  expect(g.player.grip).toBeNull();
  expect(g.player.vy).toBeLessThan(0);
});

it("does not offer a death rewind into a gate that has closed", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.journey.dagger = true;
  g.abilities.add("rewind");
  g.player.sand = 6;
  g.enterRoom("defenses", undefined, { x: 1540, y: 594 });
  g.puzzles.state.remaining = 5;
  advance(g, 180);
  expect(g.deathMemory).toBeDefined();
  g.puzzles.state.remaining = 0;
  advance(g, 1);
  expect(g.deathMemory).toBeUndefined();
});

it("stops movement on a restored landing so the player can choose their next move", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.journey.dagger = true;
  g.abilities.add("rewind");
  g.player.sand = 6;
  g.enterRoom("way-in", undefined, { x: 100, y: 594 });
  advance(g, 180, "right");
  g.damage(100);
  expect(g.screen).toBe("death");
  g.emergencyRewind();
  const restoredX = g.player.x;
  advance(g, 30);
  expect(g.screen).toBe("playing");
  expect(g.player.x).toBe(restoredX);
  expect(g.player.grounded).toBe(true);
});

it("updates the final objective after the Vizier falls", () => {
  const h = new CampaignHarness({ scenario: "vizier", immortal: false });
  for (let i = 0; i < 30000 && !h.game.puzzles.state.solved; i++) h.step();
  expect(h.error).toBeNull();
  expect(h.game.quest.title).toBe("Return the Dagger to Farah");
  expect(h.game.toast).toContain("Return the Dagger to Farah");
});

it.each(["king", "vizier"] as const)(
  "retries the mortal %s practice fight at its own checkpoint",
  (scenario) => {
    const h = new CampaignHarness({ scenario, immortal: false });
    const g = h.game;
    const expectedRoom = scenario === "king" ? "sand-king" : "honor";
    expect(g.player.maxHealth).toBe(scenario === "king" ? 7 : 12);
    expect(g.player.sand).toBe(6);
    g.player.invincible = 0;
    g.damage(100);
    expect(g.screen).toBe("death");
    g.respawn();
    expect(g.room.id).toBe(expectedRoom);
    expect(g.player.health).toBe(g.player.maxHealth);
    const report = h.step(30000);
    expect(report.status, report.error ?? "").toBe("passed");
  },
);
