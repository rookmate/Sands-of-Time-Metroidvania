import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { FINALE_IDS, finaleControls } from "../src/campaign/finale";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { parseCampaign } from "../src/campaign/state";
import { Sound } from "../src/game/audio";
import type { CampaignSave } from "../src/campaign/types";

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
function reach(h: CampaignHarness, predicate: (g: CampaignGame) => boolean) {
  for (
    let i = 0;
    i < 240000 && !predicate(h.game) && h.status !== "failed";
    i++
  )
    h.step();
  expect(h.error).toBeNull();
  expect(predicate(h.game)).toBe(true);
  return h;
}
function run(route: Generator<void>) {
  for (const _ of route) {
    /* ordinary input route */
  }
}
function retry(g: CampaignGame) {
  g.input.clear();
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  const latched = g.puzzles.state.activated;
  g.respawn();
  if (FINALE_IDS.includes(g.room.id))
    expect(g.puzzles.state.activated).toBe(latched);
  return reloadCampaign(g);
}

it.each([false, true])(
  "finishes and independently replays a mortal campaign, optional callbacks %s",
  (optional) => {
    const h = new CampaignHarness({
      immortal: false,
      exploreBaths: optional,
      ...(optional
        ? {
            resilienceSeed: 42,
            regionOrder: "sky-first",
            exploreEchoes: true,
            exploreEraWing: true,
            investigateHistory: true,
            exploreEnemyTraversal: true,
            rivalOutcome: "released",
            exploreMastery: true,
            exploreConsequences: true,
            exploreDepths: true,
            optionalRewards: "stillness",
          }
        : {}),
    });
    expect(h.step(240000).status, h.error ?? "").toBe("passed");
    const g = h.game;
    expect(FINALE_IDS.every((id) => g.visited.has(id))).toBe(true);
    expect(g.journey.completed).toHaveLength(40);
    expect(g.journey.sword).toBe(3);
    expect([...g.abilities].sort()).toEqual([
      "dash",
      "freeze",
      "rewind",
      "slow",
    ]);
    expect(g.journey.dagger).toBe(false);
    expect(g.journey.farah).toBe("restored");
    expect(g.companion?.health).toBeGreaterThan(0);
    expect(g.echoes.phase).toBe("idle");
    expect(g.slowTime).toBe(0);
    expect(g.freezeTime).toBe(0);
    expect(g.journey.puzzles["crown-baths"].activated).toBe(true);
    expect(g.journey.puzzles["crown-hall"].activated).toBe(true);
    const hearts = Object.values(CAMPAIGN_ROOMS)
      .flatMap((room) => room.pickups)
      .filter(
        (pickup) => pickup.kind === "heart" && g.collected.has(pickup.id),
      );
    expect(g.player.maxHealth).toBe(Math.min(12, 6 + hearts.length));
    const replay = new CampaignGame({ persist: false });
    replay.begin();
    const result = CampaignTrace.replay(replay, h.trace.events);
    expect(result.journey).toEqual(g.journey);
    expect(result.player).toEqual(g.player);
    expect(result.collected).toEqual(g.collected);
    expect(result.checkpoint).toEqual(g.checkpoint);
    expect(parseCampaign(JSON.stringify(g.saved))).not.toBeNull();
    result.start(true);
    expect(result.screen).toBe("ending");
    result.setScreen("title");
    result.start(true);
    expect(result.screen).toBe("ending");
    result.start();
    expect(result.room.id).toBe("siege");
    expect(result.journey.completed).toEqual([]);
  },
);

