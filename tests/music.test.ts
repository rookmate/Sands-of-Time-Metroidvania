import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Sound } from "../src/game/audio";
import { SCORE, scoreStep, type MusicScene } from "../src/game/score";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { spawnEnemies } from "../src/game/enemies";
import { defaultOptions, loadOptions } from "../src/game/storage";

// Model time and node lifetime, not the waveform. Browser captures cover output.
class Param {
  value = 0;
  events: { value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number) {
    this.events.push({ value, time });
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ value, time });
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ value, time });
  }
  cancelAndHoldAtTime(time: number) {
    this.events = this.events.filter((e) => e.time < time);
  }
}
class Node {
  gain = new Param();
  frequency = new Param();
  threshold = new Param();
  knee = new Param();
  ratio = new Param();
  attack = new Param();
  release = new Param();
  type = "sine";
  start = vi.fn();
  end = Infinity;
  stop(t: number) {
    this.end = t;
  }
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
}
class Context {
  static instances: Context[] = [];
  currentTime = 0;
  state = "running";
  destination = new Node();
  gains: Node[] = [];
  oscillators: Node[] = [];
  constructor() {
    Context.instances.push(this);
  }
  createGain() {
    const n = new Node();
    this.gains.push(n);
    return n;
  }
  createDynamicsCompressor() {
    return new Node();
  }
  createOscillator() {
    const n = new Node();
    this.oscillators.push(n);
    return n;
  }
  resume = vi.fn(async () => {
    this.state = "running";
  });
  advance(seconds: number) {
    this.currentTime += seconds;
    for (const n of this.oscillators)
      if (n.onended && n.end <= this.currentTime) {
        n.onended();
        n.onended = null;
      }
  }
  get live() {
    return this.oscillators.filter((n) => n.onended);
  }
}
const calm: MusicScene = { theme: "palace", danger: "calm" };
beforeEach(() => {
  Context.instances = [];
  vi.stubGlobal("AudioContext", Context);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  });
});
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const options = { ...defaultOptions };
  const sound = new Sound(options);
  sound.start();
  sound.sync("playing", false);
  sound.update(1 / 120, calm);
  return { sound, options, ctx: Context.instances[0] };
}
it("creates no audio before a gesture; repeated unlocks reuse one graph", () => {
  const s = new Sound({ ...defaultOptions });
  s.sync("playing", false);
  s.update(10, calm);
  s.play("jump");
  expect(Context.instances).toHaveLength(0);
  s.start();
  s.start();
  s.start();
  expect(Context.instances).toHaveLength(1);
  const ctx = Context.instances[0];
  ctx.state = "suspended";
  s.start();
  expect(ctx.resume).toHaveBeenCalledOnce();
});
it("uses audio time, skips stalled frames and never catches up simulation loops", () => {
  const { sound, ctx } = setup();
  const count = ctx.oscillators.length;
  for (let i = 0; i < 10000; i++) sound.update(1 / 120, calm);
  expect(ctx.oscillators).toHaveLength(count);
  ctx.advance(30);
  sound.update(30, calm);
  expect(ctx.oscillators.length - count).toBeLessThanOrEqual(3);
  expect(ctx.live.length).toBeLessThanOrEqual(3);
});
it.each(["pause", "map", "options", "help", "title"] as const)(
  "fades both buses and releases tails on %s",
  (screen) => {
    const { sound, ctx } = setup();
    sound.play("power");
    expect(ctx.live.length).toBeGreaterThan(3);
    sound.sync(screen, false);
    expect(ctx.gains[1].gain.events.at(-1)?.value).toBe(0);
    expect(ctx.gains[2].gain.events.at(-1)?.value).toBe(0);
    ctx.advance(0.2);
    expect(ctx.live).toHaveLength(0);
    expect(
      ctx.oscillators.every((n) => n.disconnect.mock.calls.length === 1),
    ).toBe(true);
  },
);
it("mutes existing music/effects independently and persists existing options schema", () => {
  const g = new CampaignGame();
  g.start();
  g.update(1 / 120);
  const ctx = Context.instances[0];
  g.sound.play("power");
  g.setOption("music", false);
  expect(ctx.gains[1].gain.events.at(-1)?.value).toBe(0);
  expect(loadOptions().music).toBe(false);
  expect(loadOptions().sfx).toBe(true);
  g.setOption("sfx", false);
  ctx.advance(0.2);
  expect(ctx.live).toHaveLength(0);
  g.setOption("music", true);
  g.update(1 / 120);
  expect(ctx.live.length).toBeGreaterThan(0);
  const count = ctx.oscillators.length;
  g.sound.play("impact");
  expect(ctx.oscillators).toHaveLength(count);
});
it("hidden tabs silence even a story stinger without waiting for a game frame", () => {
  const g = new CampaignGame({ persist: false });
  g.start();
  g.showStory("Discovery", "Quiet", "Continue");
  const ctx = Context.instances[0];
  expect(ctx.live.length).toBeGreaterThan(0);
  Object.assign(document, { hidden: true });
  document.dispatchEvent(new Event("visibilitychange"));
  ctx.advance(0.2);
  expect(ctx.live).toHaveLength(0);
  g.sound.play("save");
  expect(ctx.live).toHaveLength(0);
});
it("keeps discovery panels quiet, allows their stinger, and clears stale danger on Retry", () => {
  const { sound, ctx } = setup();
  sound.update(1 / 120, { ...calm, danger: "king" });
  sound.sync("story", false);
  sound.play("power");
  ctx.advance(0.2);
  expect(ctx.live).toHaveLength(4);
  sound.sync("death", false);
  sound.play("death");
  sound.sync("playing", false);
  sound.update(1 / 120, calm);
  // Calm step zero is melody plus a fifth; a stale King adds a fourth voice.
  expect(ctx.oscillators.slice(-3).map((n) => n.type)).toEqual([
    "triangle",
    "sine",
    "sine",
  ]);
  sound.sync("pause", false);
  ctx.advance(3);
  expect(ctx.live).toHaveLength(0);
});
it("changes eras with released old notes, no stacked loops, and bounded voice lifetime", () => {
  const { sound, ctx } = setup();
  for (let i = 0; i < 300; i++) {
    ctx.advance(0.1);
    sound.update(0.1, {
      theme: "wing",
      era: i % 2 ? "intact" : "ruined",
      danger: "calm",
    });
    sound.play("impact");
    expect(ctx.live.length).toBeLessThanOrEqual(10);
  }
  sound.sync("pause", false);
  ctx.advance(3);
  expect(ctx.live).toHaveLength(0);
  expect(
    ctx.oscillators.every((n) => n.disconnect.mock.calls.length === 1),
  ).toBe(true);
});
it("has authored regional melodies, era variation, distinct encounter rhythms and quiet bars", () => {
  const phrases = Object.keys(SCORE).map((theme) =>
    JSON.stringify(SCORE[theme as keyof typeof SCORE].melody),
  );
  expect(new Set(phrases).size).toBe(phrases.length);
  expect(scoreStep({ ...calm, theme: "palace" }, 31)).toEqual([]);
  expect(scoreStep({ ...calm, theme: "wing", era: "intact" }, 8).length).toBe(
    1,
  );
  expect(scoreStep({ ...calm, theme: "wing", era: "ruined" }, 8)).toEqual([]);
  const keys = ["king", "rival", "keeper", "vizier"] as const;
  expect(
    new Set(
      keys.map((danger) =>
        JSON.stringify(
          [0, 4, 8, 12].map((i) => scoreStep({ ...calm, danger }, i)),
        ),
      ),
    ).size,
  ).toBe(4);
});
it("selects actual regional, local-era, encounter and ending state without changing saves", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  for (const [room, theme] of [
    ["baths-main", "baths"],
    ["prison-cells", "prison"],
    ["orrery", "observatory"],
    ["depths-heart", "depths"],
    ["echo-step", "echoes"],
    ["crown-hall", "crown"],
    ["tomb", "loss"],
    ["honor", "finale"],
  ]) {
    g.enterRoom(room);
    expect(g.musicScene.theme).toBe(theme);
  }
  g.enterRoom("mirror-reception");
  g.journey.wing.era = "ruined";
  expect(g.musicScene.era).toBe("ruined");
  for (const [kind, danger] of [
    ["king", "king"],
    ["double", "vizier"],
    ["rival", "rival"],
  ] as const) {
    g.enemies = spawnEnemies(
      [{ kind, x: 800, y: 650, patrol: [0, 1200] }],
      0,
      false,
      false,
    );
    expect(g.musicScene.danger).toBe(danger);
    g.enemies[0].dead = true;
    expect(g.musicScene.danger).toBe("calm");
  }
  g.enterRoom("depths-heart");
  g.depths.active = true;
  expect(g.musicScene.danger).toBe("keeper");
  g.journey.depths.resolved = true;
  expect(g.musicScene.danger).toBe("calm");
  g.setScreen("ending");
  expect(g.musicScene).toMatchObject({ theme: "finale", danger: "calm" });
});
it("holds a short encounter exit, then drops its pulse without restarting the regional phrase", () => {
  const { sound, ctx } = setup();
  const tick = (scene: MusicScene) => {
    ctx.advance(30 / 82);
    sound.update(30 / 82, scene);
  };
  tick({ ...calm, danger: "rival" });
  tick(calm);
  tick(calm);
  const beforePulse = ctx.oscillators.length;
  tick(calm); // step 4: no palace melody here; the held rival has one pulse.
  expect(ctx.oscillators.length).toBe(beforePulse + 1);
  for (let step = 5; step < 12; step++) tick(calm);
  const beforeRest = ctx.oscillators.length;
  tick(calm); // step 12: past 2.5s, so danger is gone and the palace rests.
  expect(ctx.oscillators.length).toBe(beforeRest);
});
it("keeps the Observatory phrase through the archive, sky bridge and lens roof", () => {
  const g = new CampaignGame({ persist: false });
  g.begin();
  for (const room of ["archive-stair", "sky-bridge", "lens-roof", "orrery"]) {
    g.enterRoom(room);
    expect(g.musicScene.theme, room).toBe("observatory");
  }
});
