import { freshRival } from "./rival";
import { HISTORY_IDS } from "./history";
import { ECHO_CHAMBERS } from "./echoRooms";
import { freshPalace } from "./palace";
import { parseSave } from "../game/storage";
import type { CampaignSave, CampaignState, Puzzle, PuzzleState } from "./types";
import { CAMPAIGN_ROOMS } from "./world";
import { SECTIONS } from "./sections";
import type { Ability } from "../game/types";
import { freshCooperation } from "./cooperation";
const KEY = "sands-of-time:campaign:v2";
export const freshJourney = (): CampaignState => ({
  version: 10,
  rival: freshRival(),
  traversal: { broken: false, latched: false },
  history: { read: [], opened: false },
  wing: { era: "intact", discovered: false },
  echoes: { solved: [] },
  palace: freshPalace(),
  cooperation: freshCooperation(),
  rewards: { attunement: null, inscription: false },
  baths: { intake: false, drained: false, shortcut: false },
  completed: [],
  dagger: false,
  sword: 1,
  farah: "unknown",
  grandRewind: false,
  puzzles: {},
  defeated: [],
});
export function freshPuzzle(puzzle?: Puzzle): PuzzleState {
  return {
    solved: !puzzle,
    values: puzzle?.kind === "mirror" ? [0, 0, 0] : [],
    remaining: 0,
    crateX:
      puzzle?.kind === "crate"
        ? puzzle.crate.x
        : puzzle?.kind === "mirror"
          ? puzzle.mirrors[puzzle.movable].x
          : 0,
    wave: 0,
    lift: 0,
    activated: false,
  };
}
export function parseCampaign(raw: string | null): CampaignSave | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    // v1 checkpoints in the two former 2200px halls map onto safe new floors.
    if (data?.journey?.version === 1) {
      const legacyRooms = {
        ...CAMPAIGN_ROOMS,
        "baths-main": { ...CAMPAIGN_ROOMS["baths-main"], width: 2200 },
        bathworks: { ...CAMPAIGN_ROOMS.bathworks, width: 2200 },
      };
      if (!parseSave(raw, legacyRooms)) return null;
      const drained =
        data.journey.completed?.length >= 16 ||
        data.journey.puzzles?.bathworks?.solved === true;
      data.journey = {
        ...data.journey,
        version: 2,
        baths: { intake: drained, drained, shortcut: false },
      };
      // Their old crate/crank definitions no longer exist. Retained unsolved
      // entries would block finishSection with no remaining controls to solve.
      if (data.journey.puzzles) {
        delete data.journey.puzzles["baths-main"];
        delete data.journey.puzzles.bathworks;
      }
      if (["baths-main", "bathworks"].includes(data.room) && data.checkpoint) {
        data.checkpoint = {
          x: Math.min(
            Math.max(data.checkpoint.x, 12),
            CAMPAIGN_ROOMS[data.room].width - 60,
          ),
          y: 594,
        };
      }
    }
    // Both earlier journey schemas keep their existing save slot and pickups.
    if (data?.journey?.version === 2) {
      data.journey.version = 3;
      data.journey.rewards = { attunement: null, inscription: false };
    }
    if (data?.journey?.version === 3) {
      data.journey.version = 4;
      data.journey.cooperation = freshCooperation();
    }
    if (data?.journey?.version === 4) {
      data.journey.version = 5;
      // Earlier saves have already passed these new regional gates.
      const learningDone = data.journey.completed?.length >= 29;
      const prisonDone = data.journey.completed?.length >= 33;
      data.journey.palace = {
        irrigated: learningDone,
        sky: learningDone,
        winch: prisonDone,
        prisonOpen: prisonDone,
      };
    }
    if (data?.journey?.version === 5) {
      data.journey.version = 6;
      data.journey.echoes = { solved: [] };
    }
    if (data?.journey?.version === 6) {
      data.journey.version = 7;
      data.journey.wing = { era: "intact", discovered: false };
    }
    if (data?.journey?.version === 7) {
      data.journey.version = 8;
      data.journey.history = { read: [], opened: false };
    }
    if (data?.journey?.version === 8) {
      data.journey.version = 9;
      data.journey.traversal = { broken: false, latched: false };
    }
    if (data?.journey?.version === 9) {
      data.journey.version = 10;
      data.journey.rival = freshRival();
    }
    if (!parseSave(JSON.stringify(data), CAMPAIGN_ROOMS)) return null;
    const state: CampaignState = data.journey;
    if (
      !state ||
      state.version !== 10 ||
      !state.rival ||
      ![0, 1, 2].includes(state.rival.bouts) ||
      typeof state.rival.named !== "boolean" ||
      typeof state.rival.oath !== "boolean" ||
      ![null, "released", "defeated"].includes(state.rival.outcome) ||
      (state.rival.oath && !state.rival.named) ||
      (state.rival.outcome !== null && state.rival.bouts !== 2) ||
      (state.rival.outcome === "released" && !state.rival.oath) ||
      ((state.rival.named || state.rival.bouts > 0) &&
        state.completed.length < 17) ||
      (state.rival.bouts > 1 && state.completed.length < 28) ||
      (state.rival.outcome !== null && state.completed.length < 32) ||
      !state.traversal ||
      typeof state.traversal.broken !== "boolean" ||
      typeof state.traversal.latched !== "boolean" ||
      (state.traversal.latched && !state.traversal.broken) ||
      ((state.traversal.broken || state.traversal.latched) &&
        state.completed.length < 11) ||
      !state.history ||
      typeof state.history.opened !== "boolean" ||
      !Array.isArray(state.history.read) ||
      state.history.read.length > HISTORY_IDS.length ||
      new Set(state.history.read).size !== state.history.read.length ||
      !state.history.read.every((id) => HISTORY_IDS.includes(id)) ||
      (state.history.read.includes("witness") && !state.history.opened) ||
      ((state.history.opened || state.history.read.length > 0) &&
        state.completed.length < 17) ||
      !state.wing ||
      !["intact", "ruined"].includes(state.wing.era) ||
      typeof state.wing.discovered !== "boolean" ||
      ((state.wing.discovered || state.wing.era === "ruined") &&
        state.completed.length < 17) ||
      !state.echoes ||
      !Array.isArray(state.echoes.solved) ||
      state.echoes.solved.length > Object.keys(ECHO_CHAMBERS).length ||
      new Set(state.echoes.solved).size !== state.echoes.solved.length ||
      !state.echoes.solved.every((id) => Object.hasOwn(ECHO_CHAMBERS, id)) ||
      (state.echoes.solved.length > 0 && state.completed.length < 17) ||
      !state.palace ||
      ![
        state.palace.irrigated,
        state.palace.sky,
        state.palace.winch,
        state.palace.prisonOpen,
      ].every((v) => typeof v === "boolean") ||
      (state.palace.prisonOpen && !state.palace.winch) ||
      ((state.palace.winch || state.palace.prisonOpen) &&
        state.completed.length < 32) ||
      (state.palace.sky && state.completed.length < 28) ||
      (state.palace.irrigated && state.completed.length < 17) ||
      !state.cooperation ||
      !["idle", "scouting", "ready", "primed", "crossed", "reunited"].includes(
        state.cooperation.phase,
      ) ||
      !Number.isFinite(state.cooperation.travel) ||
      state.cooperation.travel < 0 ||
      state.cooperation.travel > 1 ||
      !Number.isFinite(state.cooperation.remaining) ||
      state.cooperation.remaining < 0 ||
      state.cooperation.remaining > 8 ||
      (state.cooperation.phase !== "idle" &&
        (!state.baths?.drained || state.completed.length < 15)) ||
      (state.cooperation.phase === "idle" && state.cooperation.travel !== 0) ||
      (state.cooperation.phase === "scouting" &&
        state.cooperation.travel >= 1) ||
      (!["idle", "scouting"].includes(state.cooperation.phase) &&
        state.cooperation.travel !== 1) ||
      (!["idle", "reunited"].includes(state.cooperation.phase) &&
        (state.farah !== "following" || state.completed.length > 16)) ||
      (state.cooperation.phase !== "primed" &&
        state.cooperation.remaining !== 0) ||
      !state.rewards ||
      ![null, "patience", "stillness"].includes(state.rewards.attunement) ||
      typeof state.rewards.inscription !== "boolean" ||
      ((state.rewards.attunement !== null ||
        state.rewards.inscription ||
        data.collected.includes("keeper-cistern-vessel")) &&
        state.completed.length < 17) ||
      !state.baths ||
      ![state.baths.intake, state.baths.drained, state.baths.shortcut].every(
        (v) => typeof v === "boolean",
      ) ||
      (state.baths.drained && !state.baths.intake) ||
      typeof state.dagger !== "boolean" ||
      typeof state.grandRewind !== "boolean" ||
      ![1, 2, 3].includes(state.sword) ||
      ![
        "unknown",
        "following",
        "separated",
        "gone",
        "dead",
        "restored",
      ].includes(state.farah) ||
      !Array.isArray(state.completed) ||
      state.completed.length > SECTIONS.length ||
      !state.completed.every((id, i) => id === SECTIONS[i].id) ||
      !Array.isArray(state.defeated) ||
      !state.defeated.every(
        (id) => typeof id === "string" && /^[a-z-]+:\d+$/.test(id),
      ) ||
      !state.puzzles ||
      typeof state.puzzles !== "object" ||
      Array.isArray(state.puzzles)
    )
      return null;
    for (const [id, p] of Object.entries(state.puzzles)) {
      if (
        !Object.hasOwn(CAMPAIGN_ROOMS, id) ||
        !p ||
        typeof p.solved !== "boolean" ||
        typeof p.activated !== "boolean" ||
        !Array.isArray(p.values) ||
        p.values.length > 16 ||
        !p.values.every((v) => Number.isInteger(v) && v >= 0 && v <= 20) ||
        ![p.remaining, p.crateX, p.wave, p.lift].every(Number.isFinite) ||
        p.remaining < 0 ||
        p.remaining > 20 ||
        p.crateX < 0 ||
        p.crateX > 2200 ||
        !Number.isInteger(p.wave) ||
        p.wave < 0 ||
        p.wave > 10 ||
        p.lift < 0 ||
        p.lift > 240
      )
        return null;
    }
    const shouldBeRewound = state.completed.length >= 39;
    if (
      state.grandRewind !== shouldBeRewound ||
      (data.flags.includes("victory") && state.completed.length !== 40)
    )
      return null;
    const index = CAMPAIGN_ROOMS[data.room].availableAfter;
    if (
      index > state.completed.length ||
      data.visited.some(
        (id: string) =>
          CAMPAIGN_ROOMS[id].availableAfter > state.completed.length,
      )
    )
      return null;
    const pickups = new Set(
      Object.values(CAMPAIGN_ROOMS).flatMap((r) => r.pickups.map((p) => p.id)),
    );
    if (data.collected.some((id: string) => !pickups.has(id))) return null;
    const expectedSword = data.collected.includes("tomb-sword")
      ? 3
      : data.collected.includes("upper-baths-sword")
        ? 2
        : 1;
    if (state.sword !== expectedSword) return null;
    const expectedAbilities: Ability[] = [];
    if (data.collected.includes("treasury-dagger"))
      expectedAbilities.push("rewind");
    if (state.completed.length >= 4) expectedAbilities.push("slow");
    if (state.completed.length >= 8) expectedAbilities.push("freeze");
    if (state.completed.length >= 17) expectedAbilities.push("dash");
    if (
      expectedAbilities.length !== data.abilities.length ||
      expectedAbilities.some((a) => !data.abilities.includes(a))
    )
      return null;
    if (
      state.completed.length >= 2 &&
      state.completed.length < 35 &&
      !state.dagger
    )
      return null;
    if (
      state.completed.length === 40 &&
      (state.dagger || !data.flags.includes("victory"))
    )
      return null;
    // Canonical chronology also controls Dagger ownership across a reload.
    if (
      state.completed.length >= 35 &&
      state.completed.length < 38 &&
      state.dagger
    )
      return null;
    return data;
  } catch {
    return null;
  }
}
export function loadCampaign() {
  try {
    return parseCampaign(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
export function writeCampaign(save: CampaignSave) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
