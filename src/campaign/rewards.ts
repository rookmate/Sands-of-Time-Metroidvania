import type { CampaignGame } from "./CampaignGame";
import type { CampaignRoom } from "./types";
import type { Ability, Platform } from "../game/types";
import { ABILITIES } from "../game/progression";

export type Attunement = "patience" | "stillness";
export const ATTUNEMENTS: Record<
  Attunement,
  { name: string; effect: string; x: number }
> = {
  patience: {
    name: "Patient current",
    effect: "Slow Time lasts 9 seconds instead of 6. Sand cost stays 1.",
    x: 790,
  },
  stillness: {
    name: "Still current",
    effect: "Sand Prison costs 1 sand instead of 2. Duration stays 4 seconds.",
    x: 1080,
  },
};
export const VESSEL_ID = "keeper-cistern-vessel";
export const sandCapacity = (collected: ReadonlySet<string>) =>
  collected.has(VESSEL_ID) ? 8 : 6;
export function powerCost(ability: Ability, choice: Attunement | null) {
  return ability === "freeze" && choice === "stillness"
    ? 1
    : ABILITIES[ability].cost;
}

export function buildRewardRooms(rooms: Record<string, CampaignRoom>) {
  const p = (x: number, y: number, w: number, h = 24): Platform => ({
    x,
    y,
    w,
    h,
    oneWay: h <= 30,
  });
  const add = (
    id: string,
    name: string,
    hint: string,
    map: { x: number; y: number },
  ) => {
    rooms[id] = {
      ...rooms.maintenance,
      id,
      name,
      mapLabel: name,
      map,
      content: {
        ...rooms.maintenance.content,
        id,
        title: name,
        objective: hint,
      },
      hint,
      doors: [],
      pickups: [],
      platforms: [],
    };
  };
  add(
    "echo-gallery",
    "Echo gallery",
    "Two waterkeeper seals wait above. Choose one permanent attunement, or leave both untouched.",
    { x: 0, y: 3 },
  );
  rooms["echo-gallery"].platforms = [
    p(0, 650, 1280, 150),
    p(300, 530, 180),
    p(580, 420, 180),
    p(740, 310, 490),
  ];
  rooms["echo-gallery"].doors = [
    { x: 100, y: 650, to: "maintenance", label: "Conduit landing" },
  ];
  // The reward branch is above the conduit's far landing, away from its latch.
  rooms.maintenance.platforms.push(p(1030, 530, 250));
  rooms.maintenance.doors.push({
    x: 1190,
    y: 530,
    to: "echo-gallery",
    label: "Echo gallery · choose a time seal",
  });
  rooms.maintenance.hint =
    "Jump and Time Dash across the conduit. Above the far bank: time seals. Below: the rotunda latch.";

  add(
    "keeper-cistern",
    "Keeper cistern",
    "Open the five-second shutter, climb the launch ledge, then jump and Time Dash to the vessel. Slow Time or Sand Prison can hold the shutter, but neither seal is needed.",
    { x: 3, y: 2 },
  );
  rooms["keeper-cistern"].content.puzzle = {
    kind: "timed",
    lever: { x: 220, y: 650 },
    gate: { x: 1000, y: 0, w: 36, h: 650 },
    seconds: 5,
  };
  rooms["keeper-cistern"].platforms = [
    p(0, 650, 340, 150),
    p(850, 650, 430, 150),
    p(290, 520, 170),
    p(850, 530, 430),
  ];
  rooms["keeper-cistern"].doors = [
    { x: 100, y: 650, to: "sluice-reservoir", label: "Reservoir service pier" },
  ];
  rooms["keeper-cistern"].pickups = [
    { id: VESSEL_ID, kind: "vessel", x: 1110, y: 485 },
  ];
  rooms["sluice-reservoir"].doors.push({
    x: 1030,
    y: 530,
    to: "keeper-cistern",
    label: "Keeper cistern · sand vessel",
    gate: "sword-dash",
  });
  rooms["sluice-reservoir"].hint +=
    " The cracked service arch on the far pier bears a sand-vessel carving. Return with the stronger sword and Time Dash.";
}

export function rewardControls(g: CampaignGame) {
  if (g.room.id === "echo-gallery")
    return (
      Object.entries(ATTUNEMENTS) as [
        Attunement,
        (typeof ATTUNEMENTS)[Attunement],
      ][]
    ).map(([id, seal]) => ({
      x: seal.x,
      y: 310,
      label: g.journey.rewards.attunement
        ? `Seal chosen: ${ATTUNEMENTS[g.journey.rewards.attunement].name}`
        : `Choose ${seal.name} · ${id === "patience" ? "Slow 6 → 9s" : "Prison 2 → 1 sand"} · permanent; other seal closes`,
      action: () => {
        if (g.journey.rewards.attunement) return;
        g.journey.rewards.attunement = id;
        g.history = [];
        g.save(false);
        g.showStory(
          seal.name,
          seal.effect,
          "The other seal goes dark. This choice survives death and reload. Dash reach is unchanged.",
          "ability",
        );
      },
    }));
  if (g.room.id === "keeper-cistern")
    return [
      {
        x: 1170,
        y: 530,
        label: g.journey.rewards.inscription
          ? "Read the waterkeeper inscription again"
          : "Read the waterkeeper inscription",
        action: () => {
          g.journey.rewards.inscription = true;
          g.history = [];
          g.save(false);
          g.showStory(
            "The names below the waterline",
            "The court named these baths for kings. Here, under the mineral crust, the keepers carved the names of everyone who carried water during the siege. A small mark beside each name records a family brought safely through the conduit.",
            "The maintenance passage was an escape route long before the palace fell.",
          );
        },
      },
    ];
  return [];
}
