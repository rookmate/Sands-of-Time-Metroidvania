import { buildDepths } from "./depthsRooms";
import { buildConsequences } from "./consequences";
import { buildMastery } from "./mastery";
import { buildRival } from "./rival";
import { buildEnemyTraversal } from "./enemyTraversal";
import { buildHistory } from "./history";
import { buildEraWing } from "./eraWing";
import { buildEchoRooms } from "./echoRooms";
import { buildPalace } from "./palace";
import type { EnemySpawn, Pickup } from "../game/types";
import { geometry } from "./layouts";
import type { CampaignRoom } from "./types";
import { buildRewardRooms } from "./rewards";
import { buildCooperation } from "./cooperation";
import { buildBaths } from "./baths";
import { SECTIONS } from "./sections";

export const CAMPAIGN_ROOMS: Record<string, CampaignRoom> = Object.fromEntries(
  SECTIONS.map((section, index) => {
    const shape = geometry(section.layout);
    const previous = SECTIONS[index - 1],
      next = SECTIONS[index + 1];
    const enemies: EnemySpawn[] = [];
    if (
      !section.puzzle &&
      index > 1 &&
      !["tower", "descent", "ladder", "library"].includes(section.layout)
    ) {
      enemies.push(
        section.layout === "swing"
          ? { kind: "bird", x: 1180, y: 430, patrol: [420, 1770] }
          : {
              kind: index > 16 ? "brute" : "guard",
              x: 1790,
              y: 650,
              patrol: [1710, 1970],
            },
      );
    }
    const pickups: Pickup[] = [];
    if (section.item)
      pickups.push({
        id: `${section.id}-${section.item}`,
        kind: section.item,
        x:
          section.item === "dagger"
            ? 960
            : section.layout === "library"
              ? 1050
              : 1720,
        y:
          section.item === "dagger"
            ? 305
            : section.layout === "library"
              ? 255
              : 605,
      });
    if ([3, 13, 16, 24, 28, 36].includes(index)) {
      pickups.push({
        id: `${section.id}-heart`,
        kind: "heart",
        x: shape.exit.x - 180,
        y: shape.exit.y - 45,
      });
    }
    if (index > 0 && index !== 39 && !(index >= 35 && index <= 37))
      pickups.push({
        id: `${section.id}-sand`,
        kind: "sand",
        x: Math.max(140, shape.exit.x - 300),
        y: shape.exit.y - 45,
      });
    const fountain = {
      x:
        shape.entry.x < shape.width / 2
          ? 250
          : Math.min(shape.width - 40, shape.entry.x + 100),
      y: shape.entry.y,
    };
    const room: CampaignRoom = {
      content: section,
      availableAfter: index,
      id: section.id,
      name: section.title,
      mapLabel: section.title,
      chapter: section.part,
      region: `${section.part === "I" || section.part === "X" ? "India and Azad" : "Palace of Azad"} · ${index + 1}/40`,
      theme: section.theme,
      width: shape.width,
      height: shape.height,
      map: { x: index % 5, y: Math.floor(index / 5) + 1 },
      platforms: shape.platforms,
      grips: shape.grips,
      doors: [
        ...(previous
          ? [{ ...shape.entry, to: previous.id, label: "Return passage" }]
          : []),
        ...(next
          ? [
              {
                ...shape.exit,
                to: next.id,
                label: next.title,
                milestone: section.id,
              },
            ]
          : []),
      ],
      fountain,
      pickups,
      enemies,
      hazards:
        section.id === "defenses" || section.id === "trapped-yard"
          ? [{ x: 1050, y: 585, w: 38, h: 65, kind: "blade", period: 2 }]
          : [],
      hint: section.objective,
    };
    return [section.id, room];
  }),
);

// This is the campaign graph. Story anchors remain in SECTIONS.
buildBaths(CAMPAIGN_ROOMS);

buildRewardRooms(CAMPAIGN_ROOMS);

buildCooperation(CAMPAIGN_ROOMS);

buildPalace(CAMPAIGN_ROOMS);

buildEchoRooms(CAMPAIGN_ROOMS);

buildEraWing(CAMPAIGN_ROOMS);

buildHistory(CAMPAIGN_ROOMS);

buildEnemyTraversal(CAMPAIGN_ROOMS);

buildRival(CAMPAIGN_ROOMS);

buildMastery(CAMPAIGN_ROOMS);

buildConsequences(CAMPAIGN_ROOMS);

buildDepths(CAMPAIGN_ROOMS);
