import type { Ability, Requirement, StoryFlag } from "./types";
export const ABILITIES: Record<
  Ability,
  {
    name: string;
    key: string;
    cost: number;
    color: string;
    description: string;
  }
> = {
  rewind: {
    name: "Rewind",
    key: "R",
    cost: 1,
    color: "#78e2d4",
    description:
      "Hold R to retrace up to four seconds of your movement and recover lost health. Each second consumes sand.",
  },
  slow: {
    name: "Slow time",
    key: "Q",
    cost: 1,
    color: "#e9c778",
    description:
      "Press Q to slow enemies, blades, and moving platforms for six seconds. You alone move freely.",
  },
  freeze: {
    name: "Sand prison",
    key: "F",
    cost: 2,
    color: "#9ac5f6",
    description:
      "Press F to freeze the room for four seconds. Your blade deals double damage to imprisoned enemies.",
  },
  dash: {
    name: "Time dash",
    key: "Shift",
    cost: 1,
    color: "#b2a4ee",
    description:
      "Press Shift to surge through the air, cross wide gaps, and pass through enemies unharmed.",
  },
};
export const ORDER: Ability[] = ["rewind", "slow", "freeze", "dash"];
export function hasRequirement(
  requirement: Requirement | undefined,
  abilities: ReadonlySet<Ability>,
  flags: ReadonlySet<StoryFlag>,
): boolean {
  return (
    !requirement ||
    abilities.has(requirement as Ability) ||
    flags.has(requirement as StoryFlag)
  );
}
export function enemyStats(tier: number, kind: string) {
  const boss = ["vizier", "guardian", "king", "double"].includes(kind);
  return {
    health: boss
      ? kind === "vizier"
        ? 34
        : kind === "double"
          ? 12
          : 20
      : kind === "bird" || kind === "scarab"
        ? 2
        : (kind === "brute" ? 6 : 3) + tier,
    speed: boss ? 60 : 56 + tier * 12,
    damage: tier >= 3 ? 2 : 1,
    cooldown: Math.max(0.65, 1.6 - tier * 0.18),
    reward: Math.max(0.55, 1.3 - tier * 0.15),
  };
}
export function objective(
  abilities: ReadonlySet<Ability>,
  flags: ReadonlySet<StoryFlag>,
) {
  if (!abilities.has("rewind"))
    return {
      title: "The first grain",
      text: "Find the Dagger’s memory in the Hanging Gardens.",
      room: "gardens",
    };
  if (!abilities.has("slow"))
    return {
      title: "Above the sands",
      text: "Climb the Sun Tower to the Observatory.",
      room: "observatory",
    };
  if (!abilities.has("freeze"))
    return {
      title: "Still waters",
      text: "Seek the Sand Prison within the Cistern.",
      room: "cistern",
    };
  if (!flags.has("water"))
    return {
      title: "Let the gardens breathe",
      text: "Restore the sluice in the Water Gardens.",
      room: "water-gardens",
    };
  if (!abilities.has("dash"))
    return {
      title: "A step beyond",
      text: "Find Time Dash in the Upper Palace.",
      room: "upper",
    };
  if (!flags.has("guardian"))
    return {
      title: "The broken oath",
      text: "Defeat the Sand Guardian in the Corrupted Wing.",
      room: "corrupted",
    };
  if (!flags.has("victory"))
    return {
      title: "The final hour",
      text: "Reach the Throne of Dawn. Defeat the Vizier.",
      room: "throne",
    };
  return {
    title: "A different ending",
    text: "The palace is free. Its hidden chambers remain.",
    room: "palace",
  };
}
