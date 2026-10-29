import type { CampaignGame } from "./CampaignGame";
import type { CampaignDoor, CampaignRoom } from "./types";
import type { Platform } from "../game/types";

export const CONSEQUENCE_IDS = ["lamp-store", "lamp-refuge"];
export const STORE_BAR: Platform = { x: 760, y: 490, w: 28, h: 160 };

export function buildConsequences(rooms: Record<string, CampaignRoom>) {
  for (const [id, name, hint] of [
    [
      "lamp-store",
      "The lamp keeper's store",
      "Nima is behind the fallen grille. The release hangs above it: climb the oil shelves. Leaving her here never blocks the main journey.",
    ],
    [
      "lamp-refuge",
      "The lamp refuge",
      "A shelter off the Cypress crown. The upper drive can be repaired after garden irrigation returns. Its lift reaches the warden's loft only after the prison locks open. The ordinary palace routes remain outside.",
    ],
  ]) {
    rooms[id] = {
      ...rooms["cypress-crown"],
      id,
      name,
      mapLabel: name,
      region: "The lamp keeper",
      availableAfter: 17,
      map: { x: id === "lamp-store" ? 0 : 1, y: 0 },
      content: {
        id,
        title: name,
        part: "IV",
        theme: "palace",
        layout: "hall",
        story: "",
        objective: hint,
      },
      theme: "palace",
      hint,
      platforms: [
        { x: 0, y: 650, w: 1280, h: 150 },
        { x: 310, y: 530, w: 180, h: 24, oneWay: true },
        { x: 580, y: 420, w: 540, h: 24, oneWay: true },
      ],
      doors: [
        {
          x: 70,
          y: 650,
          to: id === "lamp-store" ? "root-conduit" : "cypress-crown",
          label:
            id === "lamp-store"
              ? "Return to the Root conduit"
              : "Return to the Cypress crown",
        },
      ],
      fountain: undefined,
      grips: [],
      hazards: [],
      pickups: [],
      enemies: [],
    };
  }
  rooms["root-conduit"].doors.push({
    x: 220,
    y: 650,
    to: "lamp-store",
    label: "Lamp store · a voice behind the grille · optional",
  });
  rooms["cypress-crown"].doors.push({
    x: 900,
    y: 650,
    to: "lamp-refuge",
    label: "Lamp refuge · shelter and service lift · optional",
  });
  rooms["lamp-refuge"].doors.push({
    x: 1150,
    y: 650,
    to: "warden-loft",
    label: "Water lift to the warden's loft",
    gate: "refuge-lift",
  });
  rooms["warden-loft"].doors.push({
    x: 750,
    y: 650,
    to: "lamp-refuge",
    label: "Water lift to the lamp refuge · Cypress crown",
    gate: "refuge-lift",
  });
}

export function consequenceBlock(g: CampaignGame, d: CampaignDoor) {
  if (d.gate !== "refuge-lift") return null;
  if (!g.journey.consequences.liftRepaired)
    return "Broken drive · repair it on the upper shelf of the lamp refuge";
  if (!g.journey.palace.prisonOpen)
    return "Drive repaired · the warden's prison locks still hold the cage";
  return null;
}

export function consequencePlatforms(g: CampaignGame, base: Platform[]) {
  return g.room.id === "lamp-store" && !g.journey.consequences.nimaRescued
    ? [...base, STORE_BAR]
    : base;
}

