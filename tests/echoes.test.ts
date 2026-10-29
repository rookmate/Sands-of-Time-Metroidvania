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
function advance(h: CampaignHarness, until: (g: CampaignGame) => boolean) {
  for (let i = 0; i < 100000 && !until(h.game) && h.status !== "failed"; i++)
    h.step();
  expect(h.status, h.error ?? "").not.toBe("failed");
  expect(until(h.game)).toBe(true);
}
function reach(
  room = "echo-step",
  predicate: (g: CampaignGame) => boolean = () => true,
) {
  const h = new CampaignHarness({ immortal: false, exploreEchoes: true });
  advance(h, (g) => g.room.id === room && predicate(g));
  return h;
}
function tick(g: CampaignGame, frames = 1, ...actions: Action[]) {
  g.input.clear();
  for (const a of actions) g.input.press(a);
  for (let i = 0; i < frames; i++) g.update(1 / 120);
  g.input.clear();
}

it.each([undefined, 42])(
  "solves three physical echo chambers in a mortal campaign, returns, finishes all anchors and replays inputs (seed %s)",
  (seed) => {
    const h = new CampaignHarness({
      immortal: false,
      exploreEchoes: true,
      resilienceSeed: seed,
      regionOrder: seed === undefined ? "gardens-first" : "sky-first",
    });
    const report = h.step(240000);
    expect(report.status, report.error ?? "").toBe("passed");
    expect(h.game.journey.echoes.solved).toEqual([
      "echo-step",
      "echo-bell",
      "echo-span",
    ]);
    expect(report.milestones).toHaveLength(40);
    const replay = CampaignTrace.replay(
      new CampaignHarness({ immortal: false }).game,
      h.trace.events,
    );
    expect(replay.journey).toEqual(h.game.journey);
    expect(replay.player).toEqual(h.game.player);
  },
);

it("charges once, bounds recording/replay, replaces, cancels, pauses, and leaves normal rewind intact", () => {
  const h = reach("echo-step", (g) => g.echoes.phase === "recording");
  const g = h.game;
  const paid = g.player.sand;
  expect(paid).toBe(5);
  tick(g, 959);
  expect(g.echoes.phase).toBe("playing");
  expect(g.echoes.frames).toBe(960);
  const actor = structuredClone(g.echoes.actor);
  g.setScreen("pause");
  tick(g, 120);
  expect(g.echoes.actor).toEqual(actor);
  g.setScreen("playing");
  tick(g, 1, "echo");
  expect(g.echoes.phase).toBe("recording");
  expect(g.echoes.actor).toBeNull();
  expect(g.echoes.frames).toBe(1);
  expect(g.player.sand).toBe(paid - 1);
  tick(g, 1, "cancelEcho");
  expect(g.echoes.frames).toBe(0);
  expect(g.player.sand).toBe(paid - 1);
  tick(g, 1, "echo");
  tick(g, 120);
  tick(g, 1, "echo");
  tick(g, 2881);
  expect(g.echoes.phase).toBe("idle");
  tick(g, 1, "echo");
  tick(g, 120, "right");
  const x = g.player.x;
  tick(g, 10, "rewind");
  expect(g.echoes.phase).toBe("idle");
  expect(g.player.x).toBeLessThan(x);
});

it("cannot collect, fight, dispatch story interactions or retain an echo outside its room", () => {
  const h = reach("echo-step", (g) => g.echoes.phase === "recording");
  const g = h.game;
  const journey = structuredClone(g.journey);
  const collected = [...g.collected];
  tick(g, 120, "attack", "interact");
  tick(g, 1, "echo");
  tick(g, 120);
  expect(g.journey).toEqual(journey);
  expect([...g.collected]).toEqual(collected);
  expect(g.echoes.actor?.attack).toBe(0);
  g.enterRoom("echo-bell");
  expect(g.echoes.phase).toBe("idle");
  expect(g.echoes.frames).toBe(0);
  tick(g, 1, "echo");
  expect(g.echoes.phase).toBe("idle"); // entry is airborne until its first physics step
  g.enterRoom("echo-gallery");
  tick(g, 120);
  tick(g, 1, "echo");
  expect(g.echoes.phase).toBe("idle");
});

it("recovers a missed span on the safe floor and retries without retaining a tape", () => {
  const h = reach(
    "echo-span",
    (g) =>
      g.echoes.phase === "playing" &&
      g.player.grounded &&
      g.player.x > 700 &&
      g.player.x < 900,
  );
  const g = h.game;
  expect(g.player.y + g.player.h).toBe(420);
  tick(g, 1, "cancelEcho");
  tick(g, 180);
  expect(g.player.y + g.player.h).toBe(650);
  expect(g.screen).toBe("playing");
  expect(g.echoes.open).toBe(false);
  expect(g.journey.echoes.solved).not.toContain("echo-span");
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  g.respawn();
  expect(g.room.id).toBe("echo-span");
  expect(g.echoes.phase).toBe("idle");
  expect(g.player.sand).toBe(6);
  expect(g.journey.echoes.solved).toEqual(["echo-step", "echo-bell"]);
});

