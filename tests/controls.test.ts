import { beforeEach, describe, expect, it, vi } from "vitest";
import { Bindings } from "../src/game/actions";
import { Input } from "../src/game/input";
import { CampaignGame } from "../src/campaign/CampaignGame";
import { ROOMS } from "../src/game/world";
import { loadOptions } from "../src/game/storage";
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { hidden: false }),
  );
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
  });
});
function key(type: string, code: string, repeat = false) {
  const event = Object.assign(new Event(type, { cancelable: true }), {
    code,
    repeat,
  });
  window.dispatchEvent(event);
  return event;
}
function pad(buttons: number[] = [], axes = [0, 0]): Gamepad {
  return {
    id: "test",
    index: 0,
    connected: true,
    mapping: "standard",
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({
      pressed: buttons.includes(i),
      value: buttons.includes(i) ? 1 : 0,
      touched: false,
    })),
    timestamp: 0,
    vibrationActuator: {
      effects: [],
      playEffect: async () => "complete",
      reset: async () => "complete",
    },
  } as Gamepad;
}
describe("one action contract", () => {
  it("releases only the physical source lifted, even with aliases or another device", () => {
    const input = new Input(() => {});
    key("keydown", "KeyA");
    key("keydown", "ArrowLeft");
    key("keyup", "KeyA");
    expect(input.down("left")).toBe(true);
    input.pointer("left", 1, true);
    key("keyup", "ArrowLeft");
    expect(input.down("left")).toBe(true);
    input.pointer("left", 1, false);
    expect(input.down("left")).toBe(false);
  });
  it("does not repeat held actions through pause, blur or pointer cancellation", () => {
    let active = true;
    const input = new Input(
      () => {
        active = false;
        input.clear();
      },
      () => active,
    );
    key("keydown", "KeyD");
    key("keydown", "Escape");
    expect(input.snapshotHeld()).toEqual([]);
    active = true;
    key("keydown", "KeyD", true);
    expect(input.down("right")).toBe(false);
    key("keyup", "KeyD");
    key("keydown", "KeyD");
    expect(input.down("right")).toBe(true);
    window.dispatchEvent(new Event("blur"));
    expect(input.snapshotHeld()).toEqual([]);
    input.pointer("rewind", 2, true);
    input.pointer("rewind", 2, false);
    expect(input.down("rewind")).toBe(false);
  });
  it("uses one press edge across keyboard, pad and touch; modal gameplay is blocked", () => {
    let active = true;
    const input = new Input(
      () => {},
      () => active,
    );
    key("keydown", "KeyC");
    expect(input.consume("echo")).toBe(true);
    key("keydown", "KeyC", true);
    expect(input.consume("echo")).toBe(false);
    key("keyup", "KeyC");
    input.pollGamepad([pad()]);
    input.pollGamepad([pad([3])]);
    expect(input.consume("echo")).toBe(true);
    input.clear();
    active = false;
    key("keydown", "KeyJ");
    input.pointer("interact", 1, true);
    input.pollGamepad([pad()]);
    input.pollGamepad([pad([2])]);
    expect(input.snapshotHeld()).toEqual([]);
  });
  it("cancels a menu from a focused input and keeps modal remap capture from gameplay", () => {
    const menu = vi.fn(),
      input = new Input(menu, () => false);
    // Old input returned before handling Escape for any HTMLInputElement.
    key("keydown", "Escape");
    expect(menu).toHaveBeenCalledWith("pause");
    key("keyup", "Escape");
    input.capturing = true;
    input.onCapture = vi.fn();
    key("keydown", "Escape");
    expect(menu).toHaveBeenCalledTimes(1);
    expect(input.onCapture).toHaveBeenCalledWith("keyboard", "Escape");
  });
  it("requires neutral connection/reconnection, pauses on disconnect and rearms screen changes", () => {
    let active = true;
    const input = new Input(
      () => {
        active = false;
        input.clear();
      },
      () => active,
    );
    input.onDisconnect = vi.fn(() => {
      active = false;
    });
    input.onNavigate = vi.fn();
    input.pollGamepad([pad([0], [1, 0])]);
    expect(input.snapshotHeld()).toEqual([]);
    input.pollGamepad([pad()]);
    input.pollGamepad([pad([], [1, 0])]);
    expect(input.down("right")).toBe(true);
    input.pollGamepad([pad([9], [1, 0])]);
    expect(active).toBe(false);
    expect(input.snapshotHeld()).toEqual([]);
    input.pollGamepad([pad([0])]);
    expect(input.onNavigate).not.toHaveBeenCalled();
    input.pollGamepad([pad()]);
    input.pollGamepad([pad([0])]);
    expect(input.onNavigate).toHaveBeenCalledWith("confirm");
    input.pollGamepad([]);
    expect(input.onDisconnect).toHaveBeenCalledOnce();
    input.pollGamepad([pad([0])]);
    expect(input.onNavigate).toHaveBeenCalledTimes(1);
  });
  it("rejects conflicts atomically, cancels without changes, saves and resets remaps", () => {
    const b = new Bindings();
    expect(b.bind("interact", "keyboard", "KeyJ")).toContain("Already used");
    expect(b.keys.interact).toEqual(["KeyE"]);
    expect(b.bind("interact", "keyboard", "KeyU")).toBeNull();
    expect(new Bindings().keys.interact).toEqual(["KeyU"]);
    expect(b.bind("interact", "gamepad", 1)).toContain("Already used");
    expect(b.bind("interact", "gamepad", 11)).toBeNull();
    expect(new Bindings().pad.interact).toBe(11);
    expect(b.bind("interact", "keyboard", "Escape")).toContain("reserved");
    b.reset();
    expect(new Bindings().keys.interact).toEqual(["KeyE"]);
  });
  it("loads campaign controls independently of the standalone save opt-out and migrates options", () => {
    const g = new CampaignGame();
    expect(g.input.bindings.bind("echo", "keyboard", "KeyV")).toBeNull();
    expect(new CampaignGame().input.bindings.keys.echo).toEqual(["KeyV"]);
    expect(
      new CampaignGame({ persist: false }).input.bindings.keys.echo,
    ).toEqual(["KeyC"]);
    storage.set(
      "sands-of-time:options:v1",
      JSON.stringify({ music: false, sfx: true, shake: false, assist: true }),
    );
    expect(loadOptions()).toEqual({
      music: false,
      sfx: true,
      shake: false,
      assist: true,
      reducedMotion: false,
      largeText: false,
    });
  });
  it("input-specific prompts include new systems without stale keys", () => {
    const input = new Input(() => {});
    input.bindings.bind("interact", "keyboard", "KeyU");
    expect(
      input.describe(
        "Hold {interact} and move. {echo} replays, {cancelEcho} cancels. {rewind} rewinds.",
      ),
    ).toBe("Hold U and move. C replays, X cancels. R rewinds.");
    input.device = "gamepad";
    expect(input.prompt("interact")).toBe("X / Square");
    input.device = "touch";
    expect(input.describe("{echo} replays; {cancelEcho} cancels")).toBe(
      "Echo replays; Cancel echo cancels",
    );
  });
});

