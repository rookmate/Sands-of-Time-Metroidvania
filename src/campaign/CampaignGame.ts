import {
  consequenceBlock,
  consequenceControls,
  consequencePlatforms,
} from "./consequences";
import { Mastery, MASTERY_IDS } from "./mastery";
import { rivalControls, rivalDefeated } from "./rival";
import {
  TRAVERSAL_IDS,
  stepEnemyTraversal,
  traversalControls,
  traversalPlatforms,
} from "./enemyTraversal";
import { historyControls } from "./history";
import { wingPlatforms, wingControls, wingDoorBlock } from "./eraWing";
import { ECHO_CHAMBERS } from "./echoRooms";
import { Echoes } from "./echoes";
import { palaceBlock, palaceControls, palacePlatforms } from "./palace";
import {
  cooperationActive,
  cooperationControls,
  cooperationPlatforms,
  cooperationStatus,
  stepCooperation,
} from "./cooperation";
import { Game, type GameConfig } from "../game/Game";
import type { Ability, Enemy, Options, Pickup } from "../game/types";
import { distance } from "../game/physics";
import { loadOptions, writeOptions } from "../game/storage";
import { isBoss } from "../game/enemies";
import { ABILITIES } from "../game/progression";
import { CAMPAIGN_START, SECTIONS } from "./sections";
import { CAMPAIGN_ROOMS } from "./world";
import {
  freshJourney,
  freshPuzzle,
  loadCampaign,
  writeCampaign,
} from "./state";
import { Puzzles } from "./puzzles";
import { Farah } from "./companion";
import { powerCost, rewardControls, sandCapacity } from "./rewards";
import { bathsControl, bathsPlatforms } from "./baths";
import type { CampaignDoor, CampaignSave } from "./types";

