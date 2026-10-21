import { HARNESS_STEP, Harness, type Scenario } from "./Harness";
import "./harness.css";

export class BrowserHarness {
  readonly harness: Harness;
  private speed: number;
  private manual = false;
  private toolbar: HTMLElement | null = null;
  private clock = 0;
  constructor(params: URLSearchParams) {
    const requested = params.get("harness");
    const scenario: Scenario =
      requested === "guardian" || requested === "vizier"
        ? requested
        : "campaign";
    this.harness = new Harness({
      scenario,
      immortal: params.get("immortal") !== "0",
      explore: params.get("explore") !== "0",
    });
    const speed = Number(params.get("speed") ?? 1);
    this.speed = [1, 4, 16].includes(speed) ? speed : 1;
    if (params.get("autoplay") === "0") this.harness.pause();
  }
  mount(root: HTMLElement) {
    const bar = document.createElement("section");
    bar.className = "harness-toolbar";
    bar.setAttribute("aria-label", "Game test harness");
    bar.innerHTML = `
      <div class="harness-controls">
        <strong>Test harness</strong>
        <label>Run <select name="scenario"><option value="campaign">Entire game</option><option value="guardian">Sand Guardian</option><option value="vizier">Vizier</option></select></label>
        <label><input name="immortal" type="checkbox"> Immortal</label>
        <label>Speed <select name="speed"><option value="1">1×</option><option value="4">4×</option><option value="16">16×</option></select></label>
        <button type="button" data-control="restart">Restart</button>
        <button type="button" data-control="pause">Pause</button>
        <button type="button" data-control="step">Step</button>
        <button type="button" data-control="manual">Play manually</button>
        <button type="button" data-control="report">Save report</button>
      </div>
      <output aria-live="off"></output>`;
    const scenario = bar.querySelector<HTMLSelectElement>('[name="scenario"]')!;
    const immortal = bar.querySelector<HTMLInputElement>('[name="immortal"]')!;
    const speed = bar.querySelector<HTMLSelectElement>('[name="speed"]')!;
    scenario.value = this.harness.scenario;
    immortal.checked = this.harness.immortal;
    speed.value = String(this.speed);
    const restart = () => {
      const url = new URL(location.href);
      url.searchParams.set("harness", scenario.value);
      url.searchParams.set("immortal", immortal.checked ? "1" : "0");
      url.searchParams.set("speed", speed.value);
      url.searchParams.delete("autoplay");
      location.assign(url.href);
    };
    scenario.addEventListener("change", restart);
    immortal.addEventListener("change", restart);
    speed.addEventListener("change", () => {
      this.speed = Number(speed.value);
    });
    bar.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "button[data-control]",
      );
      switch (button?.dataset.control) {
        case "restart":
          restart();
          break;
        case "pause":
          if (this.harness.status === "running") this.harness.pause();
          else this.harness.resume();
          break;
        case "step":
          this.harness.pause();
          this.harness.step();
          break;
        case "manual":
          this.harness.pause();
          this.harness.game.input.clear();
          this.manual = true;
          break;
        case "report": {
          const blob = new Blob(
            [JSON.stringify(this.harness.report(), null, 2)],
            { type: "application/json" },
          );
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `sands-${this.harness.scenario}-report.json`;
          link.click();
          URL.revokeObjectURL(url);
          break;
        }
      }
      this.refresh();
    });
    root.append(bar);
    this.toolbar = bar;
    this.refresh();
    Object.assign(window, { __sandsHarness: this.harness });
  }
  advance() {
    if (this.harness.game.orientationBlocked) return;
    if (this.manual) this.harness.game.update(HARNESS_STEP);
    else if (this.harness.status === "running") this.harness.step(this.speed);
    if (++this.clock % 12 === 0) this.refresh();
  }
  private refresh() {
    if (!this.toolbar) return;
    const report = this.harness.report();
    this.toolbar.querySelector("output")!.textContent = this.manual
      ? `Manual play · ${report.room} · ${report.immortal ? "immortal" : "mortal"} · restart to run automation again`
      : (report.error ??
        `${report.status} · ${report.room} · step ${report.step}/${report.totalSteps} · ${report.seconds.toFixed(1)}s · ${report.rooms.length}/12 rooms · ${report.action}`);
    const terminal = report.status === "passed" || report.status === "failed";
    for (const control of ["pause", "step", "manual"]) {
      this.toolbar.querySelector<HTMLButtonElement>(
        `[data-control="${control}"]`,
      )!.disabled = this.manual || terminal;
    }
    this.toolbar.querySelector('[data-control="pause"]')!.textContent =
      report.status === "paused" ? "Resume" : "Pause";
  }
}
