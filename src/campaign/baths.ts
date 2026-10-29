import type { CampaignGame } from "./CampaignGame";
import type { Platform } from "../game/types";
import type { BathsState, CampaignRoom } from "./types";

export const BATHS_IDS = [
  "baths-main",
  "steam-chambers",
  "sluice-reservoir",
  "bathworks",
  "upper-baths",
  "maintenance",
];
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});

export function buildBaths(rooms: Record<string, CampaignRoom>) {
  const add = (
    id: string,
    title: string,
    objective: string,
    availableAfter: number,
  ) => {
    rooms[id] = {
      ...rooms["baths-main"],
      id,
      name: title,
      mapLabel: title,
      content: {
        id,
        title,
        objective,
        part: "IV",
        layout: "hall",
        theme: "water",
        story: "",
      },
      availableAfter,
      width: 1280,
      height: 800,
      doors: [],
      pickups: [],
      enemies: [],
      fountain: undefined,
      platforms: [p(0, 650, 1280, 150)],
      grips: [],
      hint: objective,
    };
  };
  add(
    "steam-chambers",
    "Steam chambers",
    "Climb the cool ledges above the steam vents. The reservoir intake lies east.",
    15,
  );
  add(
    "sluice-reservoir",
    "Sluice reservoir",
    "Open the intake on the upper landing. Follow the pipe west to the sluice wheel.",
    15,
  );
  add(
    "maintenance",
    "Maintenance passage",
    "Time Dash crosses the broken conduit. Unlatch the rotunda gate from this side.",
    17,
  );

  const hub = rooms["baths-main"];
  hub.name = "Baths rotunda";
  hub.mapLabel = "Rotunda";
  hub.width = 1440;
  hub.platforms = [p(0, 650, 1440, 150), p(490, 530, 210), p(760, 420, 260)];
  hub.pickups = hub.pickups.map((p) => ({ ...p, x: 1120, y: 605 }));
  hub.doors = [
    { x: 100, y: 650, to: "cliffs", label: "Cliff walk" },
    {
      x: 1320,
      y: 650,
      to: "steam-chambers",
      label: "Steam chambers",
      milestone: "baths-main",
    },
    { x: 900, y: 420, to: "bathworks", label: "Sluice stair", gate: "drained" },
    {
      x: 600,
      y: 650,
      to: "maintenance",
      label: "Maintenance grate",
      gate: "shortcut",
    },
  ];
  hub.hint =
    "Steam chambers east. The stair above the central pool is flooded; the maintenance grate opens from within.";
  const steam = rooms["steam-chambers"];
  steam.platforms = [
    p(0, 650, 1280, 150),
    p(300, 530, 180),
    p(580, 420, 180),
    p(860, 310, 420),
  ];
  steam.hazards = [390, 720].map((x) => ({
    x,
    y: 580,
    w: 50,
    h: 70,
    kind: "sandfall",
    period: 3,
  }));
  steam.doors = [
    { x: 100, y: 650, to: "baths-main", label: "Baths rotunda" },
    { x: 1170, y: 310, to: "sluice-reservoir", label: "Reservoir balcony" },
  ];
  const reservoir = rooms["sluice-reservoir"];
  reservoir.platforms = [
    p(0, 650, 1280, 150),
    p(0, 310, 310),
    p(350, 430, 200),
    p(580, 530, 290),
  ];
  reservoir.doors = [
    { x: 100, y: 310, to: "steam-chambers", label: "Steam balcony" },
    { x: 1160, y: 650, to: "bathworks", label: "Follow pipe to sluice wheel" },
  ];
  // Ladder makes the reservoir balcony reversible, before and after drainage.
  reservoir.grips = [
    { id: "intake-ladder", kind: "ladder", x: 220, y: 310, length: 340 },
  ];
  const works = rooms["bathworks"];
  works.name = "Sluice machinery";
  works.mapLabel = "Sluice";
  works.width = 1280;
  works.platforms = [p(0, 650, 1280, 150), p(480, 530, 210), p(760, 420, 520)];
  works.fountain = { x: 250, y: 650 };
  works.pickups = works.pickups.map((p) => ({ ...p, x: 1020, y: 375 }));
  works.doors = [
    { x: 100, y: 650, to: "sluice-reservoir", label: "Reservoir floor" },
    {
      x: 1140,
      y: 420,
      to: "upper-baths",
      label: "Upper pools",
      gate: "drained",
      milestone: "bathworks",
    },
    {
      x: 870,
      y: 650,
      to: "baths-main",
      label: "Drained stair to rotunda",
      gate: "drained",
    },
  ];
  const upper = rooms["upper-baths"];
  upper.doors.push({
    x: 1450,
    y: 300,
    to: "maintenance",
    label: "Cracked conduit · sword + Time Dash",
    gate: "sword-dash",
  });
  // The old linear return is now the physical sluice stair.
  upper.doors[0] = {
    x: 100,
    y: 650,
    to: "bathworks",
    label: "Sluice machinery",
  };
  const maintenance = rooms.maintenance;
  maintenance.platforms = [
    p(0, 650, 340, 150),
    p(850, 650, 430, 150),
    p(290, 520, 170),
  ];
  maintenance.doors = [
    {
      x: 100,
      y: 650,
      to: "upper-baths",
      label: "Upper pools",
      gate: "sword-dash",
    },
    {
      x: 1160,
      y: 650,
      to: "baths-main",
      label: "Rotunda shortcut",
      gate: "shortcut",
    },
  ];
  maintenance.pickups = [];
  for (const [i, id] of BATHS_IDS.entries()) {
    rooms[id].region = "Baths and Waterworks";
    rooms[id].map = { x: [0, 1, 2, 1, 2, 1][i], y: [1, 1, 2, 2, 3, 3][i] };
  }
}

