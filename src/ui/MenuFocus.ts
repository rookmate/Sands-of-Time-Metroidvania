import type { MenuInput } from "../game/input";

// Menus use their real DOM controls for keyboard, touch and pad activation.
export class MenuFocus {
  constructor(
    private root: HTMLElement,
    private cancel: () => void,
  ) {
    root.addEventListener("keydown", (event) => {
      if (!this.root.childElementCount) return;
      if (
        ["ArrowUp", "ArrowDown"].includes(event.key) &&
        !(event.target instanceof HTMLSelectElement)
      ) {
        event.preventDefault();
        this.navigate(event.key === "ArrowUp" ? "up" : "down");
        return;
      }
      if (event.key !== "Tab") return;
      const controls = this.controls();
      const at = controls.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && at <= 0) {
        event.preventDefault();
        controls.at(-1)?.focus();
      } else if (!event.shiftKey && (at < 0 || at === controls.length - 1)) {
        event.preventDefault();
        controls[0]?.focus();
      }
    });
  }
  private controls() {
    return Array.from(
      this.root.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), summary",
      ),
    ).filter((e) => e.getClientRects().length > 0 && !e.closest("[inert]"));
  }
  navigate(action: MenuInput) {
    if (action === "cancel") {
      this.cancel();
      return;
    }
    const controls = this.controls();
    const focused = document.activeElement as HTMLElement;
    const at = controls.indexOf(focused);
    if (action === "confirm") {
      if (at >= 0) focused.click();
      else controls[0]?.focus();
      return;
    }
    if (
      focused instanceof HTMLSelectElement &&
      (action === "left" || action === "right")
    ) {
      focused.selectedIndex = Math.max(
        0,
        Math.min(
          focused.options.length - 1,
          focused.selectedIndex + (action === "left" ? -1 : 1),
        ),
      );
      focused.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const next =
      (at + (action === "up" || action === "left" ? -1 : 1) + controls.length) %
      controls.length;
    controls[next]?.focus();
  }
}
