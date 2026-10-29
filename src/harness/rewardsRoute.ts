import { ATTUNEMENTS, type Attunement } from "../campaign/rewards";

// Input destinations consumed by CampaignHarness's ordinary walk/jump/use helpers.
export type RewardStep =
  [x: number, floor?: number, dashFrame?: number] | "use";
export function galleryRoute(choice: Attunement): RewardStep[] {
  return [
    [1060],
    [1130, 530],
    [1175],
    "use",
    [260],
    [360, 530],
    [420],
    [650, 420],
    [690],
    [820, 310],
    [ATTUNEMENTS[choice].x - 15],
    "use",
    [100],
    "use",
    [970],
    [970, 650],
  ];
}
export const cisternRoute: RewardStep[] = [
  // From the drained sluice landing, descend to its reservoir door.
  [440],
  [235],
  [85],
  "use",
  [840],
  [1000, 530],
  [1015],
  "use",
  [205],
  "use",
  [260],
  [370, 520],
  [920, 530, 40],
  [960],
  [1080, 530],
  [1095],
  [1160],

  "use", // Read names on the reward shelf.
  [900],
  [400, 520, 40],
  [100],
  "use",
  // Reservoir to machinery, then back onto the upper-pool story route.
  [1145],
  "use",
  [440],
  [540, 530],
  [630],
  [840, 420],
];