it("keeps earned latches on death/reload, migrates v5 and serializes no transient tape", () => {
  const h = reach("echo-bell", (g) => g.echoes.phase === "recording");
  const g = h.game;
  g.save(false);
  let loaded = reloadCampaign(g);
  expect(g.doorBlock(CAMPAIGN_ROOMS["echo-step"].doors[1])).toBeNull();
  expect(loaded.echoes.phase).toBe("idle");
  expect(loaded.journey.echoes.solved).toEqual(["echo-step"]);
  expect(JSON.stringify(g.saved)).not.toContain('"tape"');
  const raw = JSON.parse(JSON.stringify(g.saved));
  raw.journey.version = 5;
  delete raw.journey.echoes;
  const migrated = parseCampaign(JSON.stringify(raw))!;
  expect(migrated.journey.echoes.solved).toEqual([]);
  expect(migrated.journey.completed).toEqual(g.journey.completed);
  expect(migrated.collected).toEqual([...g.collected]);
  for (const solved of [["bad"], ["echo-step", "echo-step"]])
    expect(
      parseCampaign(
        JSON.stringify({
          ...g.saved,
          journey: { ...g.journey, echoes: { solved } },
        }),
      ),
    ).toBeNull();
  loaded.player.invincible = 0;
  loaded.damage(100);
  loaded.respawn();
  expect(loaded.journey.echoes.solved).toEqual(["echo-step"]);
  loaded.player.sand = 0;
  tick(loaded, 120);
  tick(loaded, 1, "echo");
  expect(loaded.echoes.phase).toBe("idle");
  expect(loaded.toast).toContain("1 sand");
});

it("blocks physical passage without a held plate, then permits a paid retry", () => {
  const h = reach("echo-step", (g) => g.echoes.phase === "recording");
  const g = h.game;
  const sand = g.player.sand;
  tick(g, 1, "cancelEcho");
  tick(g, 300, "right");
  expect(g.echoes.open).toBe(false);
  expect(g.player.x + g.player.w).toBe(620);
  expect(g.platforms.some((p) => p.x === 620 && p.h === 650)).toBe(true);
  expect(g.journey.echoes.solved).toEqual([]);
  tick(g, 110, "left");
  tick(g, 1, "echo");
  expect(g.echoes.phase).toBe("recording");
  expect(g.player.sand).toBe(sand - 1);
});

it("requires simultaneous plate and bell actors rather than a stored solo ring", () => {
  const h = reach(
    "echo-bell",
    (g) => g.echoes.phase === "recording" && g.player.x > 730,
  );
  const g = h.game;
  tick(g, 1, "cancelEcho");
  tick(g, 1, "interact");
  expect(g.echoes.open).toBe(false);
  g.input.press("left");
  for (let i = 0; i < 300 && g.player.x > 310; i++) g.update(1 / 120);
  tick(g, 20);
  expect(g.echoes.plateHeld).toBe(true);
  expect(g.echoes.open).toBe(false);
});

it("requires the raised span for an ordinary jump, even after a solo bell press", () => {
  const h = reach("echo-span", (g) => g.echoes.phase === "recording");
  const g = h.game;
  tick(g, 1, "cancelEcho");
  tick(g, 1, "interact");
  for (const _ of h.jump(590, 420)) {
    /* real fixed-step jump */
  }
  for (const _ of h.jump(1040, 650)) {
    /* falls to the recovery floor */
  }
  expect(g.player.y + g.player.h).toBe(650);
  expect(g.journey.echoes.solved).not.toContain("echo-span");
});

it("cancels on a touch-style power pulse while preserving the original power and cost", () => {
  const h = reach("echo-step", (g) => g.echoes.phase === "recording");
  const g = h.game;
  const sand = g.player.sand;
  g.input.clear();
  g.input.press("freeze");
  g.input.release("freeze");
  g.update(1 / 120);
  expect(g.echoes.phase).toBe("idle");
  expect(g.freezeTime).toBe(4);
  expect(g.player.sand).toBe(sand - 2);
});

it.each([
  ["echo-step", 1030],
  ["echo-bell", 1090],
  ["echo-span", 1090],
] as const)(
  "secures %s from its far side after the echo and gate expire",
  (room, x) => {
    const h = reach(
      room,
      (g) => g.echoes.phase === "playing" && g.player.x > x,
    );
    const g = h.game;
    tick(g, 3000);
    expect(g.echoes.phase).toBe("idle");
    expect(g.echoes.open).toBe(false);
    expect(g.echoes.solved).toBe(false);
    expect(g.interaction?.label).toBe("Secure the echo latch permanently");
    tick(g, 1, "interact");
    expect(g.echoes.solved).toBe(true);
    expect(g.echoes.open).toBe(true);
    expect(reloadCampaign(g).journey.echoes.solved).toContain(room);
  },
);
