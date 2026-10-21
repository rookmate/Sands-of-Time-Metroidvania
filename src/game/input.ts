export type Action =
  | "left"
  | "right"
  | "jump"
  | "down"
  | "attack"
  | "interact"
  | "rewind"
  | "slow"
  | "freeze"
  | "dash"
  | "map"
  | "pause";
const BINDINGS: Record<string, Action> = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
  KeyW: "jump",
  ArrowUp: "jump",
  KeyS: "down",
  ArrowDown: "down",
  KeyJ: "attack",
  KeyK: "attack",
  KeyE: "interact",
  KeyR: "rewind",
  KeyQ: "slow",
  KeyF: "freeze",
  ShiftLeft: "dash",
  ShiftRight: "dash",
  KeyM: "map",
  Escape: "pause",
};
export class Input {
  private held = new Set<Action>();
  private pressed = new Set<Action>();
  constructor(
    private onMenu: (action: "map" | "pause") => void,
    private active: () => boolean = () => true,
  ) {
    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement) return;
      const action = BINDINGS[event.code];
      if (!action) return;
      if (action === "map" || action === "pause") {
        event.preventDefault();
        if (!event.repeat) this.onMenu(action);
        return;
      }
      if (!this.active()) return;
      event.preventDefault();
      if (!event.repeat) this.press(action);
    });
    window.addEventListener("keyup", (event) => {
      const action = BINDINGS[event.code];
      if (action) this.release(action);
    });
    window.addEventListener("blur", () => this.clear());
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
  }
}
