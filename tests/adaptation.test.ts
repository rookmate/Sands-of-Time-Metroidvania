import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { SECTIONS } from "../src/campaign/sections";
import { traceLight } from "../src/campaign/light";
import { parseCampaign } from "../src/campaign/state";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { moveBody } from "../src/game/physics";

beforeEach(() => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

const EXPECTED = [
  "siege",
  "treasury",
  "release",
  "glimpse",
  "passage",
  "defenses",
  "trapped-yard",
  "sand-king",
  "way-in",
  "early-tower",
  "warehouse",
  "zoo",
  "aviary",
  "cliffs",
  "baths-main",
  "bathworks",
  "upper-baths",
  "daybreak",
  "mess-hall",
  "drawbridge",
  "broken-bridge",
  "meet-baths",
  "falls-descent",
  "ladder-cavern",
  "reservoir",
  "well",
  "harem",
  "reunion",
  "learning",
  "orrery",
  "learning-yard",
  "ramparts",
  "prison",
  "tower-lift",
  "hourglass",
  "tomb",
  "pursuit",
  "dawn-climb",
  "sunset",
  "honor",
];

it("represents every original walkthrough milestone in order with connected areas", () => {
  expect(SECTIONS.map((s) => s.id)).toEqual(EXPECTED);
  expect(Object.keys(CAMPAIGN_ROOMS)).toEqual(expect.arrayContaining(EXPECTED));
  for (const room of Object.values(CAMPAIGN_ROOMS))
    for (const door of room.doors)
      expect(CAMPAIGN_ROOMS[door.to].doors.some((d) => d.to === room.id)).toBe(
        true,
      );
});

it("plays the entire adaptation with real inputs, puzzles, Farah, Dagger loss, and the Grand Rewind", () => {
  const harness = new CampaignHarness();
  const report = harness.step(240000);
  console.info("Expanded campaign", JSON.stringify(report));
  expect(report.status, report.error ?? JSON.stringify(report)).toBe("passed");
  expect(report.milestones).toEqual(EXPECTED);
  expect(report.rooms).toHaveLength(57);
  expect(report.deaths).toBe(0);
  for (const id of ["tomb", "pursuit", "dawn-climb"])
    expect(report.scenes.find((s) => s.id === id)?.dagger).toBe(false);
  expect(report.scenes.find((s) => s.id === "honor")?.grandRewind).toBe(true);
  expect(
    report.defeated.filter((id) => /^honor:1[012]$/.test(id)),
  ).toHaveLength(3);
  expect(harness.game.journey.dagger).toBe(false);
  expect(report.bosses.find((b) => b.kind === "king")?.phases).toEqual([0, 1]);
  expect(report.powersUsed.sort()).toEqual([
    "dash",
    "freeze",
    "rewind",
    "slow",
  ]);
  expect(
    parseCampaign(JSON.stringify(harness.game.saved))?.journey.completed,
  ).toEqual(EXPECTED);
}, 15000);

it.each(["king", "vizier"] as const)(
  "plays the standalone %s encounter",
  (scenario) => {
    const harness = new CampaignHarness({ scenario });
    const report = harness.step(30000);
    expect(report.status, report.error ?? JSON.stringify(report)).toBe(
      "passed",
    );
  },
);

it("requires both mirror angles and spatial alignment", () => {
  const mirrors = [
    { x: 500, y: 420 },
    { x: 500, y: 600 },
    { x: 1100, y: 600 },
  ];
  const receiver = { x: 1100, y: 330 };
  expect(traceLight(mirrors, [1, 1, 0], receiver).lit).toBe(true);
  expect(traceLight(mirrors, [0, 1, 0], receiver).lit).toBe(false);
  expect(
    traceLight(
      [...mirrors.slice(0, 2), { x: 1250, y: 600 }],
      [1, 1, 0],
      receiver,
    ).lit,
  ).toBe(false);
});

it("requires a crate to remain on its plate to keep the gate open", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.enterRoom("warehouse", undefined, { x: 400, y: 594 });
  g.update(1 / 120);
  const puzzle = g.puzzles.definition;
  expect(puzzle?.kind).toBe("crate");
  if (puzzle?.kind !== "crate") throw new Error("Missing crate fixture");
  g.puzzles.state.crateX = puzzle.plate.x - 24;
  g.update(1 / 120);
  expect(g.puzzles.state.solved).toBe(true);
  g.puzzles.state.crateX = 470;
  g.update(1 / 120);
  expect(g.puzzles.state.solved).toBe(false);
  expect(g.platforms.some((p) => p.x === puzzle.gate.x)).toBe(true);
});

