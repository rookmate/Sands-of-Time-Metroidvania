import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setMaxListeners } from "node:events";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { reloadCampaign, CampaignTrace } from "../src/harness/CampaignTrace";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { PALACE_IDS, palacePlatforms } from "../src/campaign/palace";
import { parseCampaign } from "../src/campaign/state";
import { Sound } from "../src/game/audio";
import { mapMarkup } from "../src/ui/map";

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
  for (let i = 0; i < 150000 && !until(h.game) && h.status !== "failed"; i++)
    h.step();
  expect(h.error).toBeNull();
  expect(until(h.game)).toBe(true);
}

it.each(["gardens-first", "sky-first"] as const)(
  "plays %s, converges with Farah and mandatory upgrades, and completes all forty anchors",
  (order) => {
    const h = new CampaignHarness({ immortal: false, regionOrder: order });
    advance(h, (g) => g.journey.palace.irrigated || g.journey.palace.sky);
    expect(h.game.journey.completed).toHaveLength(28);
    expect(h.game.journey.farah).toBe("following");
    expect(h.game.journey.palace.irrigated).toBe(order === "gardens-first");
    expect(h.game.journey.palace.sky).toBe(order === "sky-first");
    advance(h, (g) => g.room.id === "orrery");
    expect(h.game.journey.palace).toMatchObject({ irrigated: true, sky: true });
    expect(h.game.companion).not.toBeNull();
    expect(h.game.journey.sword).toBe(2);
    expect([...h.game.abilities]).toContain("dash");
    const map = mapMarkup(h.game);
    for (const name of [
      "Cypress court",
      "Root conduit",
      "Lens roof",
      "Archive stair",
    ])
      expect(map).toContain(name);
    expect(map).toContain("Point of no return");
    const report = h.step(240000);
    expect(report.status, report.error ?? "").toBe("passed");
    expect(report.rooms).toEqual(expect.arrayContaining(PALACE_IDS));
    expect(report.milestones).toHaveLength(40);
    expect(report.deaths).toBe(0);
    expect(report.palace).toEqual({
      irrigated: true,
      sky: true,
      winch: true,
      prisonOpen: true,
    });
    expect(
      report.scenes
        .filter((s) => ["tomb", "sunset", "honor"].includes(s.id))
        .map((s) => s.farah),
    ).toEqual(["gone", "dead", "restored"]);
    const replay = CampaignTrace.replay(
      new CampaignHarness({ immortal: false }).game,
      h.trace.events,
    );
    expect(replay.journey).toEqual(h.game.journey);
    expect(replay.player).toEqual(h.game.player);
    expect(parseCampaign(JSON.stringify(h.game.saved))).not.toBeNull();
  },
);

it("keeps regional changes across real death, reload, movement rewind and revisits without advancing anchors", () => {
  const h = new CampaignHarness({ immortal: false });
  for (const key of ["irrigated", "sky", "winch", "prisonOpen"] as const) {
    advance(h, (g) => g.journey.palace[key]);
    let g = reloadCampaign(h.game);
    const before = structuredClone(g.journey),
      anchors = [...g.journey.completed];
    g.save(false);
    g.player.invincible = 0;
    g.damage(100);
    expect(g.screen).toBe("death");
    g.respawn();
    expect(g.journey.palace).toEqual(before.palace);
    g = reloadCampaign(g);
    expect(g.journey.palace).toEqual(before.palace);
    const checkpoint = g.room.id;
    g.enterRoom("garden-court");
    g.update(1 / 120);
    expect(palacePlatforms(g, []).some((p) => p.y === 420)).toBe(true);
    g.enterRoom("archive-stair");
    g.update(1 / 120);
    expect(palacePlatforms(g, []).some((p) => p.y === 530)).toBe(true);
    for (let i = 0; i < 65; i++) g.update(1 / 120);
    g.input.press("rewind");
    for (let i = 0; i < 20; i++) g.update(1 / 120);
    expect(g.journey.palace).toEqual(before.palace);
    expect(g.journey.completed).toEqual(anchors);
    g.enterRoom(checkpoint);
    g.update(1 / 120);
    // The original route planner continues with its own game after the independent reload test.
  }
});

it("migrates v4 saves on both sides of the new gates and preserves rewards, pickups and old checkpoints", () => {
  const h = new CampaignHarness({
    immortal: false,
    optionalRewards: "stillness",
  });
  for (const room of ["learning", "orrery", "tower-lift", "tomb"]) {
    advance(h, (g) => g.room.id === room);
    h.game.save(false);
    const old = JSON.parse(JSON.stringify(h.game.saved));
    old.journey.version = 4;
    delete old.journey.palace;
    const migrated = parseCampaign(JSON.stringify(old))!;
    expect(migrated).not.toBeNull();
    expect(migrated.journey.version).toBe(12);
    expect(migrated.journey.palace).toEqual({
      irrigated: room !== "learning",
      sky: room !== "learning",
      winch: ["tower-lift", "tomb"].includes(room),
      prisonOpen: ["tower-lift", "tomb"].includes(room),
    });
    expect(migrated.journey.rewards).toEqual(old.journey.rewards);
    expect(migrated.collected).toEqual(old.collected);
    expect(migrated.checkpoint).toEqual(old.checkpoint);
    const loaded = new CampaignGame({ persist: false, save: migrated });
    loaded.start(true);
    expect(loaded.room.id).toBe(room);
  }
});

