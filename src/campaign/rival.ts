import type { CampaignGame } from "./CampaignGame";
import type { CampaignRoom } from "./types";
import { spawnEnemies } from "../game/enemies";

export const RIVAL_IDS = ["crest-court", "crest-gallery", "crest-rest"];
export type RivalOutcome = "released" | "defeated";
export interface RivalState {
  bouts: number;
  named: boolean;
  oath: boolean;
  outcome: RivalOutcome | null;
}
export const freshRival = (): RivalState => ({
  bouts: 0,
  named: false,
  oath: false,
  outcome: null,
});
export const RIVAL_SITES = [
  {
    parent: "garden-court",
    x: 990,
    name: "Split-crest practice court",
    after: 17,
    theme: "garden" as const,
  },
  {
    parent: "archive-stair",
    x: 900,
    name: "Drillmaster's gallery",
    after: 28,
    theme: "tower" as const,
  },
  {
    parent: "prison-cells",
    x: 740,
    name: "The last muster",
    after: 32,
    theme: "corrupt" as const,
  },
];
export function buildRival(rooms: Record<string, CampaignRoom>) {
  RIVAL_SITES.forEach((site, i) => {
    const id = RIVAL_IDS[i];
    const hint =
      "Sahir of the split crest waits at the gold standard. E accepts a duel. His raised glaive marks a committed thrust; jump clear, then strike during recovery. On high ground his white crest warns of a high sand cast; shelter below. Fountains and the west exit remain usable. Farah waits outside. Unfinished duels reset on exit or Retry.";
    rooms[id] = {
      ...rooms[site.parent],
      id,
      name: site.name,
      mapLabel: site.name,
      region: "Sahir's last drill",
      theme: site.theme,
      availableAfter: site.after,
      width: 1280,
      height: 800,
      map: { x: i + 1, y: 0 },
      content: {
        id,
        title: site.name,
        part: "VII",
        theme: site.theme,
        layout: "hall",
        story: "",
        objective: hint,
      },
      hint,
      grips: [],
      hazards: [],
      pickups: [],
      enemies: [],
      fountain: { x: 190, y: 650 },
      platforms: [
        { x: 0, y: 650, w: 1280, h: 150 },
        ...(i
          ? [
              { x: 380, y: 590, w: 150, h: 20, oneWay: true },
              { x: 560, y: 530, w: i === 1 ? 500 : 170, h: 20, oneWay: true },
              ...(i === 2
                ? [{ x: 830, y: 530, w: 250, h: 20, oneWay: true }]
                : []),
            ]
          : []),
      ],
      doors: [
        {
          x: 70,
          y: 650,
          to: site.parent,
          label: "Leave the drill unfinished · return to palace",
        },
      ],
    };
    rooms[site.parent].doors.push({
      x: site.x,
      y: 650,
      to: id,
      label: `${site.name} · split crest · optional`,
    });
  });
}

