import { HISTORY_ROOM } from "../campaign/history";
import { PALACE_IDS } from "../campaign/palace";
import { CAMPAIGN_ROOMS } from "../campaign/world";
import type { CampaignGame } from "../campaign/CampaignGame";

const IDS = [
  "upper-baths",
  ...PALACE_IDS,
  HISTORY_ROOM,
  "reunion",
  "learning",
  "orrery",
  "learning-yard",
  "ramparts",
  "prison",
  "tower-lift",
  "hourglass",
];
export function palaceMap(g: CampaignGame) {
  if (!PALACE_IDS.some((id) => g.visited.has(id))) return "";
  const visible = new Set(g.visited);
  for (const id of g.visited)
    for (const d of CAMPAIGN_ROOMS[id].doors)
      if (d.gate !== "history-sill" || g.journey.history.opened)
        visible.add(d.to);
  const point = (id: string) => ({
    x: CAMPAIGN_ROOMS[id].map.x * 165 + 80,
    y: CAMPAIGN_ROOMS[id].map.y * 85 + 30,
  });
  const drawn = new Set<string>();
  const edges = IDS.flatMap((id) =>
    CAMPAIGN_ROOMS[id].doors.map((d) => {
      const key = [id, d.to].sort().join(":");
      if (
        !IDS.includes(d.to) ||
        !visible.has(id) ||
        !visible.has(d.to) ||
        drawn.has(key)
      )
        return "";
      drawn.add(key);
      const a = point(id),
        b = point(d.to),
        reason = g.doorBlock(d);
      const reverse = CAMPAIGN_ROOMS[d.to].doors.find((v) => v.to === id)!;
      const back = g.doorBlock(reverse);
      return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="map-connection ${reason || back ? "sealed" : ""}"><title>${CAMPAIGN_ROOMS[id].mapLabel} to ${CAMPAIGN_ROOMS[d.to].mapLabel}: ${reason ?? "open"}. Return: ${back ?? "open"}.</title></path>`;
    }),
  ).join("");
  const nodes = IDS.filter((id) => visible.has(id))
    .map((id) => {
      const r = CAMPAIGN_ROOMS[id],
        p = point(id);
      return `<g class="map-node ${g.visited.has(id) ? "visited" : "unknown"} ${g.room.id === id ? "current" : ""}"><rect x="${p.x - 23}" y="${p.y - 13}" width="46" height="26"/><text x="${p.x}" y="${p.y + 5}" class="map-symbol">${g.room.id === id ? "◆" : g.visited.has(id) ? "·" : "?"}</text><text x="${p.x}" y="${p.y + 30}" class="map-label">${r.mapLabel}</text></g>`;
    })
    .join("");
  const s = g.journey.palace;
  return `<p class="regional-state">Palace connections · ${s.irrigated ? "Irrigation restored: canopy, archive and cell steps raised" : "Garden irrigation dry"} · ${s.sky ? "Roof arch open" : "Roof lens unpinned"} · ${s.prisonOpen ? "Prison shortcuts open" : "Prison release barred"}</p><svg class="regional-map palace-map" viewBox="0 0 1000 590" role="img" aria-label="Gardens, Learning and Prison connections. Dashed paths have a gate in at least one direction. Positions show connected landmarks, not distance or doorway height.">${edges}${nodes}</svg><p class="regional-state">Baths aqueduct → cypress court → Hall terraces. Roof arch joins crown and observatory. Warden's stair joins Prison and archives. Story milestones remain separate. Point of no return: descending from the Hourglass seals the old palace.</p>`;
}
