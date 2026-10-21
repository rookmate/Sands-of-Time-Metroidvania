import { Game, type GameConfig } from "../game/Game";
import type { Enemy, Options, Pickup } from "../game/types";
import { distance } from "../game/physics";
import { loadOptions, writeOptions } from "../game/storage";
import { isBoss } from "../game/enemies";
import { ABILITIES } from "../game/progression";
import { CAMPAIGN_START, SECTIONS, SECTION_BY_ID } from "./sections";
import { CAMPAIGN_ROOMS } from "./world";
import {
  freshJourney,
  freshPuzzle,
  loadCampaign,
  writeCampaign,
} from "./state";
import { Puzzles } from "./puzzles";
import { Farah } from "./companion";
import type { CampaignSave } from "./types";

export class CampaignGame extends Game {
  journey = freshJourney();
  readonly puzzles: Puzzles;
  readonly farah: Farah;
  readonly immortal: boolean;
  private readonly persistent: boolean;
  private campaignSave: CampaignSave | null = null;
  private activeRoom = "";
  constructor(config: GameConfig = {}) {
    super({
      ...config,
      persist: false,
      rooms: CAMPAIGN_ROOMS,
      start: CAMPAIGN_START,
    });
    this.immortal = config.immortal ?? false;
    this.persistent = config.persist !== false;
    if (this.persistent) {
      this.options = loadOptions();
      this.sound.options = this.options;
      this.campaignSave = loadCampaign();
      this.saved = this.campaignSave;
    }
    this.puzzles = new Puzzles(this);
    this.farah = new Farah(this);
    this.visited = new Set([CAMPAIGN_START.room]);
    this.checkpoint = { ...CAMPAIGN_START };
  }
  get section() {
    return SECTION_BY_ID[this.room.id];
  }
  override get hasDagger() {
    return this.journey?.dagger ?? false;
  }
  override get swordPower() {
    return this.journey.sword === 3 ? 12 : this.journey.sword === 2 ? 2 : 1;
  }
  override get companion() {
    return this.farah?.actor ?? null;
  }
  override get boss() {
    return (
      this.enemies.find((e) => !e.dead && !e.protected && isBoss(e.kind)) ??
      super.boss
    );
  }
  override get campaignProgress() {
    return {
      completed: this.journey.completed.length,
      total: SECTIONS.length,
      part: this.section.part,
      dagger: this.hasDagger,
      farah: this.journey.farah,
    };
  }
  override get quest() {
    if (this.room.id === "honor" && this.puzzles?.state.solved)
      return {
        title: "Return the Dagger to Farah",
        text: "Farah is waiting beside her bed. Return to her and press E.",
        room: "honor",
      };
    const next =
      SECTIONS[Math.min(this.journey.completed.length, SECTIONS.length - 1)];
    return { title: next.title, text: next.objective, room: next.id };
  }
  override get deathMemory() {
    return this.companion?.health === 0 ? undefined : super.deathMemory;
  }
  override start(continueJourney = false) {
    this.journey =
      continueJourney && this.campaignSave
        ? structuredClone(this.campaignSave.journey)
        : freshJourney();
    this.activeRoom = "";
    super.start(continueJourney);
    this.syncRoom();
    this.notify(
      continueJourney
        ? "Your story continues at the last fountain."
        : "Enter the Maharajah’s palace. The Dagger waits beyond the siege.",
    );
    if (this.journey.completed.length === 40) this.setScreen("ending");
  }
  // Headless tests start through normal world entry without creating an AudioContext.
  begin() {
    this.player.sand = 0;
    this.enterRoom(CAMPAIGN_START.room, undefined, CAMPAIGN_START);
    this.setScreen("playing");
    this.syncRoom();
  }
  override setOption(key: keyof Options, value: boolean) {
    this.options[key] = value;
    if (this.persistent) writeOptions(this.options);
  }
  override save(showMessage = true) {
    super.save(false);
    if (!this.saved) return;
    this.campaignSave = {
      ...this.saved,
      journey: structuredClone(this.journey),
    };
    this.saved = this.campaignSave;
    if (this.persistent && !writeCampaign(this.campaignSave))
      this.notify(
        "Storage is unavailable. The campaign remains playable for this session.",
      );
    else if (showMessage)
      this.notify("Journey saved · Health and sands restored");
  }
  override respawn() {
    if (!this.journey.completed.includes(this.room.id))
      this.journey.puzzles[this.room.id] = freshPuzzle(this.section.puzzle);
    this.activeRoom = "";
    super.respawn();
    this.syncRoom();
  }
  protected override roomPlatforms(time: number) {
    const base = super.roomPlatforms(time);
    return this.puzzles ? this.puzzles.platforms(base) : base;
  }
  protected override claimItem(pickup: Pickup) {
    if (pickup.kind === "dagger") {
      this.journey.dagger = true;
      this.abilities.add("rewind");
      this.player.sand = this.player.maxSand;
      this.showStory(
        "The Dagger of Time",
        "A moment unravels, then returns. Hold R to rewind your movement and health.",
        "The Dagger can undo a mistake, but the sand it spends stays spent.",
        "ability",
      );
    } else {
      this.journey.sword = this.journey.sword === 1 ? 2 : 3;
      this.notify(
        this.journey.sword === 3
          ? "The final sword · One blow can destroy ordinary sand creatures."
          : "A stronger sword · Cracked walls can now be broken.",
      );
    }
    this.save(false);
  }
  protected override enemyDefeated(enemy: Enemy) {
    const id = `${this.room.id}:${enemy.id}`;
    if (!this.journey.defeated.includes(id)) this.journey.defeated.push(id);
    if (enemy.kind === "vizier" && this.room.id === "honor")
      this.notify("The Vizier has fallen. Return the Dagger to Farah.");
  }
  farahDefeatedEnemy(enemy: Enemy) {
    enemy.dead = true;
    this.enemyDefeated(enemy);
  }
  recoverDagger() {
    if (this.hasDagger) return;
    this.journey.dagger = true;
    this.journey.farah = "dead";
    this.farah.actor = null;
    this.player.sand = 0;
    this.history = [];
    this.showStory(
      "The last handhold",
      "Farah lets go before the blade can drag you down with her. You have the Dagger again, and its sand is empty.",
      "Reclaim sand from the creatures. The Hourglass stands beyond them.",
    );
  }
  private syncRoom() {
    if (this.activeRoom === this.room.id) return;
    this.activeRoom = this.room.id;
    const s = this.puzzles.state;
    if (
      !s.solved &&
      (this.section.puzzle?.kind === "battle" ||
        this.section.puzzle?.kind === "vizier")
    )
      this.journey.puzzles[this.room.id] = freshPuzzle(this.section.puzzle);
    // These reunions occur before the area's cooperative challenge begins.
    if (!this.journey.completed.includes(this.room.id) && this.section.arrival)
      this.journey.farah = this.section.arrival;
    this.farah.enter();
    this.platforms = this.roomPlatforms(this.worldTime);
  }
  override update(dt: number) {
    this.syncRoom();
    const active = this.screen === "playing" && !this.orientationBlocked;
    if (active) this.puzzles.step(dt);
    super.update(dt);
    if (active && this.screen === "playing") {
      this.farah.step(dt);
      this.puzzles.step(0);
    }
  }
  private finishSection() {
    const index = SECTIONS.findIndex((s) => s.id === this.room.id);
    if (index < this.journey.completed.length) return true;
    if (index !== this.journey.completed.length) {
      this.notify("An earlier part of the story is unfinished.");
      return false;
    }
    if (!this.puzzles.state.solved) {
      this.notify(this.section.objective);
      return false;
    }
    if (
      this.section.item &&
      !this.collected.has(`${this.room.id}-${this.section.item}`)
    ) {
      this.notify("Recover the item before leaving this area.");
      return false;
    }
    const section = this.section;
    this.journey.completed.push(section.id);
    if (section.reward) {
      this.abilities.add(section.reward);
      this.player.sand = this.player.maxSand;
    }
    if (section.companion) this.journey.farah = section.companion;
    if (section.id === "hourglass") {
      this.journey.dagger = false;
      this.player.sand = 0;
      this.slowTime = 0;
      this.freezeTime = 0;
      this.history = [];
    }
    if (section.id === "sunset") {
      this.journey.grandRewind = true;
      this.journey.farah = "restored";
      this.slowTime = 0;
      this.freezeTime = 0;
      this.projectiles = [];
      this.history = [];
    }
    if (section.id === "honor") {
      this.flags.add("victory");
      this.journey.dagger = false;
      this.player.sand = 0;
      this.save(false);
      this.setScreen("ending");
      return true;
    }
    this.showStory(
      section.title,
      section.story,
      section.reward
        ? `${ABILITIES[section.reward].name} awakens. ${SECTIONS[index + 1].objective}`
        : SECTIONS[index + 1].objective,
    );
    return true;
  }
  override get interaction(): { label: string; action: () => void } | null {
    const feet = { x: this.player.x + 15, y: this.player.y + this.player.h };
    const control = this.puzzles?.controls.find((c) => distance(feet, c) < 85);
    if (control) return control;
    const index = SECTIONS.findIndex((s) => s.id === this.room.id);
    const shapeExit = this.rooms[this.room.id].doors.find(
      (d) => d.to === SECTIONS[index + 1]?.id,
    );
    const farah = this.companion;
    const returnDagger =
      index === 39 &&
      this.puzzles.state.solved &&
      farah &&
      distance(feet, { x: farah.x + 15, y: farah.y + farah.h }) < 85;
    if ((shapeExit && distance(feet, shapeExit) <= 95) || returnDagger)
      return {
        label:
          index === 39 ? "Return the Dagger to Farah" : "Continue the story",
        action: () => {
          if (!this.finishSection()) return;
          const next = SECTIONS[index + 1];
          if (next) {
            this.enterRoom(next.id, this.room.id);
            this.syncRoom();
            this.checkpoint = {
              room: next.id,
              x: this.player.x,
              y: this.player.y,
            };
            this.player.health = this.player.maxHealth;
            this.player.sand = this.hasDagger ? this.player.maxSand : 0;
            this.save(false);
          }
        },
      };
    if (this.journey.grandRewind && index === 39) {
      const fountain = this.room.fountain;
      if (!fountain || distance(feet, fountain) >= 95) return null;
    }
    const interaction = super.interaction;
    if (interaction?.label === "Rest at the fountain")
      return {
        label: interaction.label,
        action: () => {
          interaction.action();
          if (this.companion) this.companion.health = this.companion.maxHealth;
        },
      };
    return interaction;
  }
}
