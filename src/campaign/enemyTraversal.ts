import type { CampaignGame } from "./CampaignGame";
import type { CampaignRoom } from "./types";
import type { Platform } from "../game/types";
import { spawnEnemies } from "../game/enemies";

export const TRAVERSAL_IDS = ["ram-run", "scarab-crossing"];
export const TRAVERSAL_HEART = "scarab-crossing-heart";
export const RAM_WALL: Platform = { x: 900, y: 0, w: 48, h: 650 };
export const SCARAB_PLATE = { x: 615, y: 420, w: 45 };
export const CROSSING_STONES: Platform[] = [
  { x: 760, y: 420, w: 230, h: 24, oneWay: true },
  { x: 1080, y: 420, w: 170, h: 24, oneWay: true },
];
export function buildEnemyTraversal(rooms: Record<string, CampaignRoom>) {
  const hints = [
    "A hollow sand ram paws, sights you, then charges straight. Bait it toward the pale cracked wall and jump clear after it sights you. Swords cannot break this wall. E at the recall bell returns the creature without sand rewards. Farah waits outside the service pens.",
    "The scarab's weight raises the crossing stones only while it stands on the striped plate. Freeze (F) it on the plate, then cross the raised stones and secure the far latch (E). Misses land on a safe floor. Recall at the west bell if the creature dies or strays; the fountain refills sand. No time seal is needed.",
  ];
  TRAVERSAL_IDS.forEach((id, i) => {
    const name = i === 0 ? "The ram's run" : "Scarab counterweights";
    rooms[id] = {
      ...rooms.zoo,
      id,
      name,
      mapLabel: name,
      region: "Animal service pens",
      width: i ? 1600 : 1280,
      height: 800,
      map: { x: i + 1, y: 0 },
      availableAfter: 11,
      content: {
        id,
        title: name,
        part: "III",
        theme: "garden",
        layout: "hall",
        story: "",
        objective: hints[i],
      },
      hint: hints[i],
      theme: "garden",
      grips: [],
      hazards: [],
      platforms: [
        { x: 0, y: 650, w: i ? 1600 : 1280, h: 150 },
        ...(i
          ? [
              { x: 330, y: 530, w: 150, h: 24, oneWay: true },
              { x: 500, y: 420, w: 220, h: 24, oneWay: true },
              { x: 1300, y: 420, w: 300, h: 24, oneWay: true },
            ]
          : []),
      ],
      enemies: i
        ? [{ kind: "scarab", x: 660, y: 420, patrol: [530, 720] }]
        : [
            {
              kind: "brute",
              behavior: "ram",
              x: 540,
              y: 650,
              patrol: [420, 890],
            },
          ],
      fountain: { x: 190, y: 650 },
      pickups: i
        ? [{ id: TRAVERSAL_HEART, kind: "heart", x: 1530, y: 375 }]
        : [],
      doors: [],
    };
  });
  rooms.zoo.doors.push({
    x: 360,
    y: 650,
    to: "ram-run",
    label: "Animal service pens · optional",
  });
  rooms["ram-run"].doors = [
    { x: 70, y: 650, to: "zoo", label: "Return to the zoo" },
    {
      x: 1190,
      y: 650,
      to: "scarab-crossing",
      label: "Scarab counterweights",
      gate: "ram-wall",
    },
  ];
  rooms["scarab-crossing"].doors = [
    { x: 70, y: 650, to: "ram-run", label: "Return through the ram's run" },
  ];
}
export function scarabOnPlate(g: CampaignGame) {
  return (
    g.room.id === "scarab-crossing" &&
    g.enemies.some(
      (e) =>
        !e.dead &&
        e.kind === "scarab" &&
        Math.abs(e.y + e.h - SCARAB_PLATE.y) < 2 &&
        e.x + e.w / 2 >= SCARAB_PLATE.x &&
        e.x + e.w / 2 <= SCARAB_PLATE.x + SCARAB_PLATE.w,
    )
  );
}
export function traversalPlatforms(g: CampaignGame, base: Platform[]) {
  if (g.room.id === "ram-run" && !g.journey.traversal.broken)
    return [...base, RAM_WALL];
  if (
    g.room.id === "scarab-crossing" &&
    (g.journey.traversal.latched || scarabOnPlate(g))
  )
    return [...base, ...CROSSING_STONES];
  return base;
}
export function stepEnemyTraversal(g: CampaignGame) {
  if (g.room.id !== "ram-run" || g.journey.traversal.broken) return;
  if (
    !g.enemies.some(
      (e) =>
        !e.dead &&
        e.behavior === "ram" &&
        e.chargeImpact === 1 &&
        Math.abs(e.x + e.w - RAM_WALL.x) < 2,
    )
  )
    return;
  g.journey.traversal.broken = true;
  g.history = [];
  g.platforms = g.platforms.filter((p) => p !== RAM_WALL);
  g.burst(924, 530, "#e4c88f", 35);
  g.save(false);
  g.notify("The ram shatters the weakened wall. This passage stays open.");
}
export function traversalControls(g: CampaignGame) {
  if (!TRAVERSAL_IDS.includes(g.room.id)) return [];
  return [
    {
      x: 300,
      y: 650,
      label: "Recall bell · reset hollow creature (no sand reward)",
      action: () => {
        g.enemies = spawnEnemies(g.room.enemies, g.tier, false, false);
        g.history = [];
        g.ghosts = [];
        g.slowTime = g.freezeTime = 0;
        g.notify(
          "The hollow creature reforms at its mark. Earned openings remain; rest at the fountain for sand.",
        );
      },
    },
    ...(g.room.id === "scarab-crossing"
      ? [
          {
            x: 1390,
            y: 420,
            label: g.journey.traversal.latched
              ? "Crossing latch secured"
              : "Secure crossing stones permanently",
            action: () => {
              if (
                !g.player.grounded ||
                (!scarabOnPlate(g) && !g.journey.traversal.latched)
              ) {
                g.notify(
                  "The scarab must hold the plate while you secure the far latch.",
                );
                return;
              }
              g.journey.traversal.latched = true;
              g.history = [];
              g.save(false);
              g.notify(
                "Crossing stones latched. The creature can leave its plate; the way stays open.",
              );
            },
          },
        ]
      : []),
  ];
}
