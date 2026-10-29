import { CampaignGame } from "../campaign/CampaignGame";
import type { Game } from "../game/Game";
import type { Options, Screen } from "../game/types";
import { ABILITIES, ORDER } from "../game/progression";
import { icons } from "./icons";
import { ExplorerMap } from "./ExplorerMap";
import { mapMarkup } from "./map";
import { MenuFocus } from "./MenuFocus";
import { ControlSettings } from "./ControlSettings";
import type { Action } from "../game/input";
import { enemyName } from "../game/enemies";
const key = (text: string) => `<kbd>${text}</kbd>`;
export class UI {
  private overlay: HTMLElement;
  private hud: HTMLElement;
  private lastScreen: Screen | null = null;
  private hudClock = 0;
  private lastHudMarkup = "";
  private resumeAfterRotate = false;
  private controls: ControlSettings | null = null;
  private lastDevice = "";
  private focusReturn = new Map<Screen, string>();
  constructor(
    private root: HTMLElement,
    private readonly currentGame: () => Game,
  ) {
    root.innerHTML = `
      <header class="site-header"><a class="brand" href="#" aria-label="Sands of Time title screen">${icons.dagger}<span>SANDS <i>OF</i> TIME</span></a>
      <span class="header-note">A PRINCE’S JOURNEY</span>
      <nav aria-label="Game controls"><button class="icon-button" id="sound-toggle" aria-label="Mute audio">${icons.sound}</button><button class="icon-button" id="help-open" aria-label="How to play"><span class="help-icon">?</span></button><span class="nav-divider"></span><button class="icon-button" id="fullscreen" aria-label="Toggle fullscreen">${icons.fullscreen}</button></nav></header>
      <main class="game-shell"><div class="game-stage" id="stage"><canvas id="game" aria-label="Sands of Time game. Open How to play for controls. Visual action game; canvas gameplay has no screen reader navigation."></canvas>
      <div id="hud" class="hud" hidden></div><div id="overlay" class="overlay"></div>
      <div class="touch-controls" id="touch-controls" hidden><div><button data-hold="left" aria-label="Move left">◁</button><button data-hold="right" aria-label="Move right">▷</button><button data-hold="rewind" aria-label="Hold rewind">↶</button><button data-hold="down" aria-label="Drop or slide mirror">↓</button></div><div><button data-hold="interact" aria-label="Interact">Use</button><button data-hold="attack" aria-label="Attack">⚔</button><button data-hold="jump" aria-label="Jump">↑</button></div></div>
      </div></main>
      <footer class="site-footer"><div class="footer-controls"><span>${key(this.game.input.prompt("left"))}${key(this.game.input.prompt("right"))} Move</span><span>${key(this.game.input.prompt("jump"))} Jump</span><span>${key(this.game.input.prompt("attack"))} Attack</span><span>${key(this.game.input.prompt("interact"))} Interact</span><span>${key(this.game.input.prompt("map"))} Map</span></div><span class="footer-message">Every grain holds a second chance.</span><button id="footer-pause" class="text-button">${key(this.game.input.prompt("pause"))} Pause</button></footer>`;
    // Reattempt unlock on genuine interaction, including Resume after device interruption.
    root.addEventListener("pointerdown", () => this.game.sound.start());
    window.addEventListener("keydown", () => this.game.sound.start());
    this.overlay = root.querySelector("#overlay")!;
    this.hud = root.querySelector("#hud")!;
    const focus = new MenuFocus(this.overlay, () => this.game.menuKey("pause"));
    this.game.input.onNavigate = (action) => {
      if (!this.game.orientationBlocked) focus.navigate(action);
    };
    this.game.input.onDisconnect = () => {
      if (this.game.screen === "playing") this.game.setScreen("pause");
      this.game.notify(
        "Controller disconnected. Reconnect and release controls, or use keyboard / touch.",
      );
    };
    root.querySelector(".brand")!.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.game.screen === "playing") this.game.setScreen("pause");
      else if (this.game.screen === "title") return;
    });
    root.querySelector("#sound-toggle")!.addEventListener("click", () => {
      const on = !(this.game.options.music || this.game.options.sfx);
      this.game.setOption("music", on);
      this.game.setOption("sfx", on);
      this.game.sound.start();
      this.updateAudio();
    });
    root.querySelector("#help-open")!.addEventListener("click", () => {
      if (this.game.screen === "playing") this.game.setScreen("pause");
      this.game.openSubmenu("help");
    });
    root.querySelector("#fullscreen")!.addEventListener("click", () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else
        void root
          .requestFullscreen()
          .catch(() =>
            this.game.notify("Fullscreen is unavailable in this browser."),
          );
    });
    root
      .querySelector("#footer-pause")!
      .addEventListener("click", () => this.game.menuKey("pause"));
    this.overlay.addEventListener("click", (event) => this.handleClick(event));
    this.hud.addEventListener("click", (event) => this.handleClick(event));
    this.hud.addEventListener("pointerdown", (event) => {
      if (!(event.target as Element).closest('[data-power="rewind"]')) return;
      event.preventDefault();
      this.hud.setPointerCapture(event.pointerId);
      this.game.input.pointer("rewind", event.pointerId, true);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      this.hud.addEventListener(type, (event) =>
        this.game.input.pointer(
          "rewind",
          (event as PointerEvent).pointerId,
          false,
        ),
      );
    this.overlay.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.dataset.option) {
        this.game.setOption(
          target.dataset.option as keyof Options,
          target.checked,
        );
        this.updateAudio();
      }
    });
    root
      .querySelectorAll<HTMLButtonElement>("[data-hold]")
      .forEach((button) => {
        const action = button.dataset.hold as Action;
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          button.setPointerCapture(event.pointerId);
          this.game.input.pointer(action, event.pointerId, true);
        });
        for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
          button.addEventListener(type, (event) =>
            this.game.input.pointer(
              action,
              (event as PointerEvent).pointerId,
              false,
            ),
          );
      });
    root.insertAdjacentHTML(
      "beforeend",
      `<section class="rotation-prompt" role="status" aria-live="polite" hidden>
      <div class="rotation-brand">${icons.dagger}<span>SANDS OF TIME</span></div>
      <svg class="rotation-icon" viewBox="0 0 100 100" fill="none" aria-hidden="true"><rect x="19" y="33" width="62" height="35" rx="5" stroke="currentColor" stroke-width="1.5"/><path d="M26 43v15M74 43v15M30 20a36 36 0 0 1 53 9m0-12v12H71M70 81a36 36 0 0 1-53-9m0 12V72h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="m45 44 10 7-10 7" stroke="currentColor" stroke-width="1.5"/></svg>
      <h2>Rotate to landscape</h2><p>The palace needs a wider view.<br>Turn your device to continue.</p><span class="rotation-note">Your journey waits for you.</span>
    </section>`,
    );
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const syncOrientation = () => this.syncOrientation(coarsePointer.matches);
    window.addEventListener("resize", syncOrientation);
    coarsePointer.addEventListener("change", syncOrientation);
    syncOrientation();
    this.updateAudio();
    this.update(0);
  }
  private get game() {
    return this.currentGame();
  }
  private syncOrientation(coarsePointer: boolean) {
    const portrait = window.innerHeight > window.innerWidth;
    const mobile =
      coarsePointer ||
      (portrait
        ? window.innerWidth <= 760
        : window.innerWidth <= 960 && window.innerHeight <= 600);
    const blocked = mobile && portrait;
    this.root.classList.toggle("mobile-layout", mobile);
    this.root.classList.toggle("rotate-required", blocked);
    this.root.querySelector<HTMLElement>(".rotation-prompt")!.hidden = !blocked;
    this.root
      .querySelectorAll<HTMLElement>(".site-header, .game-shell, .site-footer")
      .forEach((element) => {
        element.inert = blocked;
      });
    if (blocked) this.game.input.clear();
    this.game.orientationBlocked = blocked;
    if (blocked && this.game.screen === "playing") {
      this.resumeAfterRotate = true;
      this.game.setScreen("pause");
    } else if (!blocked && this.resumeAfterRotate) {
      this.resumeAfterRotate = false;
      if (this.game.screen === "pause") this.game.setScreen("playing");
    }
  }
  private updateAudio() {
    const button = this.root.querySelector("#sound-toggle")!;
    const on = this.game.options.music || this.game.options.sfx;
    button.innerHTML = on ? icons.sound : icons.muted;
    button.setAttribute("aria-label", on ? "Mute audio" : "Enable audio");
  }
  private handleClick(event: Event) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-action]",
    );
    if (!button) return;
    const game = this.game;
    switch (button.dataset.action) {
      case "start":
        game.start();
        break;
      case "continue":
        game.start(true);
        break;
      case "resume":
        game.setScreen("playing");
        break;
      case "map":
        game.menuKey("map");
        break;
      case "pause":
        game.menuKey("pause");
        break;
      case "help":
        game.openSubmenu("help");
        break;
      case "options":
        game.openSubmenu("options");
        break;
      case "back":
        game.setScreen(game.previousScreen);
        break;
      case "story":
        game.closeStory();
        break;
      case "retry":
        game.respawn();
        break;
      case "rewind-death":
        game.emergencyRewind();
        break;
      case "title":
        game.save(false);
        game.setScreen("title");
        break;
      case "explore":
        game.setScreen("playing");
        game.notify(
          "The palace is yours again. Find the chambers you left behind.",
        );
        break;
      case "power": {
        const action = button.dataset.power as
          "rewind" | "slow" | "freeze" | "dash" | "echo" | "cancelEcho";
        if (
          game.screen !== "playing" ||
          game.orientationBlocked ||
          action === "rewind"
        )
          break;
        game.input.release(action);
        game.input.press(action);
        game.input.release(action);
        break;
      }
    }
  }
  update(dt: number) {
    const g = this.game;
    this.root.classList.toggle("reduced-motion", g.options.reducedMotion);
    this.root.classList.toggle("large-text", g.options.largeText);
    this.root
      .querySelectorAll<HTMLElement>(
        ".site-header, .site-footer, #hud, #touch-controls",
      )
      .forEach(
        (e) => (e.inert = g.screen !== "playing" || g.orientationBlocked),
      );
    if (this.lastDevice !== `${g.input.device}:${g.input.bindings.revision}`) {
      this.lastDevice = `${g.input.device}:${g.input.bindings.revision}`;
      this.root.querySelector(".footer-controls")!.innerHTML = (
        ["left", "right", "jump", "attack", "interact", "map"] as Action[]
      )
        .map((a) => `<span>${key(g.input.prompt(a))} ${a}</span>`)
        .join("");
      this.root.querySelector("#footer-pause")!.innerHTML =
        `${key(g.input.prompt("pause"))} Pause`;
      this.overlay.querySelectorAll<HTMLElement>("[data-prompt]").forEach(
        (e) =>
          (e.textContent = e.dataset
            .prompt!.split(",")
            .map((a) => g.input.prompt(a as Action))
            .join(" / ")),
      );
      this.overlay
        .querySelectorAll<HTMLElement>("[data-control-copy]")
        .forEach(
          (e) =>
            (e.textContent = g.input.describe(
              decodeURIComponent(e.dataset.controlCopy!),
            )),
        );
      this.hudClock = 1;
    }
    if (this.lastScreen !== g.screen) {
      const initial = this.lastScreen === null;
      if (this.lastScreen && this.overlay.contains(document.activeElement)) {
        const active = document.activeElement as HTMLElement;
        const action = active.dataset.action;
        if (action)
          this.focusReturn.set(this.lastScreen, `[data-action="${action}"]`);
      }
      this.controls?.dispose();
      this.controls = null;
      this.lastScreen = g.screen;
      this.root.dataset.screen = g.screen;
      this.renderScreen();
      this.hud.hidden = !["playing", "pause", "map", "story"].includes(
        g.screen,
      );
      this.overlay.classList.toggle("empty", g.screen === "playing");
      this.root.querySelector<HTMLElement>("#touch-controls")!.hidden =
        g.screen !== "playing";
      this.hudClock = 1;

      if (g.screen !== "playing") {
        const panel = this.overlay.querySelector<HTMLElement>(
          ".modal-backdrop > div, .title-screen",
        );
        panel?.setAttribute("role", "dialog");
        panel?.setAttribute("aria-modal", "true");
        if (!panel?.hasAttribute("aria-label"))
          panel?.setAttribute("aria-label", g.screen);
        this.overlay
          .querySelector<HTMLElement>(
            this.focusReturn.get(g.screen) ?? "button",
          )
          ?.focus({ preventScroll: true });
      } else if (!initial && document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    }
    this.hudClock += dt;
    if (this.hudClock > 0.09) {
      this.hudClock = 0;
      this.renderHUD();
    }
  }
  private renderScreen() {
    const g = this.game;
    const ROOM_COUNT = Object.keys(g.rooms).length;
    switch (g.screen) {
      case "playing":
        this.overlay.innerHTML = "";
        break;
      case "title":
        this.overlay.innerHTML = `<section class="title-screen"><div class="title-content"><div class="title-kicker"><span></span> THE SANDS REMEMBER</div><h1>SANDS<span>OF TIME</span></h1><div class="title-ornament"><span></span>✧<span></span></div><p class="title-description">A stolen Dagger. A palace lost to the Sands.<br>Follow the Prince and Farah through the story.</p><div class="title-actions">
        ${g.saved ? '<button class="journey-button" data-action="continue"><span>Continue journey</span><span>→</span></button>' : ""}
        <button class="${g.saved ? "menu-link" : "journey-button"}" data-action="start"><span>${g.saved ? "Begin a new journey" : "Begin your journey"}</span><span>→</span></button>
        <button class="menu-link" data-action="help">How to play <span>↗</span></button><button class="menu-link" data-action="options">Options <span>↗</span></button></div><div class="title-footnote">EXPLORE THE PALACE. REWRITE YOUR FATE.</div></div>
        <div class="scene-caption"><span class="caption-rule"></span><span>THE PALACE OF AZAD<small>Before the last grain falls.</small></span></div></section>`;
        break;
      case "pause":
        this.overlay.innerHTML = `<section class="modal-backdrop"><div class="menu-panel"><div class="panel-emblem">${icons.dagger}</div><p class="small-label">A MOMENT BETWEEN MOMENTS</p><h2>Time stands still.</h2><p class="panel-subtitle">${g.room.name}</p><div class="pause-actions"><button class="journey-button" data-action="resume">Return to the palace <span>→</span></button><button class="menu-link" data-action="map">Palace map <span>${g.input.prompt("map")}</span></button><button class="menu-link" data-action="options">Options <span>↗</span></button><button class="menu-link" data-action="help">How to play <span>↗</span></button><button class="menu-link muted" data-action="title">Return to title <span>←</span></button></div><p class="save-note">Your next journey begins at the last fountain.</p></div></section>`;
        break;
      case "map":
        if (g instanceof CampaignGame) {
          this.overlay.innerHTML = `<section class="modal-backdrop atlas-backdrop"><div class="map-panel explorer-panel" role="dialog" aria-modal="true" aria-label="Explorer map"><div class="panel-heading"><h2>Palace atlas</h2><button class="close-button" data-action="resume" aria-label="Close map">×</button></div><div data-atlas></div></div></section>`;
          new ExplorerMap(
            this.overlay.querySelector<HTMLElement>(".explorer-panel")!,
            g,
          );
        } else {
          this.overlay.innerHTML = `<section class="modal-backdrop map-backdrop"><div class="map-panel"><div class="panel-heading"><div><p class="small-label">THE KINGDOM OF AZAD</p><h2>The palace</h2></div><button class="close-button" data-action="resume" aria-label="Close map">×</button></div><div class="map-objective"><span>✦</span><div><strong>${g.quest.title}</strong><p>${g.input.describe(g.quest.text)}</p></div><span class="explored">${Math.round((g.visited.size / ROOM_COUNT) * 100)}% explored</span></div>${mapMarkup(g)}<div class="map-legend"><span><i class="current-mark">◆</i> You are here</span><span><i>◈</i> Fountain</span><span><i>✧</i> Time memory</span><span><i>✦</i> Objective</span><span class="map-unexplored">┄ Unexplored / sealed</span></div><div class="map-bottom"><span>Curse intensity <b>${"◆".repeat(g.tier)}${"◇".repeat(ORDER.length - g.tier)}</b></span><span>${key(this.game.input.prompt("map"))} Return to journey</span></div></div></section>`;
        }
        break;
      case "help":
        this.overlay.innerHTML = `<section class="modal-backdrop"><div class="help-panel"><div class="panel-heading"><div><p class="small-label">THE PRINCE’S HANDBOOK</p><h2>Make every moment count.</h2></div><button class="close-button" data-action="back" aria-label="Close controls">×</button></div><div class="help-columns"><div><h3>Movement & combat</h3>${this.control(["left", "right"], "Move", "Use the configured movement controls.")}${this.control("jump", "Jump / climb", "Hold for height. Jump against a wall to leap away.")}${this.control("attack", "Sword strike", "Strike again to chain a three-hit combo.")}${this.control("interact", "Interact", "Use doors, restore mechanisms, and rest at fountains.")}<p class="help-tip">Hold toward a wall while jumping to run up it. Catch a ledge, then jump to climb. Press down to drop through thin terraces. Catch a bar or rope, release jump, then jump toward the next grip. On ladders, hold jump to climb and move sideways to dismount.</p></div><div><h3>The Dagger of Time</h3>${this.control("rewind", "Rewind", "Hold to recover movement and health. 1 sand per second.")}${this.control("slow", "Slow time", "Slow the room for 6 seconds. Costs 1 sand.")}${this.control("freeze", "Sand prison", "Freeze the room for 4 seconds. Double sword damage. Costs 2 sand.")}${this.control("dash", "Time dash", "Surge forward through danger. Costs 1 sand.")}${this.control(["echo", "cancelEcho"], "Local time echo / cancel", "In striped waterkeeper chambers: {echo} records up to 8s, {echo} replays for 24s. {echo} during replay replaces it. {cancelEcho} cancels. Each recording costs 1 sand. Only movement, plates and marked bells replay. Other time powers cancel. Reload keeps latches, clears echoes.")}<p class="help-tip">${g.input.describe("Hold {interact} and move to push crates. Use {interact} at mechanisms and Farah switches. Hold {down} + {interact} and move to slide mirrors.")} Powers awaken through the story; they are unavailable while the Dagger is missing. Fountains save your progress.</p></div></div><div class="help-bottom"><span>${key(this.game.input.prompt("map"))} Palace map &nbsp; ${key(this.game.input.prompt("pause"))} Pause</span><button class="outline-button" data-action="back">Understood <span>→</span></button></div></div></section>`;
        break;
      case "options":
        this.overlay.innerHTML = `<section class="modal-backdrop"><div class="options-panel"><div class="panel-heading"><div><p class="small-label">MAKE THE JOURNEY YOURS</p><h2>Options</h2></div><button class="close-button" data-action="back" aria-label="Close options">×</button></div>${this.option("music", "Music", "An original, synthesized palace score.")}${this.option("sfx", "Sound effects", "Footsteps, blades, water, and time.")}${this.option("shake", "Screen shake", "Camera feedback during combat.")}${this.option("assist", "Journey assist", "Take less damage and slowly regenerate sand.")}${this.option("reducedMotion", "Reduced motion", "Stop ambient motion, camera shake and player flashing. System preference also applies.")}${this.option("largeText", "Larger text", "Enlarge hints, story text and menu instructions.")}<div data-control-settings></div><p class="save-note">Options are saved automatically in this browser.</p><button class="outline-button" data-action="back">Return <span>→</span></button></div></section>`;
        this.controls = new ControlSettings(
          this.overlay.querySelector<HTMLElement>("[data-control-settings]")!,
          g.input,
        );
        break;
      case "story": {
        const s = g.story!;
        this.overlay.innerHTML = `<section class="modal-backdrop story-backdrop"><div class="story-panel"><div class="story-symbol">${s.kind === "ability" ? icons[ORDER[g.tier - 1]] : icons.dagger}</div><p class="small-label">${s.kind === "ability" ? "A MEMORY AWAKENS" : "THE STORY CONTINUES"}</p><h2>${s.title}</h2><p class="story-narrative">${g.input.describe(s.text)}</p><p class="story-detail">${g.input.describe(s.detail)}</p><button class="journey-button" data-action="story">Continue the journey <span>→</span></button></div></section>`;
        break;
      }
      case "death":
        this.overlay.innerHTML = `<section class="modal-backdrop"><div class="menu-panel"><p class="small-label">A STORY NOT YET WRITTEN</p><h2>That is not how<br>it happened.</h2><p class="panel-subtitle">Even time offers a second chance.</p><div class="pause-actions">${g.deathMemory ? '<button class="journey-button" data-action="rewind-death">Rewrite this moment <span>1 sand</span></button>' : ""}<button class="${g.abilities.has("rewind") ? "outline-button" : "journey-button"}" data-action="retry">Return to the fountain <span>→</span></button></div></div></section>`;
        break;
      case "ending":
        this.overlay.innerHTML = `<section class="modal-backdrop ending-backdrop"><div class="ending-panel"><div class="panel-emblem">${icons.dagger}</div><p class="small-label">THE LAST GRAIN FALLS</p><h2>And so, a new<br>story begins.</h2><p class="story-narrative">${g.campaignProgress ? "The Sands return to the Hourglass, undoing the invasion. In Farah’s chamber, you defeat the Vizier and return the Dagger. She is safe, but the journey you shared lives only in your memory." : "The Dagger enters the hourglass. The Vizier’s curse unravels. Water moves through the gardens, and morning finds the palace whole."}</p><p class="story-detail">${g.campaignProgress ? "Call me Kakolookiyam." : "Only you remember the journey."}</p><div class="ending-stats"><span>${Math.floor(g.playTime / 60)}<small>minutes</small></span><span>${g.visited.size}/${ROOM_COUNT}<small>rooms explored</small></span><span>${g.deaths}<small>stories rewritten</small></span></div><button class="journey-button" data-action="${g.campaignProgress ? "start" : "explore"}">${g.campaignProgress ? "Begin the story again" : "Return to a free palace"} <span>→</span></button><button class="menu-link" data-action="title">Return to title <span>←</span></button></div></section>`;
        break;
    }
  }
  private control(
    binding: Action | Action[],
    title: string,
    description: string,
  ) {
    const actions = Array.isArray(binding) ? binding : [binding];
    return `<div class="control-row"><kbd data-prompt="${actions.join(",")}">${actions.map((a) => this.game.input.prompt(a)).join(" / ")}</kbd><div><strong>${title}</strong><p data-control-copy="${encodeURIComponent(description)}">${this.game.input.describe(description)}</p></div></div>`;
  }
  private option(name: keyof Options, title: string, text: string) {
    return `<label class="option-row"><span><strong>${title}</strong><small>${text}</small></span><input type="checkbox" data-option="${name}" ${this.game.options[name] ? "checked" : ""} aria-label="${title}"/><span class="toggle" aria-hidden="true"></span></label>`;
  }
  private renderHUD() {
    const g = this.game;
    if (this.hud.hidden) return;
    const p = g.player;
    const interaction = g.interaction;
    const echoes =
      g instanceof CampaignGame && g.echoes.available ? g.echoes : null;
    const prompt = (a: Action) => g.input.prompt(a);
    const power =
      echoes && echoes.phase !== "idle"
        ? echoes.phase === "recording"
          ? `Recording · ${prompt("echo")} replay · ${prompt("cancelEcho")} cancel`
          : `Echo playing · ${prompt("echo")} replace · ${prompt("cancelEcho")} cancel`
        : g.rewinding
          ? "REWINDING"
          : g.freezeTime > 0
            ? `SAND PRISON · ${g.freezeTime.toFixed(1)}s`
            : g.slowTime > 0
              ? `SLOW TIME · ${g.slowTime.toFixed(1)}s`
              : "";
    const boss = g.boss;
    const opening = g instanceof CampaignGame ? g.opening.cue(g) : null;
    const hint = g.screen === "playing" && (opening || g.roomBanner > 0);
    const markup = `<div class="hud-top"><div class="vitals"><div class="health" aria-label="Health ${Math.max(0, p.health)} of ${p.maxHealth}">${Array.from({ length: p.maxHealth }, (_, i) => `<span class="health-diamond ${i < p.health ? "full" : ""}"></span>`).join("")}</div><div class="sand"><span class="sand-dagger">${icons.dagger}</span><div class="sand-grains" aria-label="Sand ${p.sand.toFixed(1)} of ${p.maxSand}">${Array.from({ length: p.maxSand }, (_, i) => `<span style="--fill:${Math.max(0, Math.min(1, p.sand - i)) * 100}%"></span>`).join("")}</div><span class="sand-count">${Math.floor(p.sand)} / ${p.maxSand}</span></div></div>
      <div class="hud-location"><span>CHAPTER ${g.room.chapter} · ${g.room.region.toUpperCase()}</span><strong>${g.room.name}</strong>${g.campaignProgress ? `<small class="journey-status">${g.campaignProgress.completed}/40 milestones · ${g.hasDagger ? "Dagger held" : "No Dagger"}${g.companion ? ` · Farah ${g.companion.health}/${g.companion.maxHealth}` : ""}</small>` : ""}</div><div class="hud-buttons"><button data-action="map" aria-label="Open palace map">${icons.map}<kbd>${prompt("map")}</kbd></button><button data-action="pause" aria-label="Pause game">${icons.pause}</button></div></div>
      ${boss ? `<div class="boss-health"><span>${enemyName(boss.kind).toUpperCase()}${boss.phase && boss.kind !== "rival" ? " · UNBOUND" : ""}</span><div><i style="width:${(boss.health / boss.maxHealth) * 100}%"></i></div></div>` : ""}
      ${hint ? `<div class="room-hint">${g.input.describe(opening ?? g.room.hint)}</div>` : ""}
      ${power ? `<div class="power-active${echoes ? " echo-status" : ""}">${power}</div>` : ""}
      ${interaction && g.screen === "playing" ? `<button class="interact-prompt" data-action="interact" style="left:${Math.max(15, Math.min(85, ((p.x + 15 - g.camera.x) / 1280) * 100))}%;top:${Math.max(24, ((p.y - 32 - g.camera.y) / 720) * 100)}%">${key(prompt("interact"))} ${g.input.describe(interaction.label)}</button>` : ""}
      ${g.toastTime > 0 ? `<div class="toast" role="status">${g.input.describe(g.toast)}</div>` : ""}
      <div class="hud-bottom"><div class="objective"><span class="objective-star">✧</span><div><span class="objective-label">CURRENT OBJECTIVE</span><strong>${g.quest.title}</strong><p>${g.input.describe(g.quest.text)}</p></div></div><div class="abilities">${ORDER.map(
        (ability) => {
          const unlocked = g.abilities.has(ability) && g.hasDagger,
            data = ABILITIES[ability];
          return `<button class="ability ${unlocked ? "unlocked" : "locked"} ${(ability === "rewind" && g.rewinding) || (ability === "slow" && g.slowTime > 0) || (ability === "freeze" && g.freezeTime > 0) ? "active" : ""}" data-action="power" data-power="${ability}" title="${unlocked ? data.name + " · " + g.abilityCost(ability) + " sand" : data.name + " · Dagger or power unavailable"}" aria-label="${data.name}${unlocked ? "" : ", locked"}" ${unlocked ? "" : "disabled"}><span class="ability-icon">${unlocked ? icons[ability] : icons.lock}</span><kbd>${g.input.prompt(ability, true)}</kbd></button>`;
        },
      ).join(
        "",
      )}${echoes ? `<button class="ability unlocked" data-action="power" data-power="echo" aria-label="${echoes.phase === "recording" ? "Replay echo" : echoes.phase === "playing" ? "Replace echo" : "Record echo"}" title="${g.input.describe("{echo} records for 1 sand; {echo} again replays; {cancelEcho} cancels")}"><span class="ability-icon">${echoes.phase === "recording" ? "REC" : echoes.phase === "playing" ? "NEW" : "ECHO"}</span><kbd>${g.input.prompt("echo", true)}</kbd></button>${echoes.phase !== "idle" ? `<button class="ability unlocked" data-action="power" data-power="cancelEcho" aria-label="Cancel echo"><span class="ability-icon">×</span><kbd>${g.input.prompt("cancelEcho", true)}</kbd></button>` : ""}` : ""}</div></div>`;
    const updateEchoClock = () => {
      const clock = this.hud.querySelector(".echo-status");
      if (clock && echoes && echoes.phase !== "idle")
        clock.textContent = g.input.describe(echoes.status);
    };
    if (markup === this.lastHudMarkup) {
      updateEchoClock();
      return;
    }
    this.lastHudMarkup = markup;
    this.hud.innerHTML = markup;
    updateEchoClock();
    this.hud
      .querySelector('[data-action="interact"]')
      ?.addEventListener("click", () => {
        this.game.input.release("interact");
        this.game.input.press("interact");
        this.game.input.release("interact");
      });
  }
}
