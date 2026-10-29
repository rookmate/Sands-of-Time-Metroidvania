export type Ability = "rewind" | "slow" | "freeze" | "dash";
export type StoryFlag = "water" | "guardian" | "victory";
export type Requirement = Ability | StoryFlag;
export type Theme =
  "palace" | "garden" | "tower" | "water" | "corrupt" | "throne";
export interface Vec {
  x: number;
  y: number;
}
export interface Rect extends Vec {
  w: number;
  h: number;
}
export interface Platform extends Rect {
  oneWay?: boolean;
  kind?: "stone" | "moving";
  axis?: "x" | "y";
  range?: number;
  speed?: number;
}
export interface Grip extends Vec {
  id: string;
  kind: "bar" | "rope" | "ladder";
  length?: number;
}
export interface Companion extends Rect {
  vx: number;
  vy: number;
  face: number;
  health: number;
  maxHealth: number;
  cooldown: number;
  holding: Vec | null;
}
export interface Door extends Vec {
  to: string;
  label: string;
  requires?: Requirement;
  hint?: string;
}
export type PickupKind =
  | "rewind"
  | "slow"
  | "freeze"
  | "dash"
  | "sand"
  | "heart"
  | "dagger"
  | "sword"
  | "vessel";
export interface Pickup extends Vec {
  id: string;
  kind: PickupKind;
  requires?: Requirement;
}
export interface EnemySpawn extends Vec {
  behavior?: "ram";
  kind:
    | "rival"
    | "guard"
    | "archer"
    | "brute"
    | "guardian"
    | "vizier"
    | "king"
    | "double"
    | "bird"
    | "scarab";
  patrol: [number, number];
  tier?: number;
}
export interface Hazard extends Rect {
  kind: "spikes" | "blade" | "sandfall";
  period?: number;
}
export interface Room {
  id: string;
  name: string;
  region: string;
  chapter: string;
  theme: Theme;
  width: number;
  height: number;
  map: Vec;
  mapLabel: string;
  platforms: Platform[];
  doors: Door[];
  pickups: Pickup[];
  enemies: EnemySpawn[];
  hazards: Hazard[];
  fountain?: Vec;
  event?: Vec & { flag: StoryFlag; label: string; requires?: Requirement };
  hint: string;
  grips?: Grip[];
}
export interface Player extends Rect {
  vx: number;
  vy: number;
  face: number;
  health: number;
  maxHealth: number;
  sand: number;
  maxSand: number;
  grounded: boolean;
  wall: number;
  wallTime: number;
  coyote: number;
  jumpBuffer: number;
  invincible: number;
  attack: number;
  attackCooldown: number;
  combo: number;
  comboWindow: number;
  dashTime: number;
  dashCooldown: number;
  ledge: Vec | null;
  wallLock: number;
  grip: string | null;
  gripCooldown: number;
}
export interface Enemy extends Rect {
  rivalMove?: "thrust" | "cast";
  rivalLunge?: number;
  behavior?: "ram";
  charge?: { direction: number; remaining: number };
  chargeImpact?: number;
  id: number;
  kind: EnemySpawn["kind"];
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  patrol: [number, number];
  face: number;
  cooldown: number;
  telegraph: number;
  hitFlash: number;
  hitStun?: number;
  attackId: number;
  dead: boolean;
  phase: number;
  protected?: boolean;
}
export interface Projectile extends Vec {
  vx: number;
  vy: number;
  life: number;
  radius: number;
}
export interface Particle extends Vec {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}
export interface SaveData {
  version: 1;
  room: string;
  checkpoint: Vec;
  abilities: Ability[];
  flags: StoryFlag[];
  collected: string[];
  visited: string[];
  maxHealth: number;
  playTime: number;
  deaths: number;
}
export interface Options {
  music: boolean;
  sfx: boolean;
  shake: boolean;
  assist: boolean;
}
export type Screen =
  | "title"
  | "playing"
  | "pause"
  | "map"
  | "options"
  | "help"
  | "story"
  | "death"
  | "ending";
export interface Story {
  title: string;
  text: string;
  detail: string;
  kind: "ability" | "story";
}
