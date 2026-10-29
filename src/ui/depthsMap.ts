import type { CampaignGame } from "../campaign/CampaignGame";
import { DEPTHS_IDS } from "../campaign/depthsRooms";
import { CAMPAIGN_ROOMS } from "../campaign/world";

export function depthsMap(g: CampaignGame, visible: Set<string>) {
  if (!visible.has("depths-well") && !visible.has("depths-spring")) return "";
  const s = g.journey.depths;
  const routes = DEPTHS_IDS.filter((id) => visible.has(id))
    .map((id) => {
      const r = CAMPAIGN_ROOMS[id];
      const doors = r.doors
        .map(
          (d) =>
            `${d.label}${g.doorBlock(d) ? ` [${g.doorBlock(d)}]` : " [open]"}`,
        )
        .join("; ");
      return `<li>${g.visited.has(id) ? r.name : "Unexplored passage"}: ${doors}</li>`;
    })
    .join("");
  return `<p class="regional-state">Beneath the reservoir · optional. Reservoir hatch → sounding well ↓ flood lock → filter race ↓ keeper → spring → Baths rotunda lift. ${s.diverted ? "Clean bypass open" : "Filter race foul"}. ${s.seals}/2 reliefs secured. ${s.resolved ? "Keeper resting; reciprocal rotunda lift open" : "Keeper holds the spring; lift opens below"}. West ladder returns from the well. Farah waits above. C records only at the striped lock; tapes clear on exit. Secured reliefs survive Retry.</p><ul>${routes}</ul>`;
}
