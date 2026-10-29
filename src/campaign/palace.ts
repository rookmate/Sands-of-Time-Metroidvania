import type { CampaignGame } from "./CampaignGame";
import type { CampaignDoor, CampaignRoom, PalaceState } from "./types";
import type { Platform } from "../game/types";

export const PALACE_IDS = [
  "garden-court",
  "root-conduit",
  "cypress-crown",
  "archive-stair",
  "sky-bridge",
  "lens-roof",
  "prison-cells",
  "chain-shaft",
  "warden-loft",
];
export const freshPalace = (): PalaceState => ({
  irrigated: false,
  sky: false,
  winch: false,
  prisonOpen: false,
});
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});

export function buildPalace(rooms: Record<string, CampaignRoom>) {
  const add = (
    id: string,
    name: string,
    region: string,
    theme: CampaignRoom["theme"],
    availableAfter: number,
    x: number,
    y: number,
    hint: string,
    platforms: Platform[],
  ) => {
    rooms[id] = {
      ...rooms["baths-main"],
      id,
      name,
      mapLabel: name,
      region,
      theme,
      availableAfter,
      chapter:
        availableAfter < 28 ? "IV" : availableAfter < 32 ? "VII" : "VIII",
      map: { x, y },
      width: 1280,
      height: 800,
      content: {
        id,
        title: name,
        part: availableAfter < 28 ? "IV" : availableAfter < 32 ? "VII" : "VIII",
        theme,
        layout: "hall",
        story: "",
        objective: hint,
      },
      hint,
      platforms,
      doors: [],
      grips: [],
      hazards: [],
      pickups: [],
      enemies: [],
      fountain: undefined,
    };
  };
  add(
    "garden-court",
    "Cypress court",
    "Hanging Gardens",
    "garden",
    17,
    1,
    2,
    "Root conduit below; crown stair above. Restore irrigation at the conduit's far bank. The Baths feed this garden.",
    [p(0, 650, 1280, 150), p(280, 530, 180), p(800, 310, 480)],
  );
  add(
    "root-conduit",
    "Root conduit",
    "Hanging Gardens",
    "water",
    17,
    1,
    3,
    "The drained Baths feed these service piers. Jump, then Time Dash across the broken channel. Open the garden wheel above the far bank.",
    [
      p(0, 650, 340, 150),
      p(850, 650, 430, 150),
      p(290, 520, 170),
      p(1000, 420, 280),
    ],
  );
  add(
    "cypress-crown",
    "Cypress crown",
    "Hanging Gardens",
    "garden",
    17,
    2,
    2,
    "The irrigation lifts this canopy path. West: court. East: Hall terraces. The roof arch opens from the observatory.",
    [
      p(0, 650, 1280, 150),
      p(300, 530, 180),
      p(580, 420, 180),
      p(860, 310, 420),
    ],
  );
  add(
    "archive-stair",
    "Archive stair",
    "Learning and Observatory",
    "palace",
    28,
    3,
    2,
    "Climb the librarians' ladder to the shutter bridge. The Hall mirror receiver lights its signal. Garden water raises a return step here too.",
    [p(0, 650, 1280, 150), p(0, 310, 380), p(650, 420, 240)],
  );
  rooms["archive-stair"].grips = [
    { id: "archive-ladder", kind: "ladder", x: 250, y: 310, length: 340 },
  ];
  add(
    "sky-bridge",
    "Shutter bridge",
    "Learning and Observatory",
    "tower",
    28,
    3,
    1,
    "Open the six-second shutter. Climb the staggered shelves and pass the shutter to pin the roof lens. Slow or Freeze gives more time; the lower floor permits a retry.",
    [
      p(0, 650, 1280, 150),
      p(300, 530, 170),
      p(570, 420, 170),
      p(840, 310, 440),
    ],
  );
  rooms["sky-bridge"].content.puzzle = {
    kind: "timed",
    lever: { x: 200, y: 650 },
    gate: { x: 780, y: 0, w: 35, h: 650 },
    seconds: 6,
  };
  add(
    "lens-roof",
    "Lens roof",
    "Learning and Observatory",
    "tower",
    28,
    2,
    1,
    "Follow the suspended lens-cleaning bars over the open roof. The pinned lens keeps the arch to the cypress crown open.",
    [p(0, 650, 420, 150), p(1040, 650, 240, 150)],
  );
  rooms["lens-roof"].grips = [
    { id: "lens-bar", kind: "bar", x: 450, y: 460 },
    { id: "lens-rope", kind: "rope", x: 690, y: 410, length: 210 },
    { id: "lens-end", kind: "bar", x: 930, y: 450 },
  ];
  add(
    "prison-cells",
    "Flooded cells",
    "Prison foundations",
    "corrupt",
    32,
    4,
    4,
    "The barred upper door is the return from the warden. Follow the lower drain to the chain shaft. Garden water turns the auxiliary stair.",
    [p(0, 650, 1280, 150), p(0, 310, 400), p(430, 420, 200)],
  );
  rooms["prison-cells"].grips = [
    { id: "cell-ladder", kind: "ladder", x: 220, y: 310, length: 340 },
  ];
  add(
    "chain-shaft",
    "Counterweight shaft",
    "Prison foundations",
    "corrupt",
    32,
    5,
    4,
    "Wind the lower counterweight, climb its ladder and jump then Dash across the raised chain platform. The warden's latch opens the way out and a return above the cells.",
    [p(0, 650, 1280, 150), p(0, 420, 460), p(1040, 420, 240)],
  );
  rooms["chain-shaft"].grips = [
    { id: "chain-ladder", kind: "ladder", x: 250, y: 420, length: 230 },
  ];
  add(
    "warden-loft",
    "Warden's loft",
    "Prison foundations",
    "corrupt",
    32,
    5,
    3,
    "Release the prison locks here. The upper cell door returns to the prison columns; the stair to the Hall of Learning is a cross-region return.",
    [p(0, 650, 1280, 150)],
  );
  const door = (
    from: string,
    to: string,
    x: number,
    y: number,
    label: string,
    gate?: CampaignDoor["gate"],
  ) => rooms[from].doors.push({ to, x, y, label, gate });
  // Doors are reciprocal physical connections. Only existing story exits carry milestones.
  door(
    "upper-baths",
    "garden-court",
    1800,
    300,
    "Aqueduct to the Hanging Gardens · sword + Dash",
    "sword-dash",
  );
  door("garden-court", "upper-baths", 100, 650, "Baths aqueduct", "sword-dash");
  door("garden-court", "root-conduit", 1150, 650, "Descend beside the roots");
  door("root-conduit", "garden-court", 100, 650, "Cypress court");
  door(
    "root-conduit",
    "cypress-crown",
    1210,
    420,
    "Irrigation service stair to the canopy",
    "garden-water",
  );
  door(
    "cypress-crown",
    "root-conduit",
    1100,
    650,
    "Irrigation service stair",
    "garden-water",
  );
  door(
    "garden-court",
    "cypress-crown",
    1150,
    310,
    "Irrigated canopy stair",
    "garden-water",
  );
  door("cypress-crown", "garden-court", 100, 650, "Cypress court");
  door("cypress-crown", "reunion", 1160, 310, "Hall terraces");
  door(
    "reunion",
    "cypress-crown",
    1730,
    650,
    "Hanging Gardens · restore irrigation",
    "sword-dash",
  );
  door("learning", "archive-stair", 900, 650, "Archive stair · roof lens");
  door("archive-stair", "learning", 100, 650, "Hall mirror floor");
  door(
    "archive-stair",
    "sky-bridge",
    100,
    310,
    "Shutter bridge · Hall light receiver",
    "hall-light",
  );
  door("sky-bridge", "archive-stair", 70, 650, "Archive ladder");
  door("sky-bridge", "lens-roof", 1160, 310, "Pinned lens roof", "sky-lens");
  door("lens-roof", "sky-bridge", 100, 650, "Shutter bridge", "sky-lens");
  door(
    "lens-roof",
    "cypress-crown",
    1160,
    650,
    "Roof arch to cypress crown",
    "sky-lens",
  );
  door(
    "cypress-crown",
    "lens-roof",
    700,
    650,
    "Observatory roof arch",
    "sky-lens",
  );
  door(
    "prison",
    "prison-cells",
    1200,
    650,
    "Cell drain · seek the warden's release",
  );
  door("prison-cells", "prison", 100, 650, "Prison columns");
  door("prison-cells", "chain-shaft", 1160, 650, "Lower chain shaft");
  door("chain-shaft", "prison-cells", 100, 650, "Cell drain");
  door(
    "chain-shaft",
    "warden-loft",
    1160,
    420,
    "Warden's loft",
    "prison-winch",
  );
  door(
    "warden-loft",
    "chain-shaft",
    100,
    650,
    "Counterweight shaft",
    "prison-winch",
  );
  door(
    "warden-loft",
    "prison-cells",
    1160,
    650,
    "Upper cell shortcut",
    "prison-release",
  );
  door(
    "prison-cells",
    "warden-loft",
    100,
    310,
    "Upper cell shortcut",
    "prison-release",
  );
  door(
    "warden-loft",
    "archive-stair",
    900,
    650,
    "Old gaoler's stair to the archives",
    "prison-release",
  );
  door(
    "archive-stair",
    "warden-loft",
    1150,
    650,
    "Gaoler's stair to Prison",
    "prison-release",
  );
  for (const [id, x, y] of [
    ["upper-baths", 0, 2],
    ["reunion", 2, 3],
    ["learning", 3, 3],
    ["orrery", 4, 1],
    ["learning-yard", 4, 2],
    ["ramparts", 4, 3],
    ["prison", 3, 5],
    ["tower-lift", 5, 5],
    ["hourglass", 5, 6],
  ] as const)
    rooms[id].map = { x, y };
  for (const [id, label] of Object.entries({
    "upper-baths": "Upper Baths",
    reunion: "Hall terraces",
    learning: "Learning",
    orrery: "Orrery",
    "learning-yard": "Learning yard",
    ramparts: "Ramparts",
    prison: "Prison columns",
    "tower-lift": "Tower lift",
    hourglass: "Hourglass",
  }))
    rooms[id].mapLabel = label;
  for (const id of PALACE_IDS)
    if (!["root-conduit", "lens-roof", "warden-loft"].includes(id))
      rooms[id].fountain = { x: 450, y: 650 };
  rooms["root-conduit"].fountain = { x: 1130, y: 650 };
  rooms["sky-bridge"].fountain = { x: 960, y: 310 };
  rooms["chain-shaft"].fountain = { x: 200, y: 650 };
  rooms["warden-loft"].fountain = { x: 350, y: 650 };
}

