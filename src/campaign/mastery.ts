import { distance } from "../game/physics";
import type { CampaignGame } from "./CampaignGame";
import type { CampaignRoom } from "./types";
import type { Platform, Vec } from "../game/types";

export const MASTERY_IDS = ["mastery-wall", "mastery-rope", "mastery-dash"];
export const MASTERY_HEART = "mastery-dash-heart";
export const MASTERY_GOALS: Record<string, Vec> = {
  "mastery-wall": { x: 290, y: 380 },
  "mastery-rope": { x: 1090, y: 310 },
  "mastery-dash": { x: 1370, y: 310 },
};
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});
export function buildMastery(rooms: Record<string, CampaignRoom>) {
  const names = [
    "The returning step",
    "Hands above the court",
    "The patient crossing",
  ];
  const hints = [
    "Hold Jump toward the striped wall. Release and press Jump again against it to kick left onto the high ledge. Jump climbs a caught ledge. E secures the upper seal. The round stone retries; the west door leaves.",
    "Jump from the shelf to the bright rope knot; catch it while falling. Release Jump, then Jump + Right to transfer to the bar and far seal. Down lets go. R rewinds a miss; the striped catch mat retries without harm.",
    "Climb the solid ledge, then catch the rope. Jump right and Time Dash (Shift) near the jump's top. R can recover a fall before the catch mat retries. E at the round stone restores practice sand, which stays here. No timer.",
  ];
  MASTERY_IDS.forEach((id, i) => {
    const width = i === 2 ? 1600 : 1280;
    rooms[id] = {
      ...rooms["garden-court"],
      id,
      name: names[i],
      mapLabel: names[i],
      region: "Movement chambers",
      theme: "palace",
      width,
      height: 800,
      map: { x: i, y: 0 },
      availableAfter: 17,
      content: {
        id,
        title: names[i],
        part: "IV",
        theme: "palace",
        layout: "hall",
        story: "",
        objective: hints[i],
      },
      hint: hints[i],
      fountain: undefined,
      enemies: [],
      hazards: [],
      platforms: [
        p(0, 730, width, 70),
        p(0, 650, i ? 400 : 450),
        ...(i === 0
          ? [p(520, 280, 80, 450), p(210, 380, 220, 48)]
          : i === 1
            ? [p(300, 530, 150), p(1000, 310, 280)]
            : [p(300, 530, 150), p(540, 420, 130, 310), p(1270, 310, 330)]),
      ],
      grips:
        i === 0
          ? []
          : i === 1
            ? [
                {
                  id: "practice-rope",
                  kind: "rope",
                  x: 540,
                  y: 370,
                  length: 180,
                },
                { id: "practice-bar", kind: "bar", x: 780, y: 340 },
              ]
            : [
                {
                  id: "practice-long-rope",
                  kind: "rope",
                  x: 820,
                  y: 300,
                  length: 160,
                },
              ],
      pickups:
        i === 2 ? [{ id: MASTERY_HEART, kind: "heart", x: 1500, y: 265 }] : [],
      doors: [
        {
          x: 70,
          y: 650,
          to: i ? MASTERY_IDS[i - 1] : "garden-court",
          label: i ? "Previous movement chamber" : "Return to Cypress court",
        },
        ...(i < 2
          ? [
              {
                x: MASTERY_GOALS[id].x + (i === 0 ? 60 : 100),
                y: MASTERY_GOALS[id].y,
                to: MASTERY_IDS[i + 1],
                label: `Next: ${names[i + 1]}`,
                gate: id as "mastery-wall" | "mastery-rope",
              },
            ]
          : []),
      ],
    };
  });
  rooms["garden-court"].doors.push({
    x: 660,
    y: 650,
    to: MASTERY_IDS[0],
    label: "Movement chambers · optional practice",
  });
}

// Sand is borrowed for this local practice session, never exported into the journey.
// The main fountain checkpoint is deliberately untouched by local retries or seals.
export class Mastery {
  private journeySand: number | null = null;
  constructor(private g: CampaignGame) {}
  enter(id: string) {
    if (!MASTERY_IDS.includes(id)) {
      this.leave();
      return;
    }
    this.journeySand ??= this.g.player.sand;
    this.g.player.sand = this.g.player.maxSand;
  }
  leave() {
    if (this.journeySand === null) return;
    this.g.player.sand = this.journeySand;
    this.journeySand = null;
  }
  retry() {
    const g = this.g;
    if (!MASTERY_IDS.includes(g.room.id)) return;
    g.enterRoom(g.room.id, undefined, { x: 300, y: 594 });
    Object.assign(g.player, {
      grounded: true,
      wallTime: 0,
      coyote: 0,
      jumpBuffer: 0,
      wallLock: 0,
      gripCooldown: 0,
      dashCooldown: 0,
    });
    g.notify(
      "Back on the launch mat. Practice sand restored; your journey checkpoint is unchanged.",
    );
  }
  step() {
    const g = this.g;
    if (
      MASTERY_IDS.includes(g.room.id) &&
      g.player.grounded &&
      g.player.y + g.player.h >= 729
    )
      this.retry();
  }
  controls() {
    const g = this.g,
      goal = MASTERY_GOALS[g.room.id];
    if (!goal) return [];
    const id = g.room.id;
    const solved = g.journey.mastery.solved.includes(g.room.id);
    return [
      {
        x: 310,
        y: 650,
        label: "Retry chamber · restore practice sand",
        action: () => this.retry(),
      },
      {
        ...goal,
        label: solved
          ? "Seal secured · return to launch mat"
          : "Secure movement seal",
        action: () => {
          if (
            g.room.id !== id ||
            !g.player.grounded ||
            distance(
              { x: g.player.x + 15, y: g.player.y + g.player.h },
              goal,
            ) >= 45
          )
            return;
          if (g.journey.mastery.solved.includes(g.room.id)) {
            this.retry();
            return;
          }
          g.journey.mastery.solved.push(g.room.id);
          g.history = [];
          g.save(false);
          g.showStory(
            g.room.name,
            "A worn handprint joins yours on the stone. Those who practised here learned to come home as carefully as they learned to leap.",
            g.room.id === "mastery-dash"
              ? "All three seals secured. A life memory waits on this landing. E at the seal returns to the launch mat; the west doors lead home."
              : "Seal saved. The next chamber opens beside this landing. E at this seal returns to the launch mat. Your main fountain remains your checkpoint.",
          );
        },
      },
    ];
  }
}
