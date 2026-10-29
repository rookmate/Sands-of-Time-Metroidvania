export const ACTIONS = [
  "left",
  "right",
  "jump",
  "down",
  "attack",
  "interact",
  "rewind",
  "slow",
  "freeze",
  "dash",
  "echo",
  "cancelEcho",
  "map",
  "pause",
] as const;
export type Action = (typeof ACTIONS)[number];
export type Device = "keyboard" | "gamepad" | "touch";
export const ACTION_NAMES: Record<Action, string> = {
  left: "Move left",
  right: "Move right",
  jump: "Jump / climb",
  down: "Drop / slide",
  attack: "Sword strike",
  interact: "Interact / push",
  rewind: "Hold rewind",
  slow: "Slow time",
  freeze: "Sand prison",
  dash: "Time dash",
  echo: "Record / replay echo",
  cancelEcho: "Cancel echo",
  map: "Palace map",
  pause: "Pause / back",
};
export const DEFAULT_KEYS: Record<Action, string[]> = {
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  jump: ["Space", "KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  attack: ["KeyJ", "KeyK"],
  interact: ["KeyE"],
  rewind: ["KeyR"],
  slow: ["KeyQ"],
  freeze: ["KeyF"],
  dash: ["ShiftLeft", "ShiftRight"],
  echo: ["KeyC"],
  cancelEcho: ["KeyX"],
  map: ["KeyM"],
  pause: ["Escape"],
};
export const DEFAULT_PAD: Partial<Record<Action, number>> = {
  jump: 0,
  attack: 1,
  interact: 2,
  echo: 3,
  slow: 4,
  dash: 5,
  rewind: 6,
  freeze: 7,
  map: 8,
  pause: 9,
  cancelEcho: 10,
};
export const PAD_NAMES = [
  "A / Cross",
  "B / Circle",
  "X / Square",
  "Y / Triangle",
  "LB / L1",
  "RB / R1",
  "LT / L2",
  "RT / R2",
  "View / Select",
  "Menu / Start",
  "L stick",
  "R stick",
  "D-pad up",
  "D-pad down",
  "D-pad left",
  "D-pad right",
];
export function keyName(code: string) {
  return code
    .replace(/^Key/, "")
    .replace(/^Digit/, "")
    .replace("ShiftLeft", "L Shift")
    .replace("ShiftRight", "R Shift")
    .replace("Arrow", "");
}
const SLOT = "sands-of-time:controls:v1";
export class Bindings {
  revision = 0;
  keys = structuredClone(DEFAULT_KEYS);
  pad = { ...DEFAULT_PAD };
  constructor(private persist = true) {
    if (!persist) return;
    try {
      const data = JSON.parse(localStorage.getItem(SLOT) ?? "null");
      if (!data) return;
      const codes = new Set<string>(),
        buttons = new Set<number>();
      if (
        !ACTIONS.every(
          (a) =>
            Array.isArray(data.keys?.[a]) &&
            data.keys[a].length > 0 &&
            data.keys[a].every(
              (c: unknown) =>
                typeof c === "string" &&
                validKey(c) &&
                !codes.has(c) &&
                !!codes.add(c),
            ),
        )
      )
        return;
      if (
        !Object.keys(DEFAULT_PAD).every((a) => {
          const b = data.pad?.[a];
          return (
            Number.isInteger(b) &&
            b >= 0 &&
            b <= 11 &&
            !buttons.has(b) &&
            !!buttons.add(b)
          );
        })
      )
        return;
      // Escape is always a way out of a menu and cannot become gameplay input.
      if (data.keys.pause[0] !== "Escape" || data.keys.pause.length !== 1)
        return;
      if (data.pad.pause !== DEFAULT_PAD.pause) return;
      this.keys = data.keys;
      this.pad = data.pad;
    } catch {
      /* Defaults remain usable when storage is blocked or invalid. */
    }
  }
  bind(
    action: Action,
    device: "keyboard" | "gamepad",
    value: string | number,
  ): string | null {
    if (device === "keyboard") {
      if (action === "pause" || value === "Escape")
        return "Escape is reserved for cancel / back.";
      if (typeof value !== "string" || !validKey(value))
        return "Use a letter, number, arrow or supported keyboard key. Browser shortcuts are unavailable.";
      const conflict = ACTIONS.find(
        (a) => a !== action && this.keys[a].includes(value),
      );
      if (conflict)
        return `Already used by ${ACTION_NAMES[conflict]}. Choose another key or reset controls.`;
      this.keys[action] = [value];
    } else {
      if (action === "pause")
        return "Menu / Start is reserved for cancel / back.";
      if (
        !(action in DEFAULT_PAD) ||
        typeof value !== "number" ||
        value < 0 ||
        value > 11 ||
        !Number.isInteger(value)
      )
        return "Use a face, shoulder, trigger, menu or stick button.";
      const conflict = ACTIONS.find(
        (a) => a !== action && this.pad[a] === value,
      );
      if (conflict)
        return `Already used by ${ACTION_NAMES[conflict]}. Choose another button or reset controls.`;
      this.pad[action] = value;
    }
    this.save();
    return null;
  }
  reset() {
    this.keys = structuredClone(DEFAULT_KEYS);
    this.pad = { ...DEFAULT_PAD };
    this.save();
  }
  private save() {
    this.revision++;
    if (this.persist)
      try {
        localStorage.setItem(
          SLOT,
          JSON.stringify({ keys: this.keys, pad: this.pad }),
        );
      } catch {
        /* Session bindings still work. */
      }
  }
}
function validKey(code: string) {
  return /^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Enter|Tab|Backspace|Escape|Comma|Period|Slash|Semicolon|Quote|Bracket(Left|Right)|Backslash|Minus|Equal)$/.test(
    code,
  );
}
