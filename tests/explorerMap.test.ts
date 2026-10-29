import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import {
  chartedRooms,
  chartedDoors,
  passageState,
} from "../src/campaign/cartography";
import { CAMPAIGN_ROOMS } from "../src/campaign/world";
import { campaignMap } from "../src/ui/campaignMap";
import { parseCampaign } from "../src/campaign/state";
import { Sound } from "../src/game/audio";
import { SECTIONS } from "../src/campaign/sections";

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
const door = (from: string, to: string) =>
  CAMPAIGN_ROOMS[from].doors.find((d) => d.to === to)!;

it("charts only the entered room and anonymous immediate exits, including the opening branch", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  const map = campaignMap(g);
  expect(chartedRooms(g)).toEqual(new Set(["siege", "treasury", "sun-vault"]));
  expect(map).not.toContain("Treasure Vaults");
  expect(map).not.toContain("Sun vault");
  expect(map).not.toContain('data-map-room="release"');
  const unknown = campaignMap(g, "treasury");
  expect(unknown).toContain("Onward route uncharted");
  expect(unknown).not.toContain('data-map-room="release"');
  expect(unknown).not.toContain("data-map-marker=");
  expect(campaignMap(g, "sun-vault")).not.toContain("Unclaimed discovery");
  expect(g.doorBlock(door("siege", "sun-vault"), "siege")).toContain("Dagger");
  g.journey.completed.push("siege");
  g.journey.dagger = true;
  expect(g.doorBlock(door("siege", "sun-vault"), "siege")).toBeNull();
});

it("remembers markers through death, Continue and reload without moving the checkpoint or healing", () => {
  const h = new CampaignHarness({ immortal: false, exploreOpening: true });
  while (!h.game.collected.has("sun-vault-heart") && h.status === "running")
    h.step();
  const g = h.game;
  expect(h.error).toBeNull();
  const checkpoint = { ...g.checkpoint };
  const position = { x: g.player.x, y: g.player.y };
  g.player.health--;
  const health = g.player.health,
    sand = g.player.sand;
  g.setScreen("map");
  const playTime = g.playTime,
    worldTime = g.worldTime;
  g.setMapMarker("siege", "return");
  g.setMapMarker("sun-vault", "treasure");
  g.setMapMarker("honor", "puzzle"); // Never chart an unvisited future room.
  for (let i = 0; i < 240; i++) g.update(1 / 120);
  expect(g.playTime).toBe(playTime);
  expect(g.worldTime).toBe(worldTime);
  expect(g.player.health).toBe(health);
  expect(g.player.sand).toBe(sand);
  expect({ x: g.player.x, y: g.player.y }).toEqual(position);
  expect(g.checkpoint).toEqual(checkpoint);
  expect(g.journey.mapMarkers).toEqual({
    siege: "return",
    "sun-vault": "treasure",
  });
  g.setScreen("playing");
  g.player.invincible = 0;
  g.damage(100);
  expect(g.screen).toBe("death");
  g.respawn();
  const resumed = reloadCampaign(g);
  expect(resumed.checkpoint).toEqual(checkpoint);
  expect(resumed.journey.mapMarkers).toEqual(g.journey.mapMarkers);
  resumed.setMapMarker("sun-vault", null);
  const afterRemoval = reloadCampaign(resumed);
  expect(afterRemoval.journey.mapMarkers).toEqual({ siege: "return" });
  afterRemoval.start();
  expect(afterRemoval.journey.mapMarkers).toEqual({});
});

it("migrates a genuine v13 save and preserves discovery, rewards and checkpoint; validates markers", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.save(false);
  const old = JSON.parse(JSON.stringify(g.saved));
  old.journey.version = 13;
  delete old.journey.mapMarkers;
  const migrated = parseCampaign(JSON.stringify(old))!;
  expect(migrated).not.toBeNull();
  expect(migrated.journey).toEqual({
    ...old.journey,
    version: 14,
    mapMarkers: {},
  });
  expect(migrated.visited).toEqual(old.visited);
  expect(migrated.collected).toEqual(old.collected);
  expect(migrated.checkpoint).toEqual(old.checkpoint);
  for (const markers of [{ honor: "return" }, { siege: "bad" }, [], null]) {
    const invalid = structuredClone(migrated);
    Object.assign(invalid.journey, { mapMarkers: markers });
    expect(parseCampaign(JSON.stringify(invalid))).toBeNull();
  }
});

