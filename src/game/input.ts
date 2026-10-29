import {
  ACTIONS,
  Bindings,
  PAD_NAMES,
  keyName,
  type Action,
  type Device,
} from "./actions";
export type { Action } from "./actions";
export type MenuInput = "up" | "down" | "left" | "right" | "confirm" | "cancel";
export class Input {
  private held = new Set<Action>();
  private pressed = new Set<Action>();
  private sources = new Map<string, Action>();
  private keysDown = new Set<string>();
  private padDown = new Set<string>();
  private padId: string | null = null;
  private padReady = false;
  private focused = true;
  device: Device = "keyboard";
  readonly bindings: Bindings;
  onNavigate: (action: MenuInput) => void = () => {};
  onDisconnect: () => void = () => {};
  onCapture: (device: "keyboard" | "gamepad", value: string | number) => void =
    () => {};
  capturing = false;
  constructor(
    private onMenu: (action: "map" | "pause") => void,
    private active: () => boolean = () => true,
    persist = true,
  ) {
    this.bindings = new Bindings(persist);
    window.addEventListener("keydown", (event) => {
      this.device = "keyboard";
      if (this.capturing) {
        event.preventDefault();
        if (!event.repeat) this.onCapture("keyboard", event.code);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const fresh = !this.keysDown.has(event.code) && !event.repeat;
      this.keysDown.add(event.code);
      const action = ACTIONS.find((a) =>
        this.bindings.keys[a].includes(event.code),
      );
      // Cancellation works even with an options checkbox or select focused.
      if (
        event.code === "Escape" ||
        (!this.active() &&
          action === "map" &&
          ![
            "Tab",
            "Enter",
            "Space",
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
          ].includes(event.code) &&
          !(
            typeof Element !== "undefined" &&
            event.target instanceof Element &&
            event.target.matches("input, select, textarea, [contenteditable]")
          ))
      ) {
        event.preventDefault();
        if (fresh) this.onMenu(event.code === "Escape" ? "pause" : "map");
        return;
      }
      if (!this.active()) return;
      if (!action) return;
      event.preventDefault();
      if (fresh) this.dispatch(action, `key:${event.code}`);
    });
    window.addEventListener("keyup", (event) => {
      this.keysDown.delete(event.code);
      this.releaseSource(`key:${event.code}`);
    });
    window.addEventListener("blur", () => {
      this.focused = false;
      this.keysDown.clear();
      this.clear();
    });
    window.addEventListener("focus", () => {
      this.focused = true;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.keysDown.clear();
        this.clear();
      }
    });
  }
  prompt(action: Action, compact = false): string {
    if (compact && this.device === "touch" && action === "cancelEcho")
      return "Cancel";
    if (this.device === "touch")
      return {
        left: "Left",
        right: "Right",
        jump: "Jump",
        down: "Down",
        attack: "Sword",
        interact: "Interact",
        rewind: "Rewind",
        slow: "Slow",
        freeze: "Freeze",
        dash: "Dash",
        echo: "Echo",
        cancelEcho: "Cancel echo",
        map: "Map",
        pause: "Pause",
      }[action];
    if (this.device === "gamepad") {
      const button = this.bindings.pad[action];
      if (compact && button !== undefined)
        return [
          "A/×",
          "B/○",
          "X/□",
          "Y/△",
          "LB",
          "RB",
          "LT",
          "RT",
          "View",
          "Menu",
          "L3",
          "R3",
        ][button];
      return button === undefined
        ? action === "left"
          ? "Stick left"
          : action === "right"
            ? "Stick right"
            : "Stick down"
        : PAD_NAMES[button];
    }
    return keyName(this.bindings.keys[action][0]);
  }
  describe(text: string): string {
    return text.replace(/\{([a-zA-Z]+)\}/g, (token, name: string) => {
      const action = ACTIONS.find((a) => a === name);
      return action ? this.prompt(action) : token;
    });
  }