describe("crowded local interactions", () => {
  it("offers a mirror instead of resting at the nearby fountain", () => {
    const g = new CampaignGame({ persist: false });
    g.start();
    g.journey.dagger = true;
    g.abilities.add("rewind");
    g.enterRoom("mirror-reception", undefined, { x: 245, y: 594 });
    g.player.grounded = true;
    expect(g.interaction?.label).toContain("Twin mirror");
    g.interaction!.action();
    expect(g.journey.wing.era).toBe("ruined");
  });
  it("offers chamber retry beside its fountain without changing the main checkpoint", () => {
    const g = new CampaignGame({ persist: false });
    g.start();
    const checkpoint = { ...g.checkpoint };
    g.enterRoom("mastery-wall", undefined, { x: 295, y: 594 });
    expect(g.interaction?.label).toContain("Retry chamber");
    g.interaction!.action();
    expect(g.checkpoint).toEqual(checkpoint);
    expect(g.player.x).toBe(300);
  });
});

it("keeps fixed menu confirmation when Map is remapped to the face button", () => {
  const menu = vi.fn(),
    input = new Input(menu, () => false);
  input.onNavigate = vi.fn();
  input.bindings.bind("jump", "gamepad", 11);
  input.bindings.bind("map", "gamepad", 0);
  input.pollGamepad([pad()]);
  input.pollGamepad([pad([0])]);
  expect(input.onNavigate).toHaveBeenCalledWith("confirm");
  expect(menu).not.toHaveBeenCalled();
});
it.each(["blur", "hidden"])(
  "accepts the first fresh press after a key is released outside the window: %s",
  (event) => {
    const input = new Input(() => {});
    key("keydown", "KeyD");
    if (event === "blur") window.dispatchEvent(new Event("blur"));
    else {
      Object.assign(document, { hidden: true });
      document.dispatchEvent(new Event("visibilitychange"));
      Object.assign(document, { hidden: false });
    }
    window.dispatchEvent(new Event("focus"));
    // No keyup was received while the window was unfocused.
    key("keydown", "KeyD");
    expect(input.down("right")).toBe(true);
  },
);
it("substitutes only explicit action tokens and preserves the actual sun-vault prose", () => {
  const g = new CampaignGame({ persist: false });
  g.start();
  g.enterRoom("sun-vault", undefined, { x: 300, y: 594 });
  const cue = g.opening.cue(g)!;
  g.input.bindings.bind("left", "keyboard", "KeyU");
  expect(g.input.describe(cue)).toContain(
    "A missed jump lands on the safe floor.",
  );
  g.input.device = "gamepad";
  expect(g.input.describe(cue)).toContain(
    "A missed jump lands on the safe floor.",
  );
  expect(g.input.describe("A C-shaped stone. {interact} at the mirror.")).toBe(
    "A C-shaped stone. X / Square at the mirror.",
  );
});

it("formats finale hints, optional standard advice and legacy wall instructions after a jump remap", () => {
  const g = new CampaignGame({ persist: false });
  g.start();
  g.input.bindings.bind("jump", "keyboard", "KeyU");
  g.enterRoom("crown-warden", undefined, { x: 585, y: 594 });
  expect(g.input.describe(g.room.hint)).toContain("with U,");
  g.interaction!.action();
  expect(g.input.describe(g.toast)).toContain("hold U to catch");
  g.input.device = "gamepad";
  expect(g.input.describe(g.room.hint)).toContain("with A / Cross,");
  expect(g.input.describe(g.toast)).toContain("hold A / Cross to catch");
  const wall = Object.values(ROOMS).find((r) =>
    r.hint.includes("Press {jump} against"),
  )!;
  expect(g.input.describe(wall.hint)).toContain("Press A / Cross against");
});