it("keeps both latches through actual death, Retry and reload without changing the fountain checkpoint", () => {
  const h = reach(
    new CampaignHarness({ immortal: false }),
    (g) => g.room.id === "crown-baths",
  );
  run(h.rewardRoute([[175], "use"]));
  const checkpoint = { ...h.game.checkpoint };
  expect(h.game.doorBlock(CAMPAIGN_ROOMS["crown-baths"].doors[1])).toContain(
    "wheel",
  );
  run(
    h.rewardRoute([
      [280],
      [400, 530],
      [450],
      [650, 420],
      [725],
      [1040, 420, 22],
      [1085],
      "use",
    ]),
  );
  expect(h.game.checkpoint).toEqual(checkpoint);
  let g = retry(h.game);
  expect(g.journey.completed).toHaveLength(34);
  expect(g.journey.farah).toBe("following");
  expect(g.journey.puzzles["crown-baths"].activated).toBe(true);
  expect(g.doorBlock(CAMPAIGN_ROOMS["crown-baths"].doors[1])).toBeNull();
  h.game = g;
  // Revisit and take the same real upper crossing after restoring the checkpoint.
  run(
    h.rewardRoute([
      [280],
      [400, 530],
      [450],
      [650, 420],
      [725],
      [1040, 420, 22],
      [1185],
      "use",
      [175],
      "use",
    ]),
  );
  const hallCheckpoint = { ...g.checkpoint };
  // No light yet: touching the far receiver does not open the shutter.
  run(
    h.rewardRoute([
      [310],
      [430, 530],
      [490],
      [680, 420],
      [750],
      [1020, 420],
      [1065],
      "use",
    ]),
  );
  expect(g.puzzles.state.activated).toBe(false);
  expect(g.toast).toContain("No light");
  run(h.walk(900));
  run(h.until(() => g.player.grounded && g.player.y > 580, 300));
  run(h.rewardRoute([[315], "use"]));
  g = retry(g);
  h.game = g;
  expect(g.puzzles.state.values[0]).toBe(1);
  run(
    h.rewardRoute([
      [310],
      [430, 530],
      [490],
      [680, 420],
      [750],
      [1020, 420],
      [1065],
      "use",
    ]),
  );
  expect(g.checkpoint).toEqual(hallCheckpoint);
  g = retry(g);
  expect(g.puzzles.state.activated).toBe(true);
  expect(g.doorBlock(CAMPAIGN_ROOMS["crown-hall"].doors[1])).toBeNull();
  expect(g.echoes.phase).toBe("idle");
  expect(g.companion).not.toBeNull();
});

it("recovers a missed overflow dash and chain catch through the lower floor with depleted sand", () => {
  const h = reach(
    new CampaignHarness({ immortal: false }),
    (g) => g.room.id === "crown-baths",
  );
  run(h.rewardRoute([[280], [400, 530], [450], [650, 420], [725]]));
  h.game.player.sand = 0;
  run(h.jump(870, 650));
  run(h.rewardRoute([[175], "use"]));
  expect(h.game.player.sand).toBe(h.game.player.maxSand);
  expect(h.game.player.health).toBe(h.game.player.maxHealth);
  reach(h, (g) => g.room.id === "crown-warden");
  // Route generator remains active. Pause at its low entry before doing a miss.
  run(h.rewardRoute([[270], [380, 530], [440], [630, 410], [705]]));
  run(h.jump(900, 650));
  run(h.rewardRoute([[175], "use"]));
  expect(h.game.player.health).toBe(h.game.player.maxHealth);
  run(h.rewardRoute([[270], [380, 530], [440], [630, 410]]));
  expect(h.game.player.y + h.game.player.h).toBe(410);
});

it("shows optional callbacks directly from canonical state, leaves a default route, and clears lift tapes", () => {
  const h = reach(
      new CampaignHarness({ immortal: false }),
      (g) => g.room.id === "crown-baths",
    ),
    g = h.game;
  const lamp = () => finaleControls(g).find((c) => c.x === 570)!;
  lamp().action();
  expect(g.toast).toContain("shelf route");
  g.journey.consequences.nimaRescued = true;
  lamp().action();
  expect(g.toast).toContain("Nima");
  g.journey.consequences.liftRepaired = true;
  g.input.press("echo");
  g.update(1 / 120);
  expect(g.echoes.phase).toBe("idle");
  expect(g.toast).toContain("only inside");
  finaleControls(g)[0].action();
  g.update(1 / 120);
  expect(g.player.y + g.player.h).toBe(420);
  expect(g.companion?.y).toBe(364);
  expect(g.echoes.phase).toBe("idle");
  expect(g.history).toHaveLength(1);
  g.enterRoom("crown-hall");
  g.update(1 / 120);
  finaleControls(g)
    .find((c) => c.x === 620)!
    .action();
  expect(g.toast).toContain("Workers signed");
  g.journey.history.read.push("witness");
  finaleControls(g)
    .find((c) => c.x === 620)!
    .action();
  expect(g.toast).toContain("recognize");
  g.enterRoom("crown-warden");
  g.update(1 / 120);
  expect(g.platforms.some((p) => p.x === 750)).toBe(false);
  g.journey.rival.outcome = "defeated";
  finaleControls(g)[0].action();
  expect(g.toast).toContain("rematch");
  g.journey.rival.outcome = "released";
  g.update(1 / 120);
  finaleControls(g)[0].action();
  expect(g.platforms.some((p) => p.x === 750)).toBe(true);
  expect(g.toast).toContain("level crossing");
});

