import type { CampaignGame } from "./CampaignGame";
import type { CampaignDoor, CampaignRoom } from "./types";
import type { Platform } from "../game/types";

export const FINALE_IDS = ["crown-baths", "crown-hall", "crown-warden"];
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});

// Physical upper galleries of familiar places, before the Hourglass descent.
// Latches use the existing saved per-room mechanism state; no second campaign.
export function buildFinale(rooms: Record<string, CampaignRoom>) {
  const names = [
    "Baths rotunda · the dry crown",
    "Hall of Learning · clerestory",
    "Warden's loft · the high chain",
  ];
  const hints = [
    "The Tower's inner stair has fallen. Follow the service crown above the Baths, Hall and prison to the Hourglass. The dry overflow shelves climb to the wheel; a lower floor catches misses. A repaired refuge lift also reaches the wheel.",
    "The Hall's roof shutter fell across the service stair. Turn the west mirror toward the high receiver, then climb the familiar shelves and pin the light at the east receiver. The lower floor and west ladder let you retry.",
    "The prison winch still holds. Climb the counterweight shelves, catch the hanging bar with Space, then jump to the east landing. The floor below catches misses. The Hourglass is ahead; finish exploration before its descent.",
  ];
  FINALE_IDS.forEach((id, i) => {
    rooms[id] = {
      ...rooms["baths-main"],
      id,
      name: names[i],
      mapLabel: names[i],
      region: "The remembered service crown",
      chapter: "VIII",
      availableAfter: 34,
      theme: i === 0 ? "water" : i === 1 ? "palace" : "corrupt",
      map: { x: i, y: 10 },
      width: 1280,
      height: 800,
      content: {
        id,
        title: names[i],
        part: "VIII",
        layout: "hall",
        theme: "palace",
        objective: hints[i],
        story: "",
      },
      hint: hints[i],
      platforms: [],
      grips: [],
      doors: [],
      hazards: [],
      enemies: [],
      pickups: [],
      fountain: { x: 190, y: 650 },
    };
  });
  rooms["crown-baths"].platforms = [
    p(0, 650, 1280, 150),
    p(330, 530, 180),
    p(590, 420, 180),
    p(990, 420, 290),
  ];
  rooms["crown-baths"].grips = [
    { id: "overflow-ladder", kind: "ladder", x: 190, y: 420, length: 230 },
  ];
  // The west ladder returns to a safe inspection shelf, not the far-side wheel.
  rooms["crown-baths"].platforms.push(p(120, 420, 160));
  rooms["crown-baths"].doors = [
    { x: 70, y: 650, to: "tower-lift", label: "Return to the Tower elevator" },
    {
      x: 1200,
      y: 420,
      to: "crown-hall",
      label: "Hall clerestory",
      gate: "crown-wheel",
    },
  ];
  rooms["crown-hall"].platforms = [
    p(0, 650, 1280, 150),
    p(370, 530, 180),
    p(620, 420, 180),
    p(950, 420, 330),
  ];
  rooms["crown-hall"].grips = [
    { id: "clerestory-ladder", kind: "ladder", x: 190, y: 420, length: 230 },
  ];
  rooms["crown-hall"].platforms.push(p(120, 420, 160));
  rooms["crown-hall"].doors = [
    { x: 70, y: 650, to: "crown-baths", label: "Baths overflow crown" },
    {
      x: 1200,
      y: 420,
      to: "crown-warden",
      label: "Warden's high chain",
      gate: "crown-light",
    },
  ];
  rooms["crown-warden"].platforms = [
    p(0, 650, 1280, 150),
    p(320, 530, 180),
    p(570, 410, 190),
    p(1030, 410, 250),
  ];
  rooms["crown-warden"].grips = [
    { id: "high-chain-bar", kind: "bar", x: 880, y: 310 },
  ];
  rooms["crown-warden"].doors = [
    { x: 70, y: 650, to: "crown-hall", label: "Hall clerestory" },
    {
      x: 1200,
      y: 410,
      to: "hourglass",
      label: "The Hourglass · exploration remains open until the descent",
    },
  ];
  rooms["tower-lift"].doors.find((d) => d.milestone === "tower-lift")!.to =
    FINALE_IDS[0];
  rooms.hourglass.doors[0].to = "crown-warden";
}