it("signposts gates, keeps regional goals off chronology and seals the old palace after Dagger loss", () => {
  const h = new CampaignHarness({ immortal: false });
  const aqueduct = CAMPAIGN_ROOMS["upper-baths"].doors.find(
    (d) => d.to === "garden-court",
  )!;
  expect(h.game.doorBlock(aqueduct)).not.toBeNull();
  advance(h, (g) => g.room.id === "daybreak");
  expect(h.game.doorBlock(aqueduct)).toBeNull();
  advance(h, (g) => g.room.id === "learning");
  expect(
    h.game.doorBlock(CAMPAIGN_ROOMS.learning.doors.find((d) => d.milestone)!),
  ).toContain("either order");
  advance(h, (g) => g.room.id === "prison");
  expect(
    h.game.doorBlock(CAMPAIGN_ROOMS.prison.doors.find((d) => d.milestone)!),
  ).toContain("warden");
  advance(h, (g) => g.room.id === "hourglass");
  expect(h.game.quest.text).toContain("seals all returns");
  advance(h, (g) => g.room.id === "tomb");
  expect(h.game.hasDagger).toBe(false);
  expect(h.game.doorBlock(CAMPAIGN_ROOMS.tomb.doors[0])).toContain(
    "Point of no return",
  );
  const raw = JSON.parse(JSON.stringify(h.game.saved));
  raw.journey.palace.prisonOpen = true;
  raw.journey.palace.winch = false;
  expect(parseCampaign(JSON.stringify(raw))).toBeNull();
});

it("physically returns through the early sword/Dash aqueduct, restores Gardens and opens the new canopy exit without skipping story", () => {
  const h = new CampaignHarness({ immortal: false });
  advance(h, (g) => g.room.id === "daybreak");
  const anchors = [...h.game.journey.completed];
  const route = h.rewardRoute([
    [35],
    "use",
    [1785],
    "use",
    [1135],
    "use",
    [260],
    [370, 520],
    [920, 530, 40],
    [970],
    [1020],
    [1110, 420],
    [1085],
    "use",
    [1195],
    "use",
  ]);
  for (const _ of route) {
    /* Fixed-step inputs are recorded by the harness. */
  }
  expect(h.game.room.id).toBe("cypress-crown");
  expect(h.game.journey.palace.irrigated).toBe(true);
  expect(h.game.journey.completed).toEqual(anchors);
  expect(
    h.game.doorBlock(
      CAMPAIGN_ROOMS["cypress-crown"].doors.find((d) => d.to === "reunion")!,
    ),
  ).toContain("story objective");
  expect(
    h.game.doorBlock(
      CAMPAIGN_ROOMS["cypress-crown"].doors.find((d) => d.to === "lens-roof")!,
    ),
  ).toContain("lens");
  // Return by the changed court instead of taking a future story door.
  for (const _ of h.rewardRoute([[85], "use", [500], [85], "use"])) {
  }
  expect(h.game.room.id).toBe("upper-baths");
  expect(h.game.journey.completed).toEqual(anchors);
  const replay = CampaignTrace.replay(
    new CampaignHarness({ immortal: false }).game,
    h.trace.events,
  );
  expect(replay.journey).toEqual(h.game.journey);
  expect(replay.player).toEqual(h.game.player);
});

it.each(["continue", "retry"])(
  "can pin the physically reached lens after shutter expiry, far-bank saving and %s",
  (recovery) => {
    const h = new CampaignHarness({ immortal: false });
    advance(h, (g) => g.room.id === "sky-bridge");
    for (const _ of h.rewardRoute([[185], "use", [792]])) {
    }
    h.game.input.clear();
    for (let i = 0; i < 800; i++) h.tick().next();
    expect(h.game.puzzles.state.solved).toBe(false);
    expect(h.game.puzzles.state.remaining).toBe(0);
    for (const _ of h.rewardRoute([[945], "use"])) {
    }
    expect(h.game.player.y + h.game.player.h).toBe(310);
    expect(h.game.checkpoint.room).toBe("sky-bridge");
    h.recover("reload");
    if (recovery === "retry") h.recover("respawn");
    expect(h.game.puzzles.state.solved).toBe(false);
    for (const _ of h.rewardRoute([[1035], "use"])) {
    }
    expect(h.game.journey.palace.sky).toBe(true);
    expect(h.game.doorBlock(CAMPAIGN_ROOMS["sky-bridge"].doors[1])).toBeNull();
    for (const _ of h.rewardRoute([[1145], "use"])) {
    }
    expect(h.game.room.id).toBe("lens-roof");
    const replay = CampaignTrace.replay(
      new CampaignHarness({ immortal: false }).game,
      h.trace.events,
    );
    expect(replay.journey).toEqual(h.game.journey);
    expect(replay.player).toEqual(h.game.player);
  },
);
