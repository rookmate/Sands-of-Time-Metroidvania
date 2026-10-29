import type { CampaignGame } from "./CampaignGame";
import type { CampaignDoor } from "./types";
import { CAMPAIGN_ROOMS } from "./world";
import { WING } from "./eraWing";
import { ECHO_CHAMBERS } from "./echoRooms";

export const MAP_MARKERS = {
  return: { symbol: "⚑", label: "Return here" },
  puzzle: { symbol: "?", label: "Unfinished puzzle" },
  treasure: { symbol: "◇", label: "Search for treasure" },
} as const;
export type MapMarker = keyof typeof MAP_MARKERS;

// A hidden facing is not a visible doorway. Never disclose its destination
// until the facing opens, even if that room was reached from elsewhere.
export function chartedDoors(g: CampaignGame, source: string) {
  return CAMPAIGN_ROOMS[source].doors.filter(
    (d) => d.gate !== "history-sill" || g.journey.history.opened,
  );
}
export function chartedRooms(g: CampaignGame) {
  const visible = new Set(g.visited);
  for (const id of g.visited)
    for (const d of chartedDoors(g, id)) visible.add(d.to);
  return visible;
}
export function passageState(g: CampaignGame, source: string, d: CampaignDoor) {
  const reason = g.doorBlock(d, source);
  return {
    reason,
    kind: reason ? "blocked" : d.milestone === "hourglass" ? "descent" : "open",
    label:
      reason ??
      (d.milestone === "hourglass"
        ? "Point of no return · descent seals the old palace"
        : "Open"),
  };
}
export function mapLandmarks(g: CampaignGame, id: string) {
  const r = CAMPAIGN_ROOMS[id];
  const landmarks: string[] = [];
  if (r.fountain) landmarks.push("◈ Save fountain");
  if (WING[id]) landmarks.push(`◐ Twin mirror · ${g.journey.wing.era} era`);
  if (ECHO_CHAMBERS[id])
    landmarks.push(
      g.journey.echoes.solved.includes(id)
        ? "≋ Echo latch secured"
        : "≋ Echo plate and latch",
    );
  const layout = r.content.layout;
  if (["ladder", "tower", "elevator", "swing", "library"].includes(layout))
    landmarks.push(
      layout === "swing"
        ? "⌁ Ropes and bars"
        : layout === "elevator"
          ? "↕ Lift"
          : layout === "library"
            ? "▤ Library shelves"
            : "↟ Vertical climb",
    );
  if (r.content.puzzle?.kind === "mirror") landmarks.push("☼ Mirror receiver");
  if (r.content.puzzle?.kind === "crank") landmarks.push("↻ Turning mechanism");
  if (r.pickups.some((p) => p.kind !== "sand" && !g.collected.has(p.id)))
    landmarks.push("◇ Unclaimed discovery");
  return landmarks;
}