export function palaceBlock(g: CampaignGame, d: CampaignDoor): string | null {
  const s = g.journey.palace;
  // The Hourglass descent is the explicit boundary. Rewound India has no return to Azad either.
  if (
    g.journey.completed.length >= 35 &&
    g.room.id === "tomb" &&
    d.to === "hourglass"
  )
    return "Point of no return · the Hourglass descent sealed the old palace";
  if (d.milestone === "learning" && (!s.irrigated || !s.sky))
    return "Restore garden irrigation and pin the roof lens, in either order, before leaving Learning";
  if (d.milestone === "prison" && !s.prisonOpen)
    return "Release the locks in the warden's loft first · follow the cell drain";
  if (d.gate === "garden-water" && !s.irrigated)
    return "Dry canopy stair · open the root conduit wheel";
  if (d.gate === "hall-light" && !g.journey.puzzles.learning?.solved)
    return "Light the Hall of Learning mirror receiver first";
  if (d.gate === "sky-lens" && !s.sky)
    return "Pin the lens beyond the timed shutter bridge";
  if (d.gate === "prison-winch" && !s.winch)
    return "Wind the lower counterweight first";
  if (d.gate === "prison-release" && !s.prisonOpen)
    return "Barred from the warden's loft";
  return null;
}
export function palacePlatforms(g: CampaignGame, base: Platform[]) {
  const s = g.journey.palace;
  switch (g.room.id) {
    case "root-conduit":
      return [...base, p(850, g.journey.baths.drained ? 530 : 1000, 230)];
    case "garden-court":
      return [...base, p(550, s.irrigated ? 420 : 1000, 180)];
    case "archive-stair":
      return [...base, p(430, s.irrigated ? 530 : 1000, 180)];
    case "prison-cells":
      return [...base, p(700, s.irrigated ? 530 : 1000, 180)];
    case "chain-shaft":
      return [...base, p(760, s.winch ? 420 : 1000, 170)];
    default:
      return base;
  }
}
export function palaceControls(g: CampaignGame) {
  const s = g.journey.palace;
  const set = (key: keyof PalaceState, message: string) => {
    s[key] = true;
    g.history = [];
    g.save(false);
    g.notify(message);
  };
  switch (g.room.id) {
    case "root-conduit":
      return [
        {
          x: 1100,
          y: 420,
          label: s.irrigated
            ? "Garden irrigation restored"
            : "Open the garden irrigation wheel",
          action: () => {
            if (!g.journey.baths.drained) {
              g.notify(
                "Drain the Baths first. Its service pressure feeds this wheel.",
              );
              return;
            }
            set(
              "irrigated",
              "Water climbs the cypress stair. The same pipe drives return steps in the archives and prison cells.",
            );
          },
        },
      ];
    case "sky-bridge":
      return [
        {
          x: 1050,
          y: 310,
          label: s.sky
            ? "Lens pinned · garden roof arch open"
            : "Pin the roof lens and open the garden roof arch",
          action: () => {
            // Reaching this far-bank control is the test. Retry can reset the
            // temporary shutter after a fountain save on this side.
            set(
              "sky",
              "Lens pinned. The arch returns to the cypress crown; garden irrigation and roof light are the two Learning goals.",
            );
          },
        },
      ];
    case "chain-shaft":
      return [
        {
          x: 500,
          y: 650,
          label: s.winch
            ? "Counterweight wound"
            : "Wind the lower counterweight",
          action: () =>
            set(
              "winch",
              "The upper chain platform rises. Climb the ladder, jump then Time Dash to the warden's loft.",
            ),
        },
      ];
    case "warden-loft":
      return [
        {
          x: 600,
          y: 650,
          label: s.prisonOpen
            ? "Prison release open"
            : "Release the prison locks",
          action: () =>
            set(
              "prisonOpen",
              "The upper cell shortcut and archive stair stay open. Return to the prison columns when ready for the Tower.",
            ),
        },
      ];
    default:
      return [];
  }
}
