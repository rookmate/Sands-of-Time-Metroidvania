import type { CampaignRoom } from "./types";
import type { Platform } from "../game/types";

export const DEPTHS_IDS = [
  "depths-well",
  "depths-lock",
  "depths-race",
  "depths-heart",
  "depths-spring",
];
export const DEPTHS_HEART = "depths-spring-heart";
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});
export function buildDepths(rooms: Record<string, CampaignRoom>) {
  const names = [
    "The sounding well",
    "Two hands at the flood lock",
    "The blind filter race",
    "Keeper of the sealed spring",
    "Water beneath the sand",
  ];
  const hints = [
    "The reservoir's three-knock pipe continues down this well. Descend the staggered landings; the west ladder always climbs back. Farah waits above the narrow shaft.",
    "The keeper's lock needs two hands. {echo} records a wait on the striped lower plate; {echo} replays it. Climb the opposite shelves while the echo holds the grille, then latch it above. {cancelEcho} cancels; the fountain restores sand.",
    "The upper race is broken. Jump then Time Dash from the west lip to the far bank. A lower catch floor and west ladder recover misses. Turn the filter bypass on the far bank; the keeper below is still sealing foul water.",
    "The bronze keeper guards the spring with pressure, not a blade. {interact} at the inlet starts its test after the filter bypass is open. Outlined pipes warn before jets: climb to the west relief, then the east. Safe floor below each shelf and the west exit allow retreat. Slow and Freeze affect the pressure cycle; {rewind} only rewinds you.",
    "The spring was sealed against poisoned runoff, not hidden for a king. A fresh channel lets the keeper rest. Its service lift now links the reservoir depths to the Baths rotunda. The heart on the high bank is optional.",
  ];
  DEPTHS_IDS.forEach((id, i) => {
    rooms[id] = {
      ...rooms["sluice-reservoir"],
      id,
      name: names[i],
      mapLabel: names[i],
      region: "Beneath the reservoir",
      availableAfter: 17,
      map: { x: i, y: 0 },
      width: i === 3 ? 1600 : 1280,
      height: i === 0 ? 1100 : i === 3 ? 900 : 800,
      content: {
        id,
        title: names[i],
        part: "IV",
        theme: "water",
        layout: "hall",
        story: "",
        objective: hints[i],
      },
      hint: hints[i],
      platforms: [],
      doors: [],
      grips: [],
      hazards: [],
      enemies: [],
      pickups: [],
      fountain: undefined,
    };
  });
  const well = rooms["depths-well"];
  well.platforms = [
    p(0, 310, 330),
    p(400, 450, 240),
    p(760, 610, 300),
    p(400, 780, 340),
    p(0, 950, 1280, 150),
  ];
  well.grips = [
    { id: "sounding-ladder", kind: "ladder", x: 190, y: 310, length: 640 },
  ];
  well.doors = [
    { x: 80, y: 310, to: "sluice-reservoir", label: "Climb to the reservoir" },
    { x: 1170, y: 950, to: "depths-lock", label: "Flood lock below the well" },
  ];
  const lock = rooms["depths-lock"];
  lock.platforms = [
    p(0, 650, 1280, 150),
    p(470, 530, 180),
    p(740, 420, 180),
    p(990, 420, 290),
  ];
  lock.fountain = { x: 190, y: 650 };
  lock.doors = [
    { x: 70, y: 650, to: "depths-well", label: "Sounding well" },
    {
      x: 1200,
      y: 420,
      to: "depths-race",
      label: "Filter race",
      gate: "depths-lock",
    },
  ];
  const race = rooms["depths-race"];
  race.platforms = [
    p(0, 420, 460),
    p(290, 300, 170),
    p(970, 420, 310),
    p(0, 700, 1280, 100),
  ];
  race.grips = [
    { id: "filter-ladder", kind: "ladder", x: 190, y: 420, length: 280 },
  ];
  race.doors = [
    { x: 80, y: 420, to: "depths-lock", label: "Flood lock" },
    {
      x: 1190,
      y: 420,
      to: "depths-heart",
      label: "Descend to the bronze keeper",
      gate: "depths-filter",
    },
  ];
  const heart = rooms["depths-heart"];
  heart.platforms = [
    p(0, 750, 1600, 150),
    p(300, 620, 180),
    p(490, 500, 210),
    p(1000, 620, 170),
    p(1200, 500, 250),
  ];
  heart.fountain = { x: 190, y: 750 };
  heart.doors = [
    { x: 70, y: 750, to: "depths-race", label: "Retreat to the filter race" },
    {
      x: 1510,
      y: 750,
      to: "depths-spring",
      label: "The sealed spring",
      gate: "depths-rest",
    },
  ];
  const spring = rooms["depths-spring"];
  spring.platforms = [p(0, 650, 1280, 150), p(310, 530, 180), p(580, 420, 400)];
  spring.pickups = [{ id: DEPTHS_HEART, kind: "heart", x: 850, y: 375 }];
  spring.doors = [
    { x: 70, y: 650, to: "depths-heart", label: "The resting keeper" },
    {
      x: 1150,
      y: 650,
      to: "baths-main",
      label: "Fresh-water lift to Baths rotunda",
      gate: "depths-rest",
    },
  ];
  rooms["sluice-reservoir"].doors.push({
    x: 740,
    y: 650,
    to: "depths-well",
    label: "Three-knock pipe · hidden descent · optional",
    gate: "depths-entry",
  });
  rooms["baths-main"].doors.push({
    x: 1120,
    y: 650,
    to: "depths-spring",
    label: "Spring service lift",
    gate: "depths-rest",
  });
}