it("uses each passage's source for sealed returns and warns before the descent", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.journey.completed = SECTIONS.slice(0, 34).map((s) => s.id);
  const descent = door("hourglass", "tomb");
  expect(passageState(g, "hourglass", descent).kind).toBe("descent");
  g.journey.completed.push("hourglass");
  expect(passageState(g, "tomb", door("tomb", "hourglass")).reason).toContain(
    "sealed",
  );
  expect(g.room.id).toBe("siege"); // Inspecting another room never moves the player.
  g.journey.grandRewind = true;
  expect(g.doorBlock(CAMPAIGN_ROOMS.honor.doors[0], "honor")).toContain(
    "Restored timeline",
  );
});

it("reflects directional restoration, earned lifts, hidden facing and both local eras", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  g.journey.completed = SECTIONS.slice(0, 34).map((s) => s.id);
  g.visited.add("garden-court");
  expect(chartedRooms(g).has("witness-room")).toBe(false);
  g.journey.history.opened = true;
  expect(chartedRooms(g).has("witness-room")).toBe(true);
  const lift = door("lamp-refuge", "warden-loft");
  expect(passageState(g, "lamp-refuge", lift).reason).toContain("Broken drive");
  g.journey.consequences.liftRepaired = true;
  expect(passageState(g, "lamp-refuge", lift).reason).toContain("prison locks");
  g.journey.palace.prisonOpen = true;
  expect(passageState(g, "lamp-refuge", lift).kind).toBe("open");
  const wall = door("mirror-reception", "fallen-arcade");
  const arch = door("fallen-arcade", "mirror-vault");
  expect(passageState(g, "mirror-reception", wall).reason).toContain(
    "Intact wall",
  );
  expect(passageState(g, "fallen-arcade", arch).kind).toBe("open");
  g.journey.wing.era = "ruined";
  expect(passageState(g, "mirror-reception", wall).kind).toBe("open");
  expect(passageState(g, "fallen-arcade", arch).reason).toContain(
    "Fallen arch",
  );
  expect(
    passageState(g, "fallen-arcade", door("fallen-arcade", "mirror-reception"))
      .kind,
  ).toBe("open");
});

it.each(["gardens-first", "sky-first"] as const)(
  "charts actual mortal %s routes and independently replays all inputs",
  (regionOrder) => {
    const h = new CampaignHarness({
      immortal: false,
      regionOrder,
      resilienceSeed: 42,
      exploreOpening: true,
      exploreBaths: true,
      exploreEraWing: true,
      exploreEchoes: true,
      exploreDepths: true,
      exploreConsequences: true,
      exploreMastery: true,
      investigateHistory: true,
      exploreEnemyTraversal: true,
      rivalOutcome: "released",
    });
    const seen = new Set<string>();
    for (let i = 0; i < 240000 && h.status === "running"; i++) {
      h.step();
      const g = h.game;
      if (seen.has(g.room.id)) continue;
      seen.add(g.room.id);
      const map = campaignMap(g);
      expect(map).toContain(`data-selected-room="${g.room.id}"`);
      for (const d of chartedDoors(g, g.room.id))
        expect(map).toContain(`data-map-room="${d.to}"`);
      for (const id of Object.keys(CAMPAIGN_ROOMS))
        if (!chartedRooms(g).has(id))
          expect(map).not.toContain(`data-map-room="${id}"`);
    }
    expect(h.status, h.error ?? "").toBe("passed");
    for (const id of [
      "sun-vault",
      "mirror-vault",
      "depths-spring",
      "witness-room",
      "lamp-refuge",
      "crown-warden",
    ])
      expect(seen.has(id), id).toBe(true);
    const replay = new CampaignGame({ persist: false });
    replay.begin();
    const result = CampaignTrace.replay(replay, h.trace.events);
    expect(result.journey).toEqual(h.game.journey);
    expect(result.visited).toEqual(h.game.visited);
    expect(result.screen).toBe("ending");
  },
  30000,
);