// Drainage changes the rotunda pool and raises service piers in the reservoir.
// Keep platform order stable while either state is active.
export function bathsPlatforms(
  id: string,
  state: BathsState,
  base: Platform[],
) {
  if (id === "baths-main")
    return [...base, p(720, state.drained ? 540 : 1000, 190)];
  if (id === "sluice-reservoir")
    return [...base, p(920, state.drained ? 530 : 1000, 180)];
  return base;
}

export function bathsControl(g: CampaignGame) {
  const b = g.journey.baths;
  const control =
    g.room.id === "sluice-reservoir"
      ? {
          x: 270,
          y: 310,
          label: b.intake
            ? "Intake open · sluice wheel in the machinery room"
            : "Open reservoir intake",
          action: () => {
            b.intake = true;
            g.notify(
              "Intake open. Follow the pipe to the sluice machinery below.",
            );
          },
        }
      : g.room.id === "bathworks"
        ? {
            x: 540,
            y: 650,
            label: b.drained
              ? "Baths drained · stair and service piers open"
              : "Turn the Baths sluice wheel",
            action: () => {
              if (!b.intake) {
                g.notify(
                  "The wheel has no pressure. Open the reservoir intake on the balcony first.",
                );
                return;
              }
              b.drained = true;
              g.notify(
                "Water falls in the rotunda. Service piers rise in the reservoir; the upper pools are open.",
              );
            },
          }
        : g.room.id === "maintenance"
          ? {
              x: 1030,
              y: 650,
              label: b.shortcut
                ? "Rotunda grate unlatched"
                : "Unlatch rotunda shortcut",
              action: () => {
                b.shortcut = true;
                g.notify(
                  "The rotunda grate stays open. Waterkeepers used this conduit to bypass the steam chambers.",
                );
              },
            }
          : null;
  return (
    control && {
      ...control,
      action: () => {
        control.action();
        g.history = [];
        g.save(false);
      },
    }
  );
}
