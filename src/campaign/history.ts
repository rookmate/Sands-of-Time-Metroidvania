import type { CampaignGame } from "./CampaignGame";
import type { CampaignRoom } from "./types";

export const HISTORY_ROOM = "witness-room";
export const HISTORY_HEART = "witness-room-heart";
// These are rereadable observations, not keys. The sill can be understood and
// opened without collecting any of them, in any regional exploration order.
export const HISTORY_EVIDENCE = {
  decree: {
    room: "garden-court",
    x: 210,
    y: 650,
    title: "The court's account",
    text: 'A polished tablet reads: "In the year of the kiln fire, the gatekeeper abandoned his post. The royal garden remained sealed. No household found shelter here." A smaller line has been chiseled away.',
    detail:
      "The tablet is newer than the court. Across the floor, a broad, worn sill lies under an arch between two carved cypresses. Why wear a threshold in a sealed wall?",
  },
  bowls: {
    room: "cypress-crown",
    x: 500,
    y: 650,
    title: "Bowls in the gardener's ledger",
    text: 'Behind a loose tile: "Ash on the roofs again. Forty bowls sent below the twin cypresses. The gatekeeper says to leave the little door unbarred. Charge them to my wages, not the court."',
    detail:
      "The twin trees are carved around the blind arch on the Cypress court's lower floor. This account describes people being fed there, not an empty garden.",
  },
  plan: {
    room: "archive-stair",
    x: 520,
    y: 650,
    title: "A plan older than the tablet",
    text: 'An ink plan shows a small room behind the Cypress court. Its opening is drawn between two cypress reliefs. A builder wrote: "Freight sill. Weight on the worn heel lowers the facing. No key. Keep clear for bread carts."',
    detail:
      "The court's blind arch was a working entrance. Stand in its worn sill, hold Down and press E to put your weight on the heel stone. A royal seal was never its lock.",
  },
  sill: {
    room: "garden-court",
    x: 780,
    y: 650,
    title: "The worn heel stone",
    text: "The twin cypress reliefs frame a blank wall. Cart grooves run through its sill; soot survives inside the joints. In the middle, a heel-shaped hollow moves a little under your foot.",
    detail:
      "This was a doorway before someone faced it with stone. Stand on the sill, hold Down and press E to bear down on the hollow. The mechanism needs weight, not the Dagger.",
  },
  witness: {
    room: HISTORY_ROOM,
    x: 740,
    y: 650,
    title: "The room the court denied",
    text: 'Soot ends at the inner lintel. Bread shelves line the walls; children\'s heights are scratched beside the door. Beneath them: "We came through the fire. The gatekeeper opened. The gardener fed us. We leave our names so neither can be called a coward."',
    detail:
      "The later tablet blamed the people who had opened a royal garden to their neighbors. This room kept their answer. A life remembered waits on the far shelf. The court and the main journey remain outside.",
  },
} as const;
export type HistoryEvidence = keyof typeof HISTORY_EVIDENCE;
export const HISTORY_IDS = Object.keys(HISTORY_EVIDENCE) as HistoryEvidence[];

export function buildHistory(rooms: Record<string, CampaignRoom>) {
  const hint =
    "Bread shelves, soot and names remain behind the false facing. Return through the cypress sill whenever you wish.";
  rooms[HISTORY_ROOM] = {
    ...rooms["garden-court"],
    id: HISTORY_ROOM,
    name: "The witnesses' room",
    mapLabel: "Witnesses' room",
    map: { x: 0, y: 1 },
    content: {
      id: HISTORY_ROOM,
      title: "The witnesses' room",
      part: "IV",
      theme: "palace",
      layout: "hall",
      story: "",
      objective: hint,
    },
    theme: "palace",
    hint,
    platforms: [{ x: 0, y: 650, w: 1280, h: 150 }],
    fountain: { x: 360, y: 650 },
    doors: [
      {
        x: 100,
        y: 650,
        to: "garden-court",
        label: "Cypress court · worn sill",
      },
    ],
    pickups: [{ id: HISTORY_HEART, kind: "heart", x: 1050, y: 605 }],
  };
  rooms["garden-court"].doors.push({
    x: 780,
    y: 650,
    to: HISTORY_ROOM,
    label: "Enter behind the cypress facing",
    gate: "history-sill",
  });
}
export function historyControls(g: CampaignGame) {
  return HISTORY_IDS.filter(
    (id) => HISTORY_EVIDENCE[id].room === g.room.id,
  ).map((id) => {
    const e = HISTORY_EVIDENCE[id];
    return {
      x: id === "sill" && g.journey.history.opened ? 630 : e.x,
      y: e.y,
      label: `${g.journey.history.read.includes(id) ? "Reread" : "Examine"} · ${e.title}`,
      action: () => {
        if (
          id === "sill" &&
          !g.journey.history.opened &&
          g.input.down("down") &&
          g.player.grounded &&
          !g.player.grip &&
          !g.player.ledge
        ) {
          g.journey.history.opened = true;
          g.history = [];
          g.save(false);
          g.showStory(
            "The facing lowers",
            "Under your heel, a counterweight wakes. The facing sinks into the sill. Soot and the smell of old bread lie behind it.",
            "The opening stays clear. Press E again to enter; you can return to the court at any time.",
          );
          return;
        }
        if (!g.journey.history.read.includes(id))
          g.journey.history.read.push(id);
        g.history = [];
        g.save(false);
        g.showStory(
          e.title,
          id === "sill" && g.journey.history.opened
            ? "The facing lies below the floor. Its worn heel stone and the cart grooves remain. Soot inside the open joints reaches into the witnesses' room."
            : e.text,
          id === "sill" && g.journey.history.opened
            ? "Weight on the freight sill opened this passage. It stays open; the carved cypresses still mark the way."
            : e.detail,
        );
      },
    };
  });
}
