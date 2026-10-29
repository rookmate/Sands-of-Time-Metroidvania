import type { CampaignGame } from "./CampaignGame";
import type { CampaignRoom } from "./types";

export const SUN_VAULT = "sun-vault";
export const SUN_HEART = "sun-vault-heart";

// A branch of the canonical graph, never a forty-first story milestone.
export function buildOpening(rooms: Record<string, CampaignRoom>) {
  rooms.siege.doors.push({
    x: 620,
    y: 535,
    to: SUN_VAULT,
    label: "Sun vault · optional life upgrade",
    gate: "sun-seal",
  });
  rooms.siege.hint =
    "Palace entrance right. A sun-marked vault waits above the first terrace.";
  rooms.treasury.hazards.push({
    x: 1510,
    y: 585,
    w: 38,
    h: 65,
    kind: "blade",
    period: 3,
  });
  rooms[SUN_VAULT] = {
    id: SUN_VAULT,
    name: "The sun vault",
    mapLabel: "Sun vault",
    chapter: "I",
    region: "Maharajah's palace",
    theme: "throne",
    width: 1280,
    height: 800,
    map: { x: 0, y: 0 },
    availableAfter: 1,
    content: {
      id: SUN_VAULT,
      title: "The sun vault",
      part: "I",
      layout: "hall",
      theme: "throne",
      objective:
        "Climb the sunlit shelves for a life upgrade, or return to the siege terrace.",
      story: "",
    },
    platforms: [
      { x: 0, y: 650, w: 1280, h: 150 },
      { x: 300, y: 530, w: 180, h: 24, oneWay: true },
      { x: 580, y: 420, w: 180, h: 24, oneWay: true },
      { x: 840, y: 310, w: 380, h: 24, oneWay: true },
    ],
    grips: [],
    doors: [{ x: 100, y: 650, to: "siege", label: "Sun-marked siege terrace" }],
    fountain: { x: 215, y: 650 },
    pickups: [{ id: SUN_HEART, kind: "heart", x: 1000, y: 265 }],
    enemies: [],
    hazards: [],
    hint: "The Dagger fits the sun seal. The upper shelves hold a life upgrade; the floor catches a missed jump.",
  };
}

// Only a fresh journey teaches controls. Continue keeps its checkpoint and has
// no tutorial replay, including saves made before this opening was authored.
// Retry keeps this session's learned actions; nothing enters movement rewind.
export class Opening {
  private enabled = false;
  private moved = false;
  private jumped = false;
  private struck = false;
  private rewound = 0;
  reset(fresh: boolean) {
    this.enabled = fresh;
    this.moved = this.jumped = this.struck = false;
    this.rewound = 0;
  }
  observe(g: CampaignGame, dt: number) {
    if (!this.enabled) return;
    if (g.room.id === "siege") {
      if (g.player.x > 340) this.moved = true;
      if (g.player.grounded && (g.player.y < 500 || g.player.x > 1000))
        this.jumped = true;
    }
    if (g.room.id === "release" && g.player.attack > 0) this.struck = true;
    if (g.rewinding) this.rewound += dt;
  }
  cue(g: CampaignGame): string | null {
    if (!this.enabled || g.journey.completed.length > 3) return null;
    const x = g.player.x;
    if (g.room.id === "siege" && !g.hasDagger) {
      if (!this.moved) return "{left} / {right} · Move toward the palace.";
      if (!this.jumped && x > 360 && x < 1000)
        return "{jump} · Hold to jump higher. Try the terrace, or cross the broken floor.";
      if (x > 1000)
        return "{interact} · Enter the palace at the right-hand arch. Fountains save and heal.";
    }
    if (g.room.id === "treasury") {
      if (!g.hasDagger)
        return "Hold {jump} to climb the terraces toward the shining Dagger.";
      if (g.player.health < g.player.maxHealth && this.rewound < 0.35)
        return "Hold {rewind} · Undo your movement and lost health. Sand stays spent.";
      if (x > 1120 && x < 1660 && this.rewound < 0.35)
        return "Blade ahead · Jump across. Hold {rewind} to undo a mistake; release {rewind} to move again.";
      return "Your choice: continue right, or return left to the sun-marked vault above the siege fountain.";
    }
    if (g.room.id === "release" && !this.struck)
      return "{attack} · Press again to chain strikes. Keep a blade's reach from the guards.";
    if (g.room.id === SUN_VAULT && !g.collected.has(SUN_HEART))
      return "Hold {jump} for the high shelves. Release, then jump again. A missed jump lands on the safe floor.";
    return null;
  }
}