it("preserves pre-finale, Hourglass, Dagger-less, restored and ending saves without forcing callbacks", () => {
  const h = new CampaignHarness({ immortal: false });
  const saves: CampaignSave[] = [];
  for (const room of ["tower-lift", "hourglass", "tomb", "sunset", "honor"]) {
    reach(h, (g) => g.room.id === room);
    h.game.save(false);
    saves.push(structuredClone(h.game.saved as CampaignSave));
  }
  expect(h.step(240000).status, h.error ?? "").toBe("passed");
  saves.push(h.game.saved as CampaignSave);
  for (const save of saves) {
    // v12 predates depths; v13 has no finale state to migrate or fabricate.
    for (const version of [12, 13]) {
      const legacy = JSON.parse(JSON.stringify(save));
      legacy.journey.version = version;
      for (const id of FINALE_IDS) {
        delete legacy.journey.puzzles[id];
        legacy.visited = legacy.visited.filter((s: string) => s !== id);
      }
      if (version === 12) delete legacy.journey.depths;
      const parsed = parseCampaign(JSON.stringify(legacy));
      expect(parsed).not.toBeNull();
      const g = new CampaignGame({ persist: false, save: parsed! });
      g.start(true);
      expect(g.room.id).toBe(save.room);
      expect(g.journey.completed).toEqual(save.journey.completed);
      expect(g.journey.dagger).toBe(save.journey.dagger);
      expect([...g.collected]).toEqual(save.collected);
      expect(g.journey.grandRewind).toBe(save.journey.grandRewind);
      expect(g.screen).toBe(
        save.journey.completed.length === 40 ? "ending" : "playing",
      );
      expect(g.echoes.phase).toBe("idle");
      if (g.room.id === "honor") expect(g.companion).not.toBeNull();
    }
  }
});

it("keeps remembered galleries traversable both ways until the Hourglass descent, and confines wing era and echo tapes", () => {
  const h = reach(
    new CampaignHarness({ immortal: false }),
    (g) => g.room.id === "hourglass",
  );
  const g = h.game,
    completed = [...g.journey.completed],
    collected = [...g.collected];
  // Ordinary return doorway, then safe lower floors west through every gallery.
  run(h.rewardRoute([[85], "use", [970]]));
  run(h.until(() => g.player.grounded && g.player.y > 580, 300));
  run(h.rewardRoute([[55], "use", [890]]));
  run(h.until(() => g.player.grounded && g.player.y > 580, 300));
  run(h.rewardRoute([[55], "use", [900]]));
  run(h.until(() => g.player.grounded && g.player.y > 580, 300));
  run(h.rewardRoute([[55], "use"]));
  expect(g.room.id).toBe("tower-lift");
  expect(g.journey.completed).toEqual(completed);
  expect([...g.collected]).toEqual(collected);
  expect(g.journey.farah).toBe("following");
  // A real tape created in an earlier chamber is cleared by crown entry.
  g.enterRoom("echo-step", undefined, { x: 190, y: 594 });
  g.input.clear();
  for (let i = 0; i < 10; i++) g.update(1 / 120);
  g.input.press("echo");
  g.update(1 / 120);
  g.input.clear();
  expect(g.echoes.phase).toBe("recording");
  g.journey.wing.era = "ruined";
  g.enterRoom("crown-baths");
  g.update(1 / 120);
  expect(g.echoes.phase).toBe("idle");
  expect(g.echoes.actor).toBeNull();
  expect(g.platforms).toEqual(CAMPAIGN_ROOMS["crown-baths"].platforms);
  expect(g.journey.wing.era).toBe("ruined");
  expect(g.companion).not.toBeNull();
});

it("clears rewind ghosts when returning the Dagger after the Vizier", () => {
  const h = reach(
    new CampaignHarness({ immortal: false }),
    (g) => g.room.id === "honor" && g.puzzles.state.solved,
  );
  const g = h.game;
  run(h.rewardRoute([[235], "use", [650]]));
  g.input.clear();
  g.input.press("rewind");
  for (let i = 0; i < 12; i++) run(h.tick());
  g.input.clear();
  expect(g.ghosts.length).toBeGreaterThan(0);
  run(h.use());
  expect(g.screen).toBe("ending");
  expect(g.ghosts).toEqual([]);
  for (let i = 0; i < 120; i++) g.update(1 / 120);
  expect(g.ghosts).toEqual([]);
});
