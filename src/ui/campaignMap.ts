import { MASTERY_IDS } from "../campaign/mastery";
import { RIVAL_IDS } from "../campaign/rival";
import { TRAVERSAL_IDS } from "../campaign/enemyTraversal";
import { HISTORY_EVIDENCE } from "../campaign/history";
import { WING_IDS, WING_HEART } from "../campaign/eraWing";
import { CORE_ECHO_IDS } from "../campaign/echoRooms";
import { palaceMap } from "./palaceMap";
import { COOP_ROOMS, cooperationStatus } from "../campaign/cooperation";
import type { CampaignGame } from "../campaign/CampaignGame";
import { CAMPAIGN_ROOMS } from "../campaign/world";
import { SECTIONS } from "../campaign/sections";
import { BATHS_IDS } from "../campaign/baths";
import { ATTUNEMENTS, VESSEL_ID } from "../campaign/rewards";
const REGION_IDS = [
  ...WING_IDS,
  ...BATHS_IDS,
  ...COOP_ROOMS,
  "echo-gallery",
  "keeper-cistern",
  ...CORE_ECHO_IDS,
];

export function campaignMap(game: CampaignGame) {
  const visible = new Set(game.visited);
  for (const id of game.visited)
    CAMPAIGN_ROOMS[id].doors.forEach((d) => visible.add(d.to));
  const point = (id: string) => ({
    x: CAMPAIGN_ROOMS[id].map.x * 170 + 80,
    y: CAMPAIGN_ROOMS[id].map.y * 85 - 40,
  });
  const drawn = new Set<string>();
  const edges = REGION_IDS.flatMap((id) =>
    CAMPAIGN_ROOMS[id].doors.map((d) => {
      const pair = [id, d.to].sort().join(":");
      if (
        !REGION_IDS.includes(d.to) ||
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
  const nodes = REGION_IDS.filter((id) => visible.has(id))
    .map((id) => {
      const room = CAMPAIGN_ROOMS[id],
        p = point(id),
        visited = game.visited.has(id);
      return `<g class="map-node ${visited ? "visited" : "unknown"} ${game.room.id === id ? "current" : ""}"><rect x="${p.x - 23}" y="${p.y - 13}" width="46" height="26"/><text x="${p.x}" y="${p.y + 5}" class="map-symbol">${game.room.id === id ? "◆" : visited ? "·" : "?"}</text><text x="${p.x}" y="${p.y + 32}" class="map-label">${room.mapLabel}</text></g>`;
    })
    .join("");
  const b = game.journey.baths;
  const regional = REGION_IDS.some((id) => game.visited.has(id))
    ? `<p class="regional-state">Baths and Waterworks · ${b.drained ? "Drained" : b.intake ? "Intake open; turn sluice wheel" : "Flooded; intake closed"} · ${b.shortcut ? "Rotunda grate open" : "Grate barred from within"}</p><svg class="regional-map" viewBox="0 0 900 440" role="img" aria-label="Baths connections. Dashed paths are gated. Room positions show connections, not doorway height.">${edges}${nodes}</svg>`
    : "";
  const rewards = game.journey.rewards;
  const discoveries = regional
    ? `<p class="regional-state">Optional discoveries · ${rewards.attunement ? ATTUNEMENTS[rewards.attunement].name + ": " + ATTUNEMENTS[rewards.attunement].effect : "Time seal unchosen"} · ${game.collected.has(VESSEL_ID) ? "Sand capacity 8" : "Sand vessel unfound"} · ${rewards.inscription ? "Keepers' names remembered" : "Inscription unread"}</p>`
    : "";
  const wing = WING_IDS.some((id) => game.visited.has(id))
    ? `<p class="regional-state">Twin mirror wing · ${game.journey.wing.era}. E at mirrors changes this wing only. R rewinds movement; C/X records or cancels echoes. Switching clears tapes. ${game.journey.wing.discovered ? "Unsent dedication read" : "Unsent gift undiscovered"} · ${game.collected.has(WING_HEART) ? "Heart found" : "Heart unfound"}. Lower arcade floor always returns west.</p>`
    : "";
  const investigation =
    game.journey.history.read.length || game.journey.history.opened
      ? `<p class="regional-state">Palace history · ${game.journey.history.opened ? "Cypress facing open" : "The court's account is in doubt"}. Observations to reread: ${game.journey.history.read.map((id) => `${HISTORY_EVIDENCE[id].title} (${CAMPAIGN_ROOMS[HISTORY_EVIDENCE[id].room].mapLabel})`).join("; ") || "none"}. These are observations, not keys; no complete collection is needed.</p>`
      : "";
  const pens = TRAVERSAL_IDS.some((id) => visible.has(id))
    ? `<p class="regional-state">Animal service pens · Zoo side entrance. ${game.journey.traversal.broken ? "Ram wall broken" : "Bait the ram into weakened masonry"} · ${game.journey.traversal.latched ? "Scarab stones latched" : "Freeze the scarab on its striped plate to cross"}. Recall bells restore hollow creatures without sand rewards. Safe lower floors return to fountains.</p>`
    : "";
  const rival =
    RIVAL_IDS.some((id) => visible.has(id)) || game.journey.rival.named
      ? `<p class="regional-state">Sahir, the split crest · ${game.journey.rival.outcome ?? `${game.journey.rival.bouts}/2 drills complete`}. Practice court off Cypress court → gallery off Archive stair → last muster beside Flooded cells. ${game.journey.rival.oath ? "His lesson: the drill ends when all come home. Blue standard releases him; gold accepts the last rematch." : "His weapon rack and muster roll explain whom he is waiting for."} Duels are optional; unfinished fights reset on exit or Retry.</p>`
      : "";
  const mastery = MASTERY_IDS.some((id) => visible.has(id))
    ? `<p class="regional-state">Movement chambers · optional entrance at Cypress court. Returning step → Hands above the court → Patient crossing. ${game.journey.mastery.solved.length}/3 seals secured. E at round stones retries, E at secured seals returns to the start. Catch mats return you without damage; R can recover before landing. Practice sand stays in the chambers. Local retries never move your main fountain checkpoint.</p>`
    : "";
  return `${mastery}${rival}${pens}${investigation}${wing}${palaceMap(game)}${regional}${regional ? `<p class="regional-state">${cooperationStatus(game)}</p>` : ""}${discoveries}${game.visited.has("echo-step") ? `<p class="regional-state">Echo chambers · ${CORE_ECHO_IDS.filter((id) => game.journey.echoes.solved.includes(id)).length}/3 latches secured. C records, C replays or replaces, X cancels. Tapes clear on room exit, Retry and reload; secured gates stay open.</p>` : ""}<p>Story milestones · ${game.journey.completed.length}/40</p><ol class="chapter-route">${SECTIONS.map((s, i) => `<li class="${game.room.id === s.id ? "current" : ""}"><span>${String(i + 1).padStart(2, "0")}</span><span>${game.visited.has(s.id) ? s.title : "Unexplored"}</span><span>${game.journey.completed.includes(s.id) ? "Complete" : s.id === game.quest.room ? "Next objective" : ""}</span></li>`).join("")}</ol>`;
}
