import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignTrace, reloadCampaign } from "../src/harness/CampaignTrace";
import { SUN_HEART, SUN_VAULT } from "../src/campaign/opening";
import { Sound } from "../src/game/audio";
import { parseCampaign } from "../src/campaign/state";

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

it.each([undefined, 42])(
  "returns to the sun seal and replays the mortal campaign, seed %s",
  (seed) => {
    const h = new CampaignHarness({
      immortal: false,
      exploreOpening: true,
      resilienceSeed: seed,
    });
    expect(h.step(240000).status, h.error ?? "").toBe("passed");
    expect(h.game.visited.has(SUN_VAULT)).toBe(true);
    expect(h.game.collected.has(SUN_HEART)).toBe(true);
    expect(h.game.journey.completed).toHaveLength(40);
    const g = new CampaignGame({ persist: false });
    g.begin();
    const replay = CampaignTrace.replay(g, h.trace.events);
    expect(replay.journey).toEqual(h.game.journey);
    expect(replay.collected).toEqual(h.game.collected);
    expect(replay.screen).toBe("ending");
  },
  20000,
);

it("keeps Continue and v13 saves free of opening instructions; Retry remembers learned actions", () => {
  const g = new CampaignGame({ persist: false });
  g.start();
  expect(g.opening.cue(g)).toContain("Move toward");
  g.input.press("right");
  for (let i = 0; i < 90; i++) g.update(1 / 120);
  expect(g.opening.cue(g) ?? "").not.toContain("Move toward");
  g.input.clear();
  g.player.invincible = 0;
  g.damage(100);
  g.respawn();
  expect(g.opening.cue(g) ?? "").not.toContain("Move toward");
  g.save(false);
  const legacy = parseCampaign(JSON.stringify(g.saved));
  expect(legacy?.journey.version).toBe(14);
  const resumed = reloadCampaign(g);
  expect(resumed.opening.cue(resumed)).toBeNull();
  expect(resumed.journey).toEqual(g.journey);
  expect(resumed.checkpoint).toEqual(g.checkpoint);
  resumed.start();
  expect(resumed.opening.cue(resumed)).toContain("Move toward");
});

it("never grants later powers or a companion at the opening seal", () => {
  const h = new CampaignHarness({ immortal: false, exploreOpening: true });
  for (
    let i = 0;
    i < 12000 && !h.game.collected.has(SUN_HEART) && h.status === "running";
    i++
  )
    h.step();
  expect(h.error).toBeNull();
  expect(h.game.collected.has(SUN_HEART)).toBe(true);
  expect([...h.game.abilities]).toEqual(["rewind"]);
  expect(h.game.journey.completed).toEqual(["siege"]);
  expect(h.game.journey.farah).toBe("unknown");
  expect(h.game.companion).toBeNull();
  expect(h.game.player.maxHealth).toBe(7);
  const saved = parseCampaign(JSON.stringify(h.game.saved));
  expect(saved?.collected).toContain(SUN_HEART);
});

it("teaches the blade with actual lost-health rewind and freezes that lesson while paused", () => {
  const h = new CampaignHarness({ immortal: false });
  for (
    let i = 0;
    i < 12000 &&
    !(
      h.game.room.id === "treasury" &&
      h.game.hasDagger &&
      h.game.player.x > 1370 &&
      h.game.player.grounded
    );
    i++
  )
    h.step();
  const g = h.game;
  expect(g.opening.cue(g)).toContain("Blade ahead");
  const collected = [...g.collected];
  g.input.clear();
  g.input.press("right");
  for (let i = 0; i < 120 && g.player.x < 1490 && g.player.health === 6; i++)
    g.update(1 / 120);
  g.input.clear();
  g.input.press("down"); // Leave the upper shelf for the marked floor crossing.
  for (let i = 0; i < 360 && g.player.health === 6; i++) g.update(1 / 120);
  expect(g.player.health).toBe(5);
  expect(g.opening.cue(g)).toContain("lost health");
  g.menuKey("pause");
  const time = g.playTime;
  g.update(1);
  expect(g.playTime).toBe(time);
  expect(g.opening.cue(g)).toContain("lost health");
  g.menuKey("pause");
  g.input.press("rewind");
  for (let i = 0; i < 72; i++) g.update(1 / 120);
  g.input.clear();
  expect(g.player.health).toBe(6);
  expect(g.player.sand).toBeLessThan(6);
  expect([...g.collected]).toEqual(collected);
  expect(g.journey.completed).toEqual(["siege"]);
  expect(g.opening.cue(g)).not.toContain("lost health");
});
