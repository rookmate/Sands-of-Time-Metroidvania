import type { Ability, Room, SaveData, Vec, Rect, Door } from "../game/types";

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
export interface CampaignDoor extends Door {
  milestone?: string;
  gate?:
    | "sun-seal"
    | "crown-wheel"
    | "crown-light"
    | "depths-entry"
    | "depths-filter"
    | "depths-rest"
    | "depths-lock"
    | "refuge-lift"
    | "mastery-wall"
    | "mastery-rope"
    | "ram-wall"
    | "history-sill"
    | "wing-wall"
    | "wing-arch"
    | "echo-step"
    | "echo-bell"
    | "echo-span"
    | "drained"
    | "sword-dash"
    | "shortcut"
    | "spillway"
    | "loft-shortcut"
    | "garden-water"
    | "hall-light"
    | "sky-lens"
    | "prison-winch"
    | "prison-release";
}
export interface CampaignRoom extends Room {
  content: Section;
  availableAfter: number;
  doors: CampaignDoor[];
}
export interface BathsState {
  intake: boolean;
  drained: boolean;
  shortcut: boolean;
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
export interface CooperationState {
  phase: "idle" | "scouting" | "ready" | "primed" | "crossed" | "reunited";
  travel: number;
  remaining: number;
}
export interface PalaceState {
  irrigated: boolean;
  sky: boolean;
  winch: boolean;
  prisonOpen: boolean;
}
export interface CampaignState {
  version: 14;
  mapMarkers: Partial<Record<string, import("./cartography").MapMarker>>;
  depths: import("./depths").DepthsState;
  consequences: { nimaRescued: boolean; liftRepaired: boolean };
  mastery: { solved: string[] };
  rival: import("./rival").RivalState;
  traversal: { broken: boolean; latched: boolean };
  history: { read: import("./history").HistoryEvidence[]; opened: boolean };
  wing: { era: import("./eraWing").WingEra; discovered: boolean };
  echoes: { solved: string[] };
  palace: PalaceState;
  cooperation: CooperationState;
  rewards: {
    attunement: import("./rewards").Attunement | null;
    inscription: boolean;
  };
  baths: BathsState;
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
