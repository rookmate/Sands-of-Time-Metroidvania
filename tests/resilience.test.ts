import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setMaxListeners } from "node:events";
import { afterEach, beforeEach, expect, it, onTestFailed, vi } from "vitest";
import { CampaignHarness } from "../src/harness/CampaignHarness";
import { CampaignGame } from "../src/campaign/CampaignGame";
import {
  CampaignTrace,
  type CampaignEvent,
} from "../src/harness/CampaignTrace";
import { Sound } from "../src/game/audio";
import { SECTIONS } from "../src/campaign/sections";

beforeEach(() => {
  vi.spyOn(Sound.prototype, "start").mockImplementation(() => {});
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  // Full page reloads share one DOM stand-in in this headless test.
  setMaxListeners(0, window, document);
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function snapshot(game: CampaignGame) {
  return {
    room: game.room.id,
    player: game.player,
    journey: game.journey,
    screen: game.screen,
    deaths: game.deaths,
    collected: [...game.collected],
    abilities: [...game.abilities],
    flags: [...game.flags],
    enemies: game.enemies,
    platforms: game.platforms,
    checkpoint: game.checkpoint,
  };
}

const replayPath = process.env.SANDS_REPLAY;
const seeds =
  process.env.SANDS_SEED === undefined
    ? [7, 42, 2026]
    : [Number(process.env.SANDS_SEED)];
it.skipIf(!!replayPath).each(seeds)(
  "survives seeded interruptions across forty sections, seed %s",
  (seed) => {
    const h = new CampaignHarness({
      immortal: false,
      resilienceSeed: seed,
      optionalRewards: seed === 42 ? "stillness" : false,
    });

    const report = h.step(240000);
    onTestFailed(() => {
      mkdirSync("artifacts/resilience", { recursive: true });
      const path = `artifacts/resilience/seed-${seed}.json`;
      writeFileSync(
        path,
        JSON.stringify({
          seed,
          report,
          events: h.trace.events,
          state: snapshot(h.game),
        }),
      );
      console.error(
        `Replay captured: SANDS_REPLAY=${path} npm run test:resilience`,
      );
    });
    const replayed = CampaignTrace.replay(
      new CampaignHarness({ immortal: false }).game,
      JSON.parse(JSON.stringify(h.trace.events)),
    );
    expect(snapshot(replayed)).toEqual(snapshot(h.game));
    expect(report.status, report.error ?? "").toBe("passed");
    expect(report.milestones).toEqual(SECTIONS.map((s) => s.id));
    expect(
      report.disruptions.filter((d) => d.kind === "backtrack"),
    ).toHaveLength(38);
    expect(report.disruptions.map((d) => d.kind)).toEqual(
      expect.arrayContaining([
        "timed",
        "crank",
        "crate",
        "paired",
        "mirror",
        "columns",
        "illusion",
        "battle",
        "vizier",
        "grip-reload",
        "lift-reload",
      ]),
    );
    expect(h.trace.events.some((e) => e.kind === "reload")).toBe(true);
    expect(h.trace.events.some((e) => e.kind === "respawn")).toBe(true);
    expect(h.game.options.assist).toBe(false);
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  },
  15000,
);

it.skipIf(!replayPath)(
  "replays a captured input sequence without the route planner",
  () => {
    const artifact = JSON.parse(readFileSync(replayPath!, "utf8")) as {
      events: CampaignEvent[];
      state: ReturnType<typeof snapshot>;
      report: { error: string | null };
    };
    const game = CampaignTrace.replay(
      new CampaignHarness({ immortal: false }).game,
      artifact.events,
    );
    expect(snapshot(game)).toEqual(artifact.state);
    console.info("Reproduced captured state", artifact.report.error);
  },
  15000,
);