export class CampaignGame extends Game {
  journey = freshJourney();
  readonly mastery = new Mastery(this);
  readonly echoes = new Echoes(this);
  readonly puzzles: Puzzles;
  readonly farah: Farah;
  readonly immortal: boolean;
  private readonly persistent: boolean;
  private campaignSave: CampaignSave | null = null;
  private activeRoom = "";
  constructor(config: GameConfig & { save?: CampaignSave } = {}) {
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
    if (config.save) {
      this.campaignSave = structuredClone(config.save);
      this.saved = this.campaignSave;
    }
    this.puzzles = new Puzzles(this);
    this.farah = new Farah(this);
    this.visited = new Set([CAMPAIGN_START.room]);
    this.checkpoint = { ...CAMPAIGN_START };
  }
  get section() {
    return CAMPAIGN_ROOMS[this.room.id].content;
  }
  override get hasDagger() {
    return this.journey?.dagger ?? false;
  }
  override abilityCost(ability: Ability) {
    return powerCost(ability, this.journey.rewards.attunement);
  }
  protected override get slowDuration() {
    return this.journey.rewards.attunement === "patience" ? 9 : 6;
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
    if (MASTERY_IDS.includes(this.room.id))
      return {
        title: this.room.name,
        text: this.section.objective,
        room: this.room.id,
      };
    if (cooperationActive(this))
      return {
        title: "Farah and the bell spillway",
        text: cooperationStatus(this),
        room:
          this.journey.cooperation.phase === "crossed"
            ? "valve-loft"
            : "spillway",
      };
    if (
      this.journey.completed.length === 28 &&
      (!this.journey.palace.irrigated || !this.journey.palace.sky)
    )
      return {
        title: "Learning's two routes",
        text: `${this.journey.palace.irrigated ? "Garden irrigation restored" : "Restore irrigation in the root conduit beyond the Hall terraces"}. ${this.journey.palace.sky ? "Roof lens pinned" : "Light the Hall mirrors, climb the archive ladder and pin the shutter bridge lens"}. Choose either order; both routes return to this Hall.`,
        room: "learning",
      };
    if (this.journey.completed.length === 32 && !this.journey.palace.prisonOpen)
      return {
        title: "Escape the prison foundations",
        text: "Take the lower cell drain to the counterweight shaft. Wind the winch, climb to the warden and release the locks. Then climb the prison columns toward Farah and the Tower.",
        room: "prison",
      };
    if (this.room.id === "hourglass")
      return {
        title: "The Hourglass",
        text: "Finish exploration before descending. The descent seals all returns to the old palace and takes the Dagger from you.",
        room: "hourglass",
      };
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
    this.mastery.leave();
    this.journey =
      continueJourney && this.campaignSave
        ? structuredClone(this.campaignSave.journey)
        : freshJourney();
    this.activeRoom = "";
    super.start(continueJourney);
    this.player.maxSand = sandCapacity(this.collected);
    this.player.sand = this.hasDagger ? this.player.maxSand : 0;
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
    this.mastery.leave();
    if (!this.journey.completed.includes(this.room.id))
      this.journey.puzzles[this.room.id] = freshPuzzle(this.section.puzzle);
    this.activeRoom = "";
    super.respawn();
    this.syncRoom();
  }
  override enterRoom(...args: Parameters<Game["enterRoom"]>) {
    this.echoes?.clear();
    this.mastery?.enter(args[0]);
    super.enterRoom(...args);
  }
  protected override roomPlatforms(time: number) {
    const base = traversalPlatforms(
      this,
      consequencePlatforms(
        this,
        wingPlatforms(this, super.roomPlatforms(time)),
      ),
    );
    return this.puzzles
      ? this.echoes.platforms(
          this.puzzles.platforms(
            palacePlatforms(
              this,
              cooperationPlatforms(
                this,
                bathsPlatforms(this.room.id, this.journey.baths, base),
              ),
            ),
          ),
        )
      : base;
  }
  protected override claimItem(pickup: Pickup) {
    if (pickup.kind === "vessel") {
      this.player.maxSand = sandCapacity(this.collected);
      this.player.sand = this.player.maxSand;
      this.history = [];
      this.showStory(
        "Waterkeeper's vessel",
        "Maximum sand increased from 6 to 8. The vessel fills your Dagger now; fountains and Retry restore the larger capacity.",
        "The keepers saved two measures for the journey home. Time powers keep their usual reach.",
        "ability",
      );
    } else if (pickup.kind === "dagger") {
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
  protected override enemySandReward(enemy: Enemy) {
    return enemy.kind === "rival" || TRAVERSAL_IDS.includes(this.room.id)
      ? 0
      : super.enemySandReward(enemy);
  }
  protected override enemyDefeated(enemy: Enemy) {
    if (enemy.kind === "rival") {
      rivalDefeated(this);
      return;
    }
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
    if (active) {
      this.echoes.step();
      this.puzzles.step(dt);
      stepCooperation(this, dt);
    }
    super.update(dt);
    if (this.screen === "death") this.echoes.clear();
    if (active && this.screen === "playing") {
      this.mastery.step();
      stepEnemyTraversal(this);
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
    if (this.room.id === "bathworks" && !this.journey.baths.drained) {
      this.notify(this.section.objective);
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
  doorBlock(door: CampaignDoor): string | null {
    if (
      door.gate &&
      MASTERY_IDS.includes(door.gate) &&
      !this.journey.mastery.solved.includes(door.gate)
    )
      return "Secure this chamber's movement seal first";
    if (door.gate === "ram-wall" && !this.journey.traversal.broken)
      return "A weakened wall blocks the service passage";
    if (
      door.gate &&
      Object.hasOwn(ECHO_CHAMBERS, door.gate) &&
      !this.journey.echoes.solved.includes(door.gate)
    )
      return "Secure the far-side echo latch first";
    if (door.gate === "history-sill" && !this.journey.history.opened)
      return "Stone facing rests on a worn freight sill";
    const consequence = consequenceBlock(this, door);
    if (consequence) return consequence;
    const wing = wingDoorBlock(this, door);
    if (wing) return wing;
    const palace = palaceBlock(this, door);
    if (palace) return palace;
    if (door.milestone === "upper-baths" && cooperationActive(this))
      return "Reunite with Farah in the valve loft before leaving the Baths";
    if (
      door.gate === "spillway" &&
      !["crossed", "reunited"].includes(this.journey.cooperation.phase)
    )
      return "Latch the far-bank spillway bridge first";
    if (
      door.gate === "loft-shortcut" &&
      this.journey.cooperation.phase !== "reunited"
    )
      return "Reunite with Farah at the valve before opening the service shortcut";
    if (
      CAMPAIGN_ROOMS[door.to].availableAfter >
      this.journey.completed.length +
        (door.milestone === SECTIONS[this.journey.completed.length]?.id ? 1 : 0)
    )
      return "Follow the current story objective first";
    if (door.gate === "drained" && !this.journey.baths.drained)
      return "Flooded · open the reservoir intake and turn the sluice wheel";
    if (
      door.gate === "sword-dash" &&
      (this.journey.sword < 2 || !this.abilities.has("dash"))
    )
      return "Requires the stronger sword and Time Dash from the upper pools";
    if (door.gate === "shortcut" && !this.journey.baths.shortcut)
      return "Barred from the maintenance side";
    return null;
  }
  get regionalControl() {
    return bathsControl(this);
  }
  override get interaction(): { label: string; action: () => void } | null {
    const feet = { x: this.player.x + 15, y: this.player.y + this.player.h };
    const consequence = consequenceControls(this).find(
      (c) => distance(feet, c) < 45,
    );
    if (consequence) return consequence;
    const practice = this.mastery
      .controls()
      .find((c) => distance(feet, c) < 45);
    if (practice) return practice;
    const rival = rivalControls(this).find((c) => distance(feet, c) < 45);
    if (rival) return rival;
    const creature = traversalControls(this).find(
      (c) => distance(feet, c) < 45,
    );
    if (creature) return creature;
    const evidence = historyControls(this).find((c) => distance(feet, c) < 45);
    if (evidence) return evidence;
    const mirror = wingControls(this).find((c) => distance(feet, c) < 45);
    if (mirror) return mirror;
    const echo = this.echoes.controls().find((c) => distance(feet, c) < 45);
    if (echo) return echo;
    const control = this.puzzles?.controls.find((c) => distance(feet, c) < 85);
    if (control) return control;
    const cooperative = cooperationControls(this).find(
      (c) => distance(feet, c) < 70,
    );
    if (cooperative) return cooperative;
    const reward = rewardControls(this).find((c) => distance(feet, c) < 85);
    if (reward) return reward;
    const palace = palaceControls(this).find((c) => distance(feet, c) < 70);
    if (palace) return palace;
    const regional = this.regionalControl;
    if (regional && distance(feet, regional) < 85) return regional;
    const index = SECTIONS.findIndex((s) => s.id === this.room.id);
    const farah = this.companion;
    if (
      index === 39 &&
      this.puzzles.state.solved &&
      farah &&
      distance(feet, { x: farah.x + 15, y: farah.y + farah.h }) < 85
    )
      return {
        label: "Return the Dagger to Farah",
        action: () => {
          this.finishSection();
        },
      };
    // The restored timeline has no passage back into the ruined palace.
    if (this.journey.grandRewind && index === 39) {
      const fountain = this.room.fountain;
      if (!fountain || distance(feet, fountain) >= 95) return null;
    } else {
      const door = CAMPAIGN_ROOMS[this.room.id].doors.find(
        (d) => distance(feet, d) <= 95,
      );
      if (door) {
        const reason = this.doorBlock(door);
        return {
          label: reason
            ? `${door.label} · ${reason}`
            : door.milestone === "hourglass"
              ? "Point of no return · descend from the Hourglass, leaving the old palace behind"
              : door.milestone && this.room.region !== "Baths and Waterworks"
                ? "Continue the story"
                : door.label,
          action: () => {
            if (reason) {
              this.notify(reason);
              return;
            }
            const wasCompleted = this.journey.completed.length;
            if (door.milestone && !this.finishSection()) return;
            this.enterRoom(door.to, this.room.id);
            this.syncRoom();
            if (this.journey.completed.length > wasCompleted) {
              this.checkpoint = {
                room: door.to,
                x: this.player.x,
                y: this.player.y,
              };
              this.player.health = this.player.maxHealth;
              this.player.sand = this.hasDagger ? this.player.maxSand : 0;
            }
            this.save(false);
          },
        };
      }
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
