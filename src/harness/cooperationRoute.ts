import type { RewardStep } from "./rewardsRoute";
// Starts at the drained wheel; returns through the new reservoir loop.
export const cooperationApproach: RewardStep[] = [
  [695],
  "use",
  [1085],
  "use",
  [365],
  "use", // Spillway fountain. Crossing failures restart here.
  [205],
  "use",
];
export const cooperationClimb: RewardStep[] = [
  [260],
  [360, 530],
  [390],
  [500, 475],
  [555],
  [690, 420],
  [685],
  "use",
];
export const cooperationFinish: RewardStep[] = [
  [860, 420],
  [915],
  [1120, 420],
  [1045],
  "use",
  [1165],
  "use",
  [635],
  "use",
  [1155],
  "use",
  [1145],
  "use",
  [525],
];
