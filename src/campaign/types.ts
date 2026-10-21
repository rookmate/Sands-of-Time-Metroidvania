import type { Ability, Room, SaveData, Vec, Rect } from "../game/types";

export type Layout =
  | "hall"
  | "courtyard"
  | "terraces"
  | "tower"
  | "descent"
  | "bridge"
  | "drawbridge"
  | "ferry"
  | "swing"
  | "ladder"
  | "prison"
  | "elevator"
  | "library";
export interface Control extends Vec {
  label: string;
  target: number;
  steps: number;
}
export type Puzzle =
  | { kind: "crank"; controls: Control[] }
  | { kind: "timed"; lever: Vec; gate: Rect; seconds: number }
  | { kind: "crate"; crate: Rect; plate: Vec; gate: Rect }
  | { kind: "paired"; prince: Vec; farah: Vec; gate: Rect }
  | {
      kind: "mirror";
      controls: Vec[];
      mirrors: Vec[];
      target: Vec;
      movable: number;
    }
  | { kind: "columns"; levers: Vec[]; seconds: number }
  | { kind: "illusion"; doors: Vec[]; sequence: number[] }
  | { kind: "wall"; wall: Rect; sword: number }
  | {
      kind: "battle";
      waves: number;
      elevator?: boolean;
      recovery?: Vec;
      boss?: "king";
    }
  | { kind: "vizier" };
export interface Section {
  id: string;
  title: string;
  part: string;
  layout: Layout;
  theme: Room["theme"];
  objective: string;
  story: string;
  puzzle?: Puzzle;
  reward?: Ability;
  item?: "dagger" | "sword";
  companion?: "following" | "separated" | "gone" | "dead" | "restored";
  arrival?: FarahState;
}
export interface PuzzleState {
  solved: boolean;
  values: number[];
  remaining: number;
  crateX: number;
  wave: number;
  lift: number;
  activated: boolean;
}
export type FarahState =
  "unknown" | "following" | "separated" | "gone" | "dead" | "restored";
export interface CampaignState {
  version: 1;
  completed: string[];
  dagger: boolean;
  sword: 1 | 2 | 3;
  farah: FarahState;
  grandRewind: boolean;
  puzzles: Record<string, PuzzleState>;
  defeated: string[];
}
export interface CampaignSave extends SaveData {
  journey: CampaignState;
}
