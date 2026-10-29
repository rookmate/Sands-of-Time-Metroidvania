import type { CampaignGame } from "./CampaignGame";
import type { CampaignDoor, CampaignRoom } from "./types";
import type { Platform, Vec } from "../game/types";
import { overlap } from "../game/physics";

export type WingEra = "intact" | "ruined";
export const WING_IDS = ["mirror-reception", "fallen-arcade", "mirror-vault"];
export const WING_HEART = "mirror-vault-heart";
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});
// Mirrors stand on floors common to both authored moments. Geometry is local;
// the canonical room identity, doors, collectibles and story never change.
export const WING: Record<
  string,
  {
    mirrors: Vec[];
    intact: Platform[];
    ruined: Platform[];
  }
> = {
  "mirror-reception": {
    mirrors: [
      { x: 260, y: 650 },
      { x: 1000, y: 650 },
    ],
    intact: [p(600, 0, 70, 650)],
    ruined: [p(570, 600, 150)],
  },
  "fallen-arcade": {
    mirrors: [
      { x: 260, y: 650 },
      { x: 950, y: 310 },
    ],
    intact: [],
    ruined: [
      p(300, 530, 200),
      p(540, 420, 200),
      p(770, 310, 160),
      p(1030, 0, 60, 310),
    ],
  },
  "mirror-vault": {
    mirrors: [{ x: 260, y: 650 }],
    intact: [],
    ruined: [p(600, 0, 70, 650)],
  },
};
export function wingPlatforms(g: CampaignGame, base: Platform[]) {
  return WING[g.room.id]
    ? [...base, ...WING[g.room.id][g.journey.wing.era]]
    : base;
}
export function buildEraWing(rooms: Record<string, CampaignRoom>) {
  const names = ["Mirror reception", "Fallen arcade", "The unsent gift"];
  const hints = [
    "{interact} at a twin mirror changes only this wing. The intact reception wall seals the east passage; its rubble leaves a way through. Mirrors cost no sand. {rewind} rewinds you, {echo} records an echo; neither changes the wing.",
    "The fallen columns form a stair only in ruin. Climb to the upper mirror, then restore the intact arch. Missed jumps land on the safe lower floor. You can always return west below.",
    "The intact moment opens the bell corridor. Record a run from the striped plate to the bell, ring {interact}, then replay while you hold the plate. Cross and secure the far latch. Mirrors erase tapes; earned latches and gifts remain.",
  ];
  WING_IDS.forEach((id, i) => {
    rooms[id] = {
      ...rooms["echo-step"],
      id,
      name: names[i],
      mapLabel: names[i],
      region: "Wing between two moments",
      map: { x: i + 1, y: 5 },
      content: {
        id,
        title: names[i],
        part: "IV",
        theme: "palace",
        layout: "hall",
        story: "",
        objective: hints[i],
      },
      theme: "palace",
      hint: hints[i],
      platforms: [p(0, 650, 1280, 150), ...(i === 1 ? [p(900, 310, 380)] : [])],
      fountain: { x: 170, y: 650 },
      doors: [],
      pickups:
        i === 2 ? [{ id: WING_HEART, kind: "heart", x: 1150, y: 605 }] : [],
    };
  });
  rooms["echo-gallery"].doors.push({
    x: 950,
    y: 650,
    to: WING_IDS[0],
    label: "Twin mirrors · optional wing",
  });
  rooms[WING_IDS[0]].doors = [
    { x: 70, y: 650, to: "echo-gallery", label: "Exit to echo gallery" },
    {
      x: 1190,
      y: 650,
      to: WING_IDS[1],
      label: "Fallen arcade",
      gate: "wing-wall",
    },
  ];
  rooms[WING_IDS[1]].doors = [
    { x: 70, y: 650, to: WING_IDS[0], label: "Reception · lower return" },
    {
      x: 1190,
      y: 310,
      to: WING_IDS[2],
      label: "The unsent gift",
      gate: "wing-arch",
    },
  ];
  rooms[WING_IDS[2]].doors = [
    { x: 70, y: 650, to: WING_IDS[1], label: "Arcade upper return" },
  ];
}
export function wingControls(g: CampaignGame) {
  const wing = WING[g.room.id];
  if (!wing) return [];
  return [
    ...wing.mirrors.map((mirror) => ({
      ...mirror,
      label: `Twin mirror · ${g.journey.wing.era} → ${g.journey.wing.era === "intact" ? "ruined" : "intact"} · {interact}`,
      action: () => {
        if (
          !g.hasDagger ||
          !g.player.grounded ||
          g.player.grip ||
          g.player.ledge
        ) {
          g.notify("Stand beside the twin mirror with the Dagger.");
          return;
        }
        const era: WingEra =
          g.journey.wing.era === "intact" ? "ruined" : "intact";
        const placement = {
          x: mirror.x - g.player.w / 2,
          y: mirror.y - g.player.h,
          w: g.player.w,
          h: g.player.h,
        };
        if (
          [...g.room.platforms, ...wing[era]].some((s) => overlap(placement, s))
        )
          return;
        g.echoes.clear();
        g.journey.wing.era = era;
        g.platforms = g.echoes.platforms(wingPlatforms(g, g.room.platforms));
        g.history = [];
        g.ghosts = [];
        g.slowTime = g.freezeTime = 0;
        g.rewinding = false;
        Object.assign(g.player, placement, {
          vx: 0,
          vy: 0,
          dashTime: 0,
          wall: 0,
          grip: null,
          ledge: null,
        });
        g.farah.atMirror(mirror);
        // Save the shared landing with its era, never an old, now-solid floor.
        g.checkpoint = { room: g.room.id, x: placement.x, y: placement.y };
        g.input.clear();
        g.save(false);
        g.notify(
          `Wing: ${era}. Echo and rewind memories cleared. No sand spent.`,
        );
      },
    })),
    ...(g.room.id === "mirror-vault"
      ? [
          {
            x: 1210,
            y: 650,
            label: g.journey.wing.discovered
              ? "Read the unsent dedication again"
              : "Read the unsent dedication",
            action: () => {
              g.journey.wing.discovered = true;
              g.save(false);
              g.showStory(
                "The unsent gift",
                "A stone pomegranate rests beside a child's empty sandals. The dedication reads: For my daughter, when the court lets me go home. In the fallen moment, the wall behind it has collapsed. The carving is still here.",
                "The palace kept a mason's gift longer than it kept his king's name. The heart beside it increases maximum health by one, up to twelve. Return through the arcade; its lower floor leads west to the gallery.",
              );
            },
          },
        ]
      : []),
  ];
}

export function wingDoorBlock(
  g: CampaignGame,
  door: CampaignDoor,
): string | null {
  if (door.gate === "wing-wall" && g.journey.wing.era === "intact")
    return "Intact wall seals this route; use a twin mirror";
  if (door.gate === "wing-arch" && g.journey.wing.era === "ruined")
    return "Fallen arch seals this route; restore it at the upper mirror";
  return null;
}