it("does not complete a companion switch when Farah is absent", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.enterRoom("way-in", undefined, { x: 635, y: 594 });
  g.input.press("interact");
  g.update(1 / 120);
  expect(g.companion).toBeNull();
  expect(g.puzzles.state.solved).toBe(false);
});

it("rejects saves that skip original story milestones", () => {
  const harness = new CampaignHarness();
  harness.game.save(false);
  const save = JSON.parse(JSON.stringify(harness.game.saved));
  expect(save.room).toBe("siege");
  expect(parseCampaign(JSON.stringify(save))?.journey.completed).toEqual([]);
  expect(
    parseCampaign(
      JSON.stringify({
        ...save,
        journey: { ...harness.game.journey, completed: ["honor"] },
      }),
    ),
  ).toBeNull();
});

it("reloads the tomb with learned powers retained and the Dagger unavailable", () => {
  const harness = new CampaignHarness();
  for (let i = 0; i < 120000 && harness.game.room.id !== "tomb"; i++)
    harness.step();
  expect(harness.status, harness.error ?? "").not.toBe("failed");
  expect(harness.game.room.id).toBe("tomb");
  harness.game.save(false);
  const raw = JSON.stringify(harness.game.saved);
  expect(parseCampaign(raw)?.journey.dagger).toBe(false);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "sands-of-time:campaign:v2" ? raw : null,
    setItem: vi.fn(),
  });
  const reloaded = new CampaignGame();
  vi.spyOn(reloaded.sound, "start").mockImplementation(() => {});
  reloaded.start(true);
  expect(reloaded.room.id).toBe("tomb");
  expect(reloaded.abilities.size).toBe(4);
  reloaded.player.sand = 6;
  for (const action of ["slow", "freeze", "dash", "rewind"] as const)
    reloaded.input.press(action);
  reloaded.update(1 / 120);
  expect(reloaded.slowTime).toBe(0);
  expect(reloaded.freezeTime).toBe(0);
  expect(reloaded.player.dashTime).toBe(0);
  expect(reloaded.rewinding).toBe(false);
  expect(reloaded.player.sand).toBe(6);
  expect(reloaded.hasDagger).toBe(false);
}, 15000);

it("resumes a jump after focus loss without creating another jump press", () => {
  const uninterrupted = new CampaignHarness();
  uninterrupted.step(600);
  const interrupted = new CampaignHarness();
  interrupted.step(250);
  interrupted.game.setScreen("pause");
  interrupted.game.input.clear();
  interrupted.step(350);
  expect(interrupted.report().position).toEqual(
    uninterrupted.report().position,
  );
  expect(interrupted.game.room.id).toBe(uninterrupted.game.room.id);
});

it("does not grab a low crate as a ledge when pushing it along the floor", () => {
  const game = new CampaignGame({ persist: false });
  game.begin();
  game.enterRoom("warehouse", undefined, { x: 400, y: 594 });
  game.input.press("interact");
  game.input.press("right");
  for (let i = 0; i < 120; i++) game.update(1 / 120);
  expect(game.player.ledge).toBeNull();
  expect(game.player.y + game.player.h).toBe(650);
  expect(game.puzzles.state.crateX).toBeGreaterThan(600);
});

it("lands an enemy on a rising solid platform instead of ejecting it sideways", () => {
  const body = { x: 800, y: 598.17, w: 34, h: 52, vx: 60, vy: 15 };
  moveBody(body, [{ x: 300, y: 650, w: 1500, h: 150 }], 1 / 120);
  expect(body.x).toBeCloseTo(800.5);
  expect(body.y + body.h).toBe(650);
});

it("keeps the final Vizier protected until all three doubles have fallen", () => {
  const harness = new CampaignHarness({ scenario: "vizier" });
  harness.step();
  const game = harness.game,
    vizier = game.enemies.find((e) => e.kind === "vizier")!;
  expect(vizier.protected).toBe(true);
  game.player.x = vizier.x - 55;
  game.player.face = 1;
  const health = vizier.health;
  game.input.press("attack");
  for (let i = 0; i < 30; i++) game.update(1 / 120);
  expect(vizier.health).toBe(health);
  expect(game.journey.grandRewind).toBe(true);
});