// Only permanent results enter the campaign save. A live duel is a room-local
// ordinary enemy, so room exit, Retry and Continue discard partial damage.
export function rivalControls(g: CampaignGame) {
  const stage = RIVAL_IDS.indexOf(g.room.id);
  if (stage < 0) return [];
  const s = g.journey.rival;
  const active = () => g.enemies.some((e) => e.kind === "rival" && !e.dead);
  return [
    {
      x: 310,
      y: 650,
      label:
        stage === 0
          ? "Read the split-crest weapon rack"
          : "Read Sahir's muster roll",
      action: () => {
        if (active()) {
          g.notify("Step out of the duel to read. The west exit stays open.");
          return;
        }
        s.named = true;
        if (stage > 0) s.oath = true;
        g.history = [];
        g.save(false);
        g.showStory(
          stage === 0 ? "Sahir, palace drillmaster" : "A return is a victory",
          stage === 0
            ? "One hook on every practice blade. One notch in every crest. 'Sahir, drillmaster. Count the living before you count your victories.' His empty rack points toward the archive gallery."
            : "The roll lists recruits, not kills. Adil, Rana, Yusuf: RETURNED. Sahir held the prison muster door while they fled the sand. Below it, his lesson: 'The drill ends when all come home.'",
          stage === 0
            ? "The same split crest marks a gallery off the Archive stair, then a muster room beside the flooded cells."
            : "At the last muster, speak his lesson at the lowered blue standard to release him. The gold standard offers a final fight instead. Both choices end his vigil.",
        );
      },
    },
    {
      x: 460,
      y: 650,
      label: s.outcome
        ? `Sahir · ${s.outcome}`
        : stage < s.bouts
          ? "This duel is finished"
          : active()
            ? "Duel in progress · west exit remains open"
            : stage === 2
              ? "Gold standard · choose final rematch"
              : "Gold standard · accept Sahir's duel",
      action: () => {
        if (s.outcome || stage < s.bouts || active()) return;
        if (stage !== s.bouts) {
          g.notify(
            s.bouts === 0
              ? "The split crest points back to the practice court in the Cypress court. Sahir's first drill waits there."
              : "Sahir's next drill waits in the gallery off the Archive stair.",
          );
          return;
        }
        const enemy = spawnEnemies(
          [
            {
              kind: "rival",
              x: stage ? 900 : 820,
              y: stage ? 530 : 650,
              patrol: stage ? [560, 1080] : [540, 1110],
            },
          ],
          g.tier,
          false,
          false,
        )[0];
        enemy.health = enemy.maxHealth = stage === 0 ? 8 : 10;
        enemy.phase = stage;
        enemy.cooldown = 1.2;
        g.enemies = [enemy];
        g.projectiles = [];
        g.history = [];
        g.notify(
          stage
            ? "White crest: high cast. Drop below it. Raised hook: thrust. Jump clear, then punish his long recovery."
            : "'Return your blade.' The raised hook sights a thrust. Jump clear, then strike during recovery.",
        );
      },
    },
    ...(stage === 2
      ? [
          {
            x: 600,
            y: 650,
            label: s.outcome
              ? "The vigil has ended"
              : "Blue standard · release Sahir with his lesson",
            action: () => {
              if (active()) {
                g.notify(
                  "Leave and return to abandon the rematch before choosing release.",
                );
                return;
              }
              if (s.bouts !== 2) {
                g.notify(
                  "His unfinished drills wait in the court and archive gallery.",
                );
                return;
              }
              if (!s.oath) {
                g.notify(
                  "Read the muster roll beside the entrance. What did he count as victory?",
                );
                return;
              }
              resolveRival(g, "released");
            },
          },
        ]
      : []),
  ];
}
export function rivalDefeated(g: CampaignGame) {
  const stage = RIVAL_IDS.indexOf(g.room.id);
  const s = g.journey.rival;
  if (stage !== s.bouts || s.outcome) return;
  g.projectiles = [];
  g.history = [];
  if (stage < 2) {
    s.bouts++;
    g.save(false);
    g.showStory(
      "Sahir yields the ground",
      stage === 0
        ? "The hooked glaive touches stone. 'Again. From higher ground.' His split crest scatters toward the Archive stair."
        : "'One still absent.' He looks toward the prison, and the sand carries him away.",
      stage === 0
        ? "This duel stays complete. The next split crest waits in the gallery off the Archive stair."
        : "This duel stays complete. The last muster waits beside the flooded prison cells.",
    );
  } else {
    resolveRival(g, "defeated");
  }
}
function resolveRival(g: CampaignGame, outcome: RivalOutcome) {
  const s = g.journey.rival;
  if (s.outcome || s.bouts !== 2) return;
  s.outcome = outcome;
  g.projectiles = [];
  g.history = [];
  g.save(false);
  g.showStory(
    outcome === "released" ? "Dismissed, Sahir" : "The last drill ends",
    outcome === "released"
      ? "You name the men who escaped. Sahir lowers the hooked blade. 'All accounted for.' The crest falls quiet. He keeps his place, but no longer bars a road."
      : "The glaive breaks across your sword. For a breath he stands straight. 'A clean return,' he says. The sand takes him; the broken crest remains.",
    outcome === "released"
      ? "Sahir rests here. His roll of recruits can still be read."
      : "His broken glaive remains here. The roll remembers the men he taught to come home.",
  );
}