// Nima is noncombat scenery and a stationary interaction, never a spawned enemy
// or companion. Existing history/rival results supply acknowledgements directly.
export function refugeAccount(g: CampaignGame) {
  const witness = g.journey.history.read.includes("witness");
  const released = g.journey.rival.outcome === "released";
  return [
    witness
      ? '"You found the names behind the cypresses. I have copied them beside our beds. This time the shelter will keep its own account."'
      : '"There are bowls under the twin cypresses, but the court says nobody sheltered there. Stone keeps an odd account."',
    released
      ? '"The hooked soldier lowered his blade. I heard him count us, then say: all accounted for. You let Sahir finish his watch."'
      : g.journey.rival.outcome === "defeated"
        ? '"A broken split crest lies by the cells. The muster roll still lists the people who came home."'
        : '"A hooked soldier still keeps watch below the prison. I wonder whom he is waiting for."',
  ].join(" ");
}
export function consequenceControls(g: CampaignGame) {
  const s = g.journey.consequences;
  const remember = () => {
    g.history = [];
    g.save(false);
  };
  if (g.room.id === "lamp-store")
    return [
      {
        x: 680,
        y: 650,
        label: s.nimaRescued
          ? "Read Nima's chalk arrow"
          : "Speak to Nima behind the grille",
        action: () =>
          g.showStory(
            s.nimaRescued ? "Gone to the lamp refuge" : "Nima, keeper of lamps",
            s.nimaRescued
              ? "A chalk lamp points toward the Cypress crown. 'The grille stayed up. I took the service crawl. Find me where we used to trim the wicks. Nima.'"
              : '"The grille fell when the water stopped. I cannot lift it from here. The release is on the high oil shelf. If you free it, I can crawl to the lamp refuge off the Cypress crown."',
            s.nimaRescued
              ? "The open grille and chalk lamp remain. Nima's refuge is off the Cypress crown, above the court."
              : "Climb the two shelves to reach the release. The west door returns to the conduit; this rescue is optional.",
          ),
      },
      {
        x: 1000,
        y: 420,
        label: s.nimaRescued
          ? "Nima's grille is secured"
          : "Lift the grille for Nima",
        action: () => {
          if (s.nimaRescued) {
            g.notify(
              "The grille stays up. Nima is at the lamp refuge off the Cypress crown.",
            );
            return;
          }
          s.nimaRescued = true;
          g.platforms = g.platforms.filter((p) => p !== STORE_BAR);
          remember();
          g.showStory(
            "A lamp for the way back",
            "The catch holds. Nima slips through the service crawl toward the Cypress crown. 'The lamp refuge. I will leave a light for you.'",
            "Nima will remain at the refuge on later visits. No item or payment is needed; the main journey is unchanged.",
          );
        },
      },
    ];
  if (g.room.id !== "lamp-refuge") return [];
  return [
    {
      x: 450,
      y: 650,
      label: s.nimaRescued
        ? "Speak to Nima at the refuge"
        : "Examine the unlit refuge",
      action: () =>
        g.showStory(
          s.nimaRescued ? "Nima kept a light" : "Wicks waiting to be trimmed",
          s.nimaRescued
            ? `Nima sits beside a lit lamp and two bowls. 'I knew these stairs before the sand. You gave me the road back.' ${refugeAccount(g)}`
            : "Cold lamps hang over rolled bedding. A chalk note reads: 'Nima, lamp keeper. Last seen in the store beside the Root conduit, below the Cypress court.' Nobody answers.",
          s.liftRepaired
            ? "The repaired water drive serves the prison lift. Its cage moves once the warden's locks are open."
            : "The broken lift drive is on the upper shelf. It needs restored garden water, whoever repairs it. The west door always returns to the crown.",
        ),
    },
    {
      x: 1000,
      y: 420,
      label: s.liftRepaired
        ? "Inspect the repaired lift drive"
        : "Seat the lift drive's fallen pin",
      action: () => {
        if (s.liftRepaired) {
          g.showStory(
            "The pin holds",
            "The water wheel turns inside its repaired collar. A lamp marks the cage below.",
            "The lift connects this refuge to the warden's loft once the prison locks are open. The repair stays complete.",
          );
          return;
        }
        if (!g.journey.palace.irrigated) {
          g.showStory(
            "A dry drive",
            "The pin fits, but a slack chain would pull it loose. Water must tension the wheel before it can be seated.",
            "Restore garden irrigation at the far-bank wheel in the Root conduit, then return. This lift is optional.",
          );
          return;
        }
        s.liftRepaired = true;
        remember();
        g.showStory(
          "The service lift remembers",
          "You seat the fallen pin under the turning collar. The chain takes its weight. Far below, a cage answers against a locked prison door.",
          "The repair stays complete. After the warden releases the prison locks, this cage gives a direct return between the loft and the Cypress crown. Nima is not needed to operate it.",
        );
      },
    },
  ];
}
