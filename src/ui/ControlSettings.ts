import {
  ACTIONS,
  ACTION_NAMES,
  DEFAULT_PAD,
  keyName,
  PAD_NAMES,
  type Action,
} from "../game/actions";
import type { Input } from "../game/input";

export class ControlSettings {
  private pending: { action: Action; device: "keyboard" | "gamepad" } | null =
    null;
  constructor(
    private panel: HTMLElement,
    private input: Input,
  ) {
    this.render();
    input.onCapture = (device, value) => {
      if (
        (device === "keyboard" && value === "Escape") ||
        (device === "gamepad" && value === 9)
      ) {
        this.cancel();
        return;
      }
      if (!this.pending || device !== this.pending.device) return;
      const error = input.bindings.bind(this.pending.action, device, value);
      if (error) {
        this.status(error);
        return;
      }
      this.cancel();
    };
    panel.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "button",
      );
      if (!button) return;
      if (button.dataset.bind) {
        this.pending = {
          action: button.dataset.bind as Action,
          device: button.dataset.device as "keyboard" | "gamepad",
        };
        input.clear();
        input.capturing = true;
        this.status(
          `Press a ${this.pending.device === "keyboard" ? "key" : "controller button"} for ${ACTION_NAMES[this.pending.action]}. Escape, Menu / Start or Cancel leaves it unchanged.`,
        );
        panel.querySelector<HTMLButtonElement>("[data-cancel-bind]")!.hidden =
          false;
      } else if (button.hasAttribute("data-cancel-bind")) this.cancel();
      else if (button.hasAttribute("data-reset-bind")) {
        input.bindings.reset();
        this.cancel();
        panel.querySelector<HTMLButtonElement>("[data-reset-bind]")?.focus();
      }
    });
  }
  dispose() {
    this.input.capturing = false;
    this.input.onCapture = () => {};
    this.input.clear();
  }
  private status(text: string) {
    const status = this.panel.querySelector<HTMLElement>(
      "[data-binding-status]",
    )!;
    status.textContent = text;
    status.scrollIntoView({ block: "nearest" });
  }
  private cancel() {
    const pending = this.pending;
    this.pending = null;
    this.input.capturing = false;
    this.input.clear();
    this.render();
    if (pending)
      this.panel
        .querySelector<HTMLButtonElement>(
          `[data-bind="${pending.action}"][data-device="${pending.device}"]`,
        )
        ?.focus();
  }
  private render() {
    this.panel.innerHTML = `<h3>Controls</h3><p>Choose a binding, then press a key or controller button. Conflicts keep the current binding. Escape and Menu / Start stay Back; the left stick and D-pad keep movement. Menus use D-pad or stick to focus, A / Cross to select, B / Circle to go back. Left / right changes an atlas room selector. Standard-mapped controllers only.</p><div class="binding-list">${ACTIONS.map((action) => `<div class="binding-row"><span>${ACTION_NAMES[action]}</span><button type="button" data-bind="${action}" data-device="keyboard" aria-label="Keyboard: ${ACTION_NAMES[action]}" ${action === "pause" ? "disabled" : ""}>${this.input.bindings.keys[action].map(keyName).join(" / ")}</button>${action in DEFAULT_PAD ? `<button type="button" data-bind="${action}" data-device="gamepad" aria-label="Controller: ${ACTION_NAMES[action]}" ${action === "pause" ? "disabled" : ""}>${PAD_NAMES[this.input.bindings.pad[action]!]}</button>` : "<span>Left stick / D-pad</span>"}</div>`).join("")}</div><p role="status" data-binding-status>Bindings save automatically in this browser.</p><button type="button" data-cancel-bind hidden>Cancel binding</button><button type="button" data-reset-bind>Reset all controls</button><p>Controller disconnected? Play pauses. Reconnect, release every control, then select Resume. Audio may require a keyboard or screen tap before a controller can play sound.</p>`;
  }
}
