import type { CampaignGame } from "../campaign/CampaignGame";
import { CAMPAIGN_ROOMS } from "../campaign/world";
import { cooperationStatus, COOP_ROOMS } from "../campaign/cooperation";
import { WING_IDS } from "../campaign/eraWing";
import { MASTERY_IDS } from "../campaign/mastery";
import { TRAVERSAL_IDS } from "../campaign/enemyTraversal";
import { RIVAL_IDS } from "../campaign/rival";
import { DEPTHS_IDS } from "../campaign/depthsRooms";
import { PALACE_IDS } from "../campaign/palace";

// Remember learned regional conditions without printing undiscovered itineraries.
export function mapNotes(g: CampaignGame): string[] {
  const seen = (ids: string[]) => ids.some((id) => g.visited.has(id));
  const s = g.journey;
  const notes: string[] = [];
  if (
    [...g.visited].some(
      (id) => CAMPAIGN_ROOMS[id].region === "Baths and Waterworks",
    )
  )
    notes.push(
      `Baths · ${s.baths.drained ? "Drained" : s.baths.intake ? "Intake open; turn the sluice wheel" : "Flooded; intake closed"} · ${s.baths.shortcut ? "Rotunda grate open" : "Grate barred from within"}`,
    );
  if (seen(COOP_ROOMS)) notes.push(cooperationStatus(g));
  if (seen(PALACE_IDS))
    notes.push(
      `Palace · ${s.palace.irrigated ? "Irrigation restored; canopy, archive and cell steps raised" : "Garden irrigation dry"} · ${s.palace.sky ? "Roof arch open" : "Roof lens unpinned"} · ${s.palace.prisonOpen ? "Prison shortcuts open" : "Prison release barred"}`,
    );
  if (seen(WING_IDS))
    notes.push(
      `Twin mirror wing · ${s.wing.era}. Mirrors change this wing only; switching clears tapes.`,
    );
  if (seen(TRAVERSAL_IDS))
    notes.push(
      `Service pens · ${s.traversal.broken ? "Ram wall broken" : "Weakened ram wall intact"} · ${s.traversal.latched ? "Scarab stones latched" : "Scarab stones unlatched"}`,
    );
  if (seen(RIVAL_IDS))
    notes.push(
      `Sahir · ${s.rival.outcome ?? `${s.rival.bouts}/2 drills complete`}`,
    );
  if (seen(MASTERY_IDS))
    notes.push(
      `Movement chambers · ${s.mastery.solved.length}/3 seals secured. Local retries keep your fountain checkpoint.`,
    );
  if (seen(["lamp-store", "lamp-refuge"]))
    notes.push(
      `Lamp keeper · ${s.consequences.nimaRescued ? "Nima rescued" : "Nima awaits rescue"} · ${s.consequences.liftRepaired ? (s.palace.prisonOpen ? "Repaired lift open" : "Lift drive repaired; waiting for the warden's locks") : "Refuge lift drive broken"}`,
    );
  if (seen(DEPTHS_IDS))
    notes.push(
      `Reservoir depths · ${s.depths.diverted ? "Clean bypass open" : "Filter race foul"} · ${s.depths.seals}/2 reliefs secured · ${s.depths.resolved ? "Keeper resting; reciprocal rotunda lift open" : "Keeper holds the spring"}`,
    );
  return notes;
}
