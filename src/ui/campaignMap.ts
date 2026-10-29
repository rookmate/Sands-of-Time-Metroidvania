import type { CampaignGame } from "../campaign/CampaignGame";
import { CAMPAIGN_ROOMS } from "../campaign/world";
import { SECTIONS } from "../campaign/sections";
import { BATHS_IDS } from "../campaign/baths";

export function campaignMap(game: CampaignGame) {
  const visible = new Set(game.visited);
  for (const id of game.visited)
    CAMPAIGN_ROOMS[id].doors.forEach((d) => visible.add(d.to));
  const point = (id: string) => ({
    x: CAMPAIGN_ROOMS[id].map.x * 170 + 80,
    y: CAMPAIGN_ROOMS[id].map.y * 85 - 40,
  });
  const drawn = new Set<string>();
  const edges = BATHS_IDS.flatMap((id) =>
    CAMPAIGN_ROOMS[id].doors.map((d) => {
      const pair = [id, d.to].sort().join(":");
      if (
        !BATHS_IDS.includes(d.to) ||
        drawn.has(pair) ||
        !visible.has(id) ||
        !visible.has(d.to)
      )
        return "";
      drawn.add(pair);
      const a = point(id),
        b = point(d.to),
        reason = game.doorBlock(d);
      return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" class="map-connection ${reason ? "sealed" : ""}"><title>${d.label}${reason ? `: ${reason}` : ""}</title></path>`;
    }),
  ).join("");
  const nodes = BATHS_IDS.filter((id) => visible.has(id))
    .map((id) => {
      const room = CAMPAIGN_ROOMS[id],
        p = point(id),
        visited = game.visited.has(id);
      return `<g class="map-node ${visited ? "visited" : "unknown"} ${game.room.id === id ? "current" : ""}"><rect x="${p.x - 23}" y="${p.y - 13}" width="46" height="26"/><text x="${p.x}" y="${p.y + 5}" class="map-symbol">${game.room.id === id ? "◆" : visited ? "·" : "?"}</text><text x="${p.x}" y="${p.y + 32}" class="map-label">${room.mapLabel}</text></g>`;
    })
    .join("");
  const b = game.journey.baths;
  const regional = BATHS_IDS.some((id) => game.visited.has(id))
    ? `<p class="regional-state">Baths and Waterworks · ${b.drained ? "Drained" : b.intake ? "Intake open; turn sluice wheel" : "Flooded; intake closed"} · ${b.shortcut ? "Rotunda grate open" : "Grate barred from within"}</p><svg class="regional-map" viewBox="0 0 520 270" role="img" aria-label="Baths connections. Dashed paths are gated. Room positions show connections, not doorway height.">${edges}${nodes}</svg>`
    : "";
  return `${regional}<p>Story milestones · ${game.journey.completed.length}/40</p><ol class="chapter-route">${SECTIONS.map((s, i) => `<li class="${game.room.id === s.id ? "current" : ""}"><span>${String(i + 1).padStart(2, "0")}</span><span>${game.visited.has(s.id) ? s.title : "Unexplored"}</span><span>${game.journey.completed.includes(s.id) ? "Complete" : s.id === game.quest.room ? "Next objective" : ""}</span></li>`).join("")}</ol>`;
}