  private dispatch(action: Action, source: string) {
    if (action === "pause" || action === "map") {
      this.onMenu(action);
      return;
    }
    if (!this.active()) return;
    this.sources.set(source, action);
    this.press(action);
  }
  private releaseSource(source: string) {
    const action = this.sources.get(source);
    this.sources.delete(source);
    if (action && ![...this.sources.values()].includes(action))
      this.release(action);
  }
  pointer(action: Action, id: number, down: boolean) {
    this.device = "touch";
    const source = `pointer:${id}`;
    if (down) this.dispatch(action, source);
    else this.releaseSource(source);
  }
  // Poll once per rendered frame, before simulation. New/reconnected pads must
  // become neutral before accepting input. Screen transitions also rearm here.
  pollGamepad(
    pads: readonly (Gamepad | null)[] = navigator.getGamepads?.() ?? [],
  ) {
    const pad = pads.find((p) => p?.connected && p.mapping === "standard");
    const id = pad ? `${pad.index}:${pad.id}` : null;
    if (id !== this.padId) {
      const disconnected = this.padId !== null;
      this.padId = id;
      this.clear();
      if (disconnected) this.onDisconnect();
    }
    if (!pad) return;
    const down = new Set<string>();
    pad.buttons.forEach((b, i) => {
      if (b.pressed || b.value > 0.5) down.add(`b${i}`);
    });
    if (pad.axes[0] < -0.55) down.add("left");
    if (pad.axes[0] > 0.55) down.add("right");
    if (pad.axes[1] < -0.55) down.add("up");
    if (pad.axes[1] > 0.55) down.add("down");
    if (!this.focused || document.hidden) {
      this.clear();
      return;
    }
    if (!this.padReady) {
      this.padDown = down;
      if (down.size === 0) this.padReady = true;
      return;
    }
    const previous = this.padDown;
    this.padDown = down;
    const fresh = [...down].filter((b) => !previous.has(b));
    if (fresh.length) this.device = "gamepad";
    for (const b of previous) if (!down.has(b)) this.releaseSource(`pad:${b}`);
    if (this.capturing) {
      const button = fresh.find((b) => /^b\d+$/.test(b));
      if (button) this.onCapture("gamepad", Number(button.slice(1)));
      return;
    }
    if (!this.active()) {
      const navigation: Record<string, MenuInput> = {
        left: "left",
        right: "right",
        up: "up",
        down: "down",
        b12: "up",
        b13: "down",
        b14: "left",
        b15: "right",
        b0: "confirm",
        b1: "cancel",
        b9: "cancel",
      };
      for (const b of fresh) {
        if (!this.padReady) break;
        if (navigation[b]) this.onNavigate(navigation[b]);
        else if (b === `b${this.bindings.pad.map}`) this.onMenu("map");
      }
      return;
    }
    for (const b of fresh) {
      if (!this.padReady) break;
      const action =
        (
          {
            left: "left",
            right: "right",
            down: "down",
            b13: "down",
            b14: "left",
            b15: "right",
          } as Partial<Record<string, Action>>
        )[b] ??
        ACTIONS.find(
          (a) =>
            this.bindings.pad[a] !== undefined &&
            b === `b${this.bindings.pad[a]}`,
        );
      if (action) this.dispatch(action, `pad:${b}`);
    }
  }
  press(action: Action) {
    if (!this.held.has(action)) this.pressed.add(action);
    this.held.add(action);
  }
  release(action: Action) {
    this.held.delete(action);
  }
  down(action: Action) {
    return this.held.has(action);
  }
  consume(action: Action) {
    const value = this.pressed.has(action);
    this.pressed.delete(action);
    return value;
  }
  endStep() {
    this.pressed.clear();
  }
  snapshotPressed() {
    return [...this.pressed];
  }
  snapshotHeld() {
    return [...this.held];
  }
  restoreHeld(actions: Action[]) {
    this.held = new Set(actions);
    this.pressed.clear();
  }
  clear() {
    this.held.clear();
    this.pressed.clear();
    this.sources.clear();
    this.padReady = false;
  }
}
