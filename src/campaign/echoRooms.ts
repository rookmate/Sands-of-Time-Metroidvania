import type { CampaignRoom } from "./types";
import type { Platform, Rect, Vec } from "../game/types";

export interface EchoChamber {
  plate: Vec;
  bell?: Vec;
  gate: Rect;
  latch: Vec;
  bridge?: Platform;
}
export const CORE_ECHO_IDS = ["echo-step", "echo-bell", "echo-span"];
export const ECHO_CHAMBERS: Record<string, EchoChamber> = {
  "depths-lock": {
    plate: { x: 350, y: 650 },
    gate: { x: 940, y: 0, w: 30, h: 650 },
    latch: { x: 1090, y: 420 },
  },
  "mirror-vault": {
    plate: { x: 350, y: 650 },
    bell: { x: 760, y: 650 },
    gate: { x: 940, y: 0, w: 30, h: 650 },
    latch: { x: 1060, y: 650 },
  },
  "echo-step": {
    plate: { x: 320, y: 650 },
    gate: { x: 620, y: 0, w: 30, h: 650 },
    latch: { x: 1060, y: 650 },
  },
  "echo-bell": {
    plate: { x: 320, y: 650 },
    bell: { x: 760, y: 650 },
    gate: { x: 940, y: 0, w: 30, h: 650 },
    latch: { x: 1120, y: 650 },
  },
  "echo-span": {
    plate: { x: 430, y: 530 },
    bell: { x: 430, y: 530 },
    gate: { x: 990, y: 0, w: 30, h: 420 },
    bridge: { x: 730, y: 420, w: 150, h: 24, oneWay: true },
    latch: { x: 1120, y: 420 },
  },
};
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});
export function buildEchoRooms(rooms: Record<string, CampaignRoom>) {
  const hints = [
    "Stand on the striped plate. {echo} records a wait; {echo} again replays it. Leave your echo holding the gate while you latch the far side. {cancelEcho} cancels. Each recording costs 1 sand.",
    "Record a run from the plate to the marked bell and press {interact} there. During replay, hold the plate yourself. The echo rings the bell for a four-second gate. Latch the far side.",
    "Climb to the striped shelf. Record a wait, then ring {interact} at its bell before ending. Your echo holds the span and repeats the bell. Climb above it and jump the raised span to the latch. The floor catches misses.",
  ];
  CORE_ECHO_IDS.forEach((id, i) => {
    const name = ["Echo threshold", "Answering bells", "Divided ascent"][i];
    rooms[id] = {
      ...rooms["echo-gallery"],
      id,
      name,
      mapLabel: name,
      region: "Waterkeepers' echo chambers",
      width: 1280,
      height: 800,
      map: { x: i + 1, y: 4 },
      availableAfter: 17,
      content: {
        id,
        title: name,
        part: "IV",
        theme: "water",
        layout: "hall",
        story: "",
        objective: hints[i],
      },
      hint: hints[i],
      pickups: [],
      enemies: [],
      hazards: [],
      grips: [],
      fountain: { x: 180, y: 650 },
      platforms:
        i === 2
          ? [
              p(0, 650, 1280, 150),
              p(300, 530, 220),
              p(540, 420, 120),
              p(1030, 420, 250),
            ]
          : [p(0, 650, 1280, 150)],
      doors: [],
    };
  });
  rooms["echo-gallery"].doors.push({
    x: 1210,
    y: 310,
    to: "echo-step",
    label: "Echo threshold · record a second pair of hands",
  });
  rooms["echo-step"].doors = [
    { x: 70, y: 650, to: "echo-gallery", label: "Time seal gallery" },
    {
      x: 1190,
      y: 650,
      to: "echo-bell",
      label: "Answering bells",
      gate: "echo-step",
    },
  ];
  rooms["echo-bell"].doors = [
    { x: 70, y: 650, to: "echo-step", label: "Echo threshold" },
    {
      x: 1190,
      y: 650,
      to: "echo-span",
      label: "Divided ascent",
      gate: "echo-bell",
    },
  ];
  rooms["echo-span"].doors = [
    { x: 70, y: 650, to: "echo-bell", label: "Answering bells" },
    {
      x: 1190,
      y: 420,
      to: "echo-gallery",
      label: "Waterkeeper return arch",
      gate: "echo-span",
    },
  ];
  // Reciprocal doorway for a truthful return loop. It opens with the final latch.
  rooms["echo-gallery"].doors.push({
    x: 560,
    y: 650,
    to: "echo-span",
    label: "Divided ascent return arch",
    gate: "echo-span",
  });
}
