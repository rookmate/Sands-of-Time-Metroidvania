import { mapNotes } from "./mapNotes";
import type { CampaignGame } from "../campaign/CampaignGame";
import { CAMPAIGN_ROOMS } from "../campaign/world";
import { SECTIONS } from "../campaign/sections";
import { HISTORY_EVIDENCE } from "../campaign/history";
import { WING } from "../campaign/eraWing";
import { ATTUNEMENTS } from "../campaign/rewards";
import {
  chartedDoors,
  chartedRooms,
  mapLandmarks,
  MAP_MARKERS,
  passageState,
} from "../campaign/cartography";

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const regionName = (id: string) =>
  CAMPAIGN_ROOMS[id].region.replace(/ · \d+\/40$/, "");

// This is a view of the campaign graph, not an independently authored route.
// Only visited rooms expose onward doors. Adjacent unknowns remain unnamed.
export function campaignMap(g: CampaignGame, selection = g.room.id) {
  const visible = chartedRooms(g);
  const selected = visible.has(selection) ? selection : g.room.id;
  const visited = g.visited.has(selected);
  const name = (id: string) =>
    g.visited.has(id) ? CAMPAIGN_ROOMS[id].mapLabel : "Unexplored passage";
  const marker = (id: string) => {
    const value = g.journey.mapMarkers[id];
    return value ? MAP_MARKERS[value].symbol : "";
  };
  const landmarkSymbols = (id: string) =>
    g.visited.has(id)
      ? mapLandmarks(g, id)
          .map((s) => s.split(" ")[0])
          .join(" ")
      : "";
  const select = (id: string, extra = "") =>
    `<button type="button" data-map-room="${id}" ${extra}>${g.room.id === id ? "◆ " : ""}${marker(id)} ${escape(name(id))}</button>`;
  const neighbors = new Set<string>();
  if (visited) for (const d of chartedDoors(g, selected)) neighbors.add(d.to);
  for (const id of g.visited)
    if (chartedDoors(g, id).some((d) => d.to === selected)) neighbors.add(id);
  const ids = [...neighbors];
  const left = ids.filter((_, i) => i % 2 === 0);
  const right = ids.filter((_, i) => i % 2 === 1);
  const height = Math.max(240, Math.max(left.length, right.length) * 100);
  const y = (i: number, count: number) => ((i + 0.5) * height) / count;
  const edge = (id: string, x: number, cy: number) => {
    const out = visited
      ? chartedDoors(g, selected).find((d) => d.to === id)
      : undefined;
    const back = g.visited.has(id)
      ? chartedDoors(g, id).find((d) => d.to === selected)
      : undefined;
    const blocked =
      !out ||
      passageState(g, selected, out).reason ||
      !back ||
      passageState(g, id, back).reason;
    return `<path class="atlas-edge ${blocked ? "restricted" : ""}" d="M300 ${height / 2} L${x} ${cy}"/>`;
  };
  const branch = (id: string, i: number, count: number, side: string) =>
    `<div class="atlas-room ${side} ${g.visited.has(id) ? "known" : "unknown"}" style="top:${(y(i, count) / height) * 100}%">${select(id, `aria-label="Select ${escape(name(id))}"`)}<span>${g.visited.has(id) ? `${landmarkSymbols(id)} ${escape(regionName(id))}` : "Not yet charted"}</span></div>`;
  const passages = ids
    .map((id) => {
      const out = visited
        ? chartedDoors(g, selected).filter((d) => d.to === id)
        : [];
      const back = g.visited.has(id)
        ? chartedDoors(g, id).filter((d) => d.to === selected)
        : [];
      const status = (
        source: string,
        d: (typeof out)[number],
        direction: string,
      ) => {
        const s = passageState(g, source, d);
        // Labels often contain the unknown destination's name. Use only gate feedback.
        return `<p class="passage-${s.kind}"><b>${direction}</b> ${escape(s.label)}</p>`;
      };
      return `<li>${select(id)}${out.map((d) => status(selected, d, "→ Out")).join("")}${back.map((d) => status(id, d, "← Back")).join("")}${!out.length ? `<p>→ ${visited ? "No outward doorway" : "Onward route uncharted"}</p>` : ""}${!back.length ? `<p>← ${g.visited.has(id) ? "No return doorway" : "Return uncharted"}</p>` : ""}</li>`;
    })
    .join("");
  const groups = new Map<string, string[]>();
  for (const id of Object.keys(CAMPAIGN_ROOMS)) {
    if (!g.visited.has(id)) continue;
    const region = regionName(id);
    if (!groups.has(region)) groups.set(region, []);
    groups.get(region)!.push(id);
  }
  const index = [...groups]
    .map(
      ([region, rooms]) =>
        `<optgroup label="${escape(region)}">${rooms.map((id) => `<option value="${id}" ${selected === id ? "selected" : ""}>${g.room.id === id ? "◆ " : ""}${marker(id)} ${escape(name(id))}</option>`).join("")}</optgroup>`,
    )
    .join("");
  const markers = Object.entries(g.journey.mapMarkers)
    .map(
      ([id, value]) =>
        `<li>${select(id)} <span>${MAP_MARKERS[value!].label}</span></li>`,
    )
    .join("");
  const era =
    WING[selected] && visited
      ? `<p class="atlas-era">◐ ${g.journey.wing.era === "intact" ? "Intact" : "Ruined"} wing. Passages show this era. Twin mirrors change only this wing; the lower arcade always returns west. Markers refer to the same room in both eras.</p>`
      : "";
  const attunement = g.journey.rewards.attunement;
  const observations = g.journey.history.read
    .map(
      (id) =>
        `<li>${escape(HISTORY_EVIDENCE[id].title)} · ${escape(CAMPAIGN_ROOMS[HISTORY_EVIDENCE[id].room].mapLabel)}</li>`,
    )
    .join("");
  return `<div class="explorer-atlas" data-selected-room="${selected}">
    <div class="atlas-toolbar"><label>Charted rooms <select aria-label="Charted rooms" data-map-index>${!visited ? '<option selected value="">Unexplored passage</option>' : ""}${index}</select></label><button type="button" data-map-room="${g.room.id}">◆ Locate me</button><span>${g.visited.size} rooms charted · ${g.journey.completed.length}/40 milestones</span></div>
    <p class="atlas-location">◆ You are in ${escape(g.room.mapLabel)}${g.journey.completed.length >= 35 ? ". The Hourglass descent has sealed the old palace." : ""}</p>
    <div class="atlas-columns"><section class="atlas-chart" aria-label="Room connections"><p class="atlas-caption">Connected rooms · schematic, not distance or doorway height</p>
    <div class="atlas-drawing" style="--atlas-height:${height}px;--compact-height:${Math.max(180, Math.max(left.length, right.length) * 100)}px"><svg viewBox="0 0 600 ${height}" preserveAspectRatio="none" aria-hidden="true">${left.map((id, i) => edge(id, 95, y(i, left.length))).join("")}${right.map((id, i) => edge(id, 505, y(i, right.length))).join("")}</svg>
    ${left.map((id, i) => branch(id, i, left.length, "left")).join("")}${right.map((id, i) => branch(id, i, right.length, "right")).join("")}
    <div class="atlas-room selected ${selected === g.room.id ? "here" : ""}" style="top:50%"><strong>${selected === g.room.id ? "◆ " : ""}${escape(name(selected))}</strong><span>Selected room${selected === g.room.id ? " · you are here" : ""}</span><span>${landmarkSymbols(selected)}</span></div></div>
    <p class="atlas-key">◆ Your position · ◈ Fountain · ⚑ ? ◇ Your markers<br>Solid: open both ways · Dashed: restricted or uncharted direction</p>
    </section><section class="atlas-detail" aria-label="Selected room"><h3>${escape(name(selected))}</h3>
    ${
      visited
        ? `<p>${escape(regionName(selected))}</p><ul class="atlas-landmarks">${mapLandmarks(
            g,
            selected,
          )
            .map((s) => `<li>${escape(s)}</li>`)
            .join(
              "",
            )}</ul>${era}<fieldset class="atlas-marker-tools"><legend>Your marker</legend>${Object.entries(
            MAP_MARKERS,
          )
            .map(
              ([value, data]) =>
                `<button type="button" data-map-marker="${value}" aria-pressed="${g.journey.mapMarkers[selected] === value}">${data.symbol} ${data.label}</button>`,
            )
            .join(
              "",
            )}<button type="button" data-map-marker="remove" ${g.journey.mapMarkers[selected] ? "" : "disabled"}>Remove marker</button></fieldset>`
        : "<p>Explore this passage to chart its landmarks and onward doors.</p>"
    }
    <h4>Passages from selected room</h4><ul class="atlas-passages">${passages}</ul></section></div>
    <details class="atlas-notes"><summary>Marked places${markers ? ` · ${Object.keys(g.journey.mapMarkers).length}` : " · none"}</summary><ul>${markers}</ul></details>
    <details class="atlas-notes"><summary>Journey notes · ${g.journey.completed.length}/40 story milestones</summary>${mapNotes(
      g,
    )
      .map((note) => `<p>${escape(note)}</p>`)
      .join(
        "",
      )}${attunement ? `<p>${ATTUNEMENTS[attunement].name}: ${ATTUNEMENTS[attunement].effect}</p>` : ""}${observations ? `<ul>${observations}</ul>` : ""}<ol>${SECTIONS.filter(
      (s) => g.visited.has(s.id),
    )
      .map(
        (s) =>
          `<li>${escape(s.title)} · ${g.journey.completed.includes(s.id) ? "Complete" : "Explored"}</li>`,
      )
      .join("")}</ol></details>
    <p class="atlas-help">Choose a charted room or a connected passage. Tab moves between controls; Enter selects. Markers save at your existing fountain checkpoint. M or Esc returns to play.</p>
  </div>`;
}