export function finaleBlock(g: CampaignGame, d: CampaignDoor) {
  if (d.gate === "crown-wheel" && !g.journey.puzzles["crown-baths"]?.activated)
    return "Turn the overflow wheel on the far upper bank";
  if (d.gate === "crown-light" && !g.journey.puzzles["crown-hall"]?.activated)
    return "Aim the west mirror high, then pin the east receiver";
  return null;
}
export function finalePlatforms(g: CampaignGame, base: Platform[]) {
  return g.room.id === "crown-warden" && g.journey.rival.outcome === "released"
    ? [...base, p(750, 410, 290)]
    : base;
}
export function finaleControls(g: CampaignGame) {
  if (!FINALE_IDS.includes(g.room.id)) return [];
  const s = g.puzzles.state;
  const secure = (message: string) => {
    s.activated = true;
    g.history = [];
    g.save(false);
    g.notify(message);
  };
  if (g.room.id === "crown-baths")
    return [
      {
        x: 320,
        y: 650,
        label: g.journey.consequences.liftRepaired
          ? "Ride the repaired refuge drive to the overflow wheel"
          : "Inspect the silent refuge drive",
        action: () => {
          if (g.journey.consequences.liftRepaired) {
            // An authored lift between two clear landings; room entry clears tapes and powers.
            g.enterRoom(g.room.id, undefined, { x: 1010, y: 364 });
            g.farah.atMirror({ x: 1025, y: 420 });
          } else
            g.notify(
              "This drive shares the refuge lift's broken coupling. The dry overflow shelves still climb east; jump then Dash across the last gap. R recovers a miss, or use the floor below.",
            );
        },
      },
      {
        x: 1100,
        y: 420,
        label: s.activated
          ? "Overflow wheel secured"
          : "Turn the dry overflow wheel",
        action: () =>
          secure(
            "The dry Baths overflow opens the Hall service grille. Farah: We have been beneath this wheel before.",
          ),
      },
      {
        x: 570,
        y: 650,
        label: "Read the lamp niche",
        action: () =>
          g.notify(
            g.journey.consequences.nimaRescued
              ? "Nima's lamp burns beside a chalk arrow: UP THE DRY SHELVES. She has brought the last keepers into the refuge."
              : "An old keeper's arrow reads: DRY OVERFLOW ABOVE. The shelf route is safe even with the lift silent.",
          ),
      },
    ];
  if (g.room.id === "crown-hall")
    return [
      {
        x: 330,
        y: 650,
        label: s.activated
          ? "Roof light pinned"
          : `Turn west mirror · ${s.values[0] ? "high receiver" : "lower drain"}`,
        action: () => {
          if (s.activated) return;
          s.values[0] = 1 - (s.values[0] ?? 0);
          g.history = [];
          g.save(false);
          g.notify(
            s.values[0]
              ? "The beam reaches the high east receiver. Climb and pin it there."
              : "The beam falls into the lower drain. The blocked stair needs the high receiver.",
          );
        },
      },
      {
        x: 1080,
        y: 420,
        label: s.activated
          ? "East receiver secured"
          : "Pin the east roof receiver",
        action: () => {
          if (s.values[0] !== 1) {
            g.notify(
              "No light reaches this receiver. Aim the west mirror upward; the lower floor leads back.",
            );
            return;
          }
          secure(
            "The roof shutter rises. The Hall's service stair is open to the prison chain.",
          );
        },
      },
      {
        x: 620,
        y: 650,
        label: "Read the clerestory dedication",
        action: () =>
          g.notify(
            g.journey.history.read.includes("witness")
              ? "You recognize the workers' names from the buried witness room. Here they signed their work openly. Above the signatures: LIGHT RISES, WATER FALLS."
              : "Workers signed this roof mechanism beside its diagram: LIGHT RISES, WATER FALLS. The roof receiver is above the drain.",
          ),
      },
    ];
  return [
    {
      x: 600,
      y: 650,
      label: "Read the split-crest standard",
      action: () =>
        g.notify(
          g.journey.rival.outcome === "released"
            ? "Sahir's last watch is over. His released counterweight holds a level crossing where the chain used to swing. Farah: Someone left us a way home."
            : g.journey.rival.outcome === "defeated"
              ? "Sahir's split crest rests against the winch. His last rematch is finished. The hanging bar still crosses the chain."
              : "A split-crest standard marks the old watch. The winch holds the hanging bar over a safe lower landing. Climb the shelves, hold Space to catch, then jump east.",
        ),
    },
  ];
}
