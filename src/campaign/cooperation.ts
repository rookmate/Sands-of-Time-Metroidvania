import type { CampaignGame } from "./CampaignGame";
import type { CampaignRoom, CooperationState } from "./types";
import type { Platform, Vec } from "../game/types";

export const COOP_ROOMS = ["spillway", "valve-loft"];
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});
// A narrow stair is visible to both characters. Only Farah fits its service arch.
export const FARAH_STAIR: Vec[] = [
  { x: 710, y: 650 },
  { x: 790, y: 530 },
  { x: 930, y: 420 },
  { x: 1100, y: 310 },
];
export function stairPosition(travel: number): Vec {
  const n = Math.min(travel, 0.999999) * (FARAH_STAIR.length - 1);
  const i = Math.floor(n),
    a = FARAH_STAIR[i],
    b = FARAH_STAIR[i + 1];
  return { x: a.x + (b.x - a.x) * (n - i), y: a.y + (b.y - a.y) * (n - i) };
}
export const freshCooperation = (): CooperationState => ({
  phase: "idle",
  travel: 0,
  remaining: 0,
});
export function cooperationActive(g: CampaignGame) {
  return (
    g.journey.farah === "following" &&
    !["idle", "reunited"].includes(g.journey.cooperation.phase)
  );
}
export function cooperationStatus(g: CampaignGame) {
  const s = g.journey.cooperation;
  switch (s.phase) {
    case "idle":
      return g.journey.completed.length > 16 || g.journey.farah !== "following"
        ? "Farah's spillway route was left unexplored"
        : "Optional: Farah can reach the valve loft from the drained sluice machinery";
    case "scouting":
      return `Farah: climbing the service stair to the valve loft (${Math.floor(s.travel * 100)}%)`;
    case "ready":
      return "Farah: at the valve loft. Ring the lower spillway bell to raise the lower step";
    case "primed":
      return s.remaining > 0
        ? `Farah: holding the spillway valve, ${s.remaining.toFixed(1)}s. Cross and latch the far bank`
        : "Farah: at the valve loft. Climb the raised step; ring the upper bell for an 8s crossing";
    case "crossed":
      return "Farah: waiting in the valve loft. The spillway bridge is latched; climb to reunite";
    case "reunited":
      return "Spillway route complete. Bridge and reservoir service shortcut stay open";
  }
}
export function buildCooperation(rooms: Record<string, CampaignRoom>) {
  const add = (id: string, title: string, objective: string, map: Vec) => {
    rooms[id] = {
      ...rooms.bathworks,
      id,
      name: title,
      mapLabel: title,
      map,
      availableAfter: 15,
      width: 1280,
      height: 800,
      content: {
        id,
        title,
        objective,
        story: "",
        part: "IV",
        theme: "water",
        layout: "hall",
      },
      doors: [],
      pickups: [],
      enemies: [],
      hazards: [],
      grips: [],
      fountain: undefined,
      hint: objective,
    };
  };
  add(
    "spillway",
    "Bell spillway",
    "Ring the lower bell, climb the raised step, then signal an eight-second crossing from the upper bell. Latch the far bank.",
    { x: 4, y: 2 },
  );
  add(
    "valve-loft",
    "Valve loft",
    "Reunite with Farah at the valve. The service door returns to the reservoir service shelf.",
    { x: 4, y: 1 },
  );
  rooms.bathworks.doors.push({
    x: 1100,
    y: 650,
    to: "spillway",
    label: "Bell spillway · Farah's service route",
    gate: "drained",
  });
  rooms.spillway.platforms = [
    p(0, 650, 1280, 150),
    p(280, 530, 130),
    p(650, 420, 100),
    p(1040, 420, 240),
  ];
  rooms.spillway.fountain = { x: 380, y: 650 };
  rooms.spillway.hazards = [
    { x: 945, y: 580, w: 45, h: 70, kind: "sandfall", period: 3 },
  ];
  rooms.spillway.doors = [
    { x: 70, y: 650, to: "bathworks", label: "Sluice machinery" },
    {
      x: 1180,
      y: 420,
      to: "valve-loft",
      label: "Climb to Farah's valve loft",
      gate: "spillway",
    },
  ];
  rooms["valve-loft"].platforms = [p(0, 650, 1280, 150)];
  rooms["valve-loft"].doors = [
    {
      x: 100,
      y: 650,
      to: "spillway",
      label: "Latched spillway bridge",
      gate: "spillway",
    },
    {
      x: 1170,
      y: 650,
      to: "sluice-reservoir",
      label: "Reservoir service shortcut",
      gate: "loft-shortcut",
    },
  ];
  rooms["sluice-reservoir"].doors.push({
    x: 650,
    y: 530,
    to: "valve-loft",
    label: "Valve loft service door",
    gate: "loft-shortcut",
  });
}
export function cooperationPlatforms(g: CampaignGame, base: Platform[]) {
  if (g.room.id !== "spillway") return base;
  const s = g.journey.cooperation;
  const primed = ["primed", "crossed", "reunited"].includes(s.phase);
  const open = s.remaining > 0 || ["crossed", "reunited"].includes(s.phase);
  return [
    ...base,
    p(450, primed ? 475 : 1000, 130),
    p(790, open ? 420 : 1000, 160),
  ];
}
function commit(g: CampaignGame, message: string) {
  g.history = [];
  g.save(false);
  g.notify(message);
}
export function stepCooperation(g: CampaignGame, dt: number) {
  const s = g.journey.cooperation;
  if (s.phase === "scouting") {
    s.travel = Math.min(1, s.travel + dt / 2);
    if (s.travel === 1) {
      s.phase = "ready";
      g.farah.enter();
      commit(
        g,
        "Farah: I'm at the valve loft. The bell pipe reaches me in the spillway. Try the lower bell first.",
      );
    }
  }
  const previous = s.remaining;
  s.remaining = Math.max(
    0,
    s.remaining - dt * (g.freezeTime > 0 ? 0 : g.slowTime > 0 ? 0.25 : 1),
  );
  if (previous > 0 && s.remaining === 0)
    g.notify(
      "Farah: Pressure's gone. The upper bell resets the full eight seconds. The lower step stays raised.",
    );
}
export function cooperationControls(g: CampaignGame) {
  const s = g.journey.cooperation;
  const control = (
    x: number,
    y: number,
    label: string,
    action: () => void,
  ) => ({ x, y, label, action });
  if (
    g.room.id === "bathworks" &&
    s.phase === "idle" &&
    g.journey.baths.drained &&
    g.journey.farah === "following" &&
    g.journey.completed.length <= 16
  )
    return [
      control(
        710,
        650,
        "Ask Farah to take the service stair to the valve loft",
        () => {
          s.phase = "scouting";
          g.farah.enter();
          commit(
            g,
            "Farah: I can fit through that arch. Follow the bell pipe into the spillway; ring when you're ready. We'll meet in the loft.",
          );
        },
      ),
    ];
  if (g.room.id === "spillway")
    return [
      control(
        220,
        650,
        s.phase === "ready"
          ? "Ring lower bell · Farah raises the lower step"
          : "Lower bell · signal the valve loft",
        () => {
          if (s.phase === "idle") {
            g.notify(
              "The loft is empty. Ask Farah at the service stair in the sluice machinery.",
            );
            return;
          }
          if (s.phase === "scouting") {
            g.notify(cooperationStatus(g));
            return;
          }
          if (s.phase !== "ready") {
            g.notify("The lower step stays raised. Climb to the upper bell.");
            return;
          }
          s.phase = "primed";
          commit(
            g,
            "Farah, through the bell pipe: One ring raises the step. Climb to the upper bell; I'll hold the next span for eight seconds.",
          );
        },
      ),
      control(
        700,
        420,
        s.remaining > 0
          ? `Ring upper bell again · reset to 8s (${s.remaining.toFixed(1)}s left)`
          : "Ring upper bell · Farah holds the span for 8s",
        () => {
          if (s.phase !== "primed") {
            g.notify(
              s.phase === "crossed" || s.phase === "reunited"
                ? "The bridge is latched permanently."
                : "Ring the lower bell first.",
            );
            return;
          }
          s.remaining = 8;
          commit(
            g,
            "Farah: Eight seconds! Jump across the raised span and pull the far-bank latch. Ring again if you miss.",
          );
        },
      ),
      control(
        1060,
        420,
        "Latch spillway bridge and open the loft stair",
        () => {
          if (s.phase !== "primed" || s.remaining <= 0) {
            g.notify(
              s.phase === "crossed" || s.phase === "reunited"
                ? "Bridge latched. The loft stair is open."
                : "Signal from the upper bell, then reach this latch while Farah holds the span.",
            );
            return;
          }
          s.phase = "crossed";
          s.remaining = 0;
          commit(
            g,
            "Farah: The latch has it! Come up to the valve loft. That service door leads back to the reservoir service shelf.",
          );
        },
      ),
    ];
  if (g.room.id === "valve-loft" && s.phase === "crossed")
    return [
      control(
        650,
        650,
        "Reunite with Farah · open reservoir service shortcut",
        () => {
          s.phase = "reunited";
          g.farah.enter();
          commit(
            g,
            "Farah: I heard every ring through that pipe. The bridge will hold without us now. Let's get back to the upper pools.",
          );
        },
      ),
    ];
  return [];
}
