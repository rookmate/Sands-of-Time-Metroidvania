import type { CampaignGame } from "./CampaignGame";
import { BATHS_IDS } from "./baths";
import { DEPTHS_IDS } from "./depthsRooms";
import { WING_IDS } from "./eraWing";
import { ECHO_CHAMBERS } from "./echoRooms";
import { FINALE_IDS } from "./finale";
import type { MusicScene, MusicTheme } from "../game/score";

// Presentation reads canonical campaign/encounter state. No saved audio flags.
export function campaignMusic(g: CampaignGame): MusicScene {
  const id = g.room.id;
  let theme: MusicTheme;
  if (g.screen === "ending" || id === "honor") theme = "finale";
  else if (["tomb", "pursuit", "dawn-climb", "sunset"].includes(id))
    theme = "loss";
  else if (FINALE_IDS.includes(id) || id === "hourglass") theme = "crown";
  else if (WING_IDS.includes(id)) theme = "wing";
  else if (DEPTHS_IDS.includes(id)) theme = "depths";
  else if (Object.hasOwn(ECHO_CHAMBERS, id)) theme = "echoes";
  else if (BATHS_IDS.includes(id) || ["spillway", "valve-loft"].includes(id))
    theme = "baths";
  else if (
    ["prison", "prison-cells", "chain-shaft", "warden-loft"].includes(id)
  )
    theme = "prison";
  else if (["orrery", "sky-bridge", "lens-roof", "archive-stair"].includes(id))
    theme = "observatory";
  else
    theme =
      g.room.theme === "garden"
        ? "garden"
        : g.room.theme === "water"
          ? "baths"
          : "palace";
  const live = g.enemies.filter((e) => !e.dead);
  const boss = live.find((e) =>
    ["king", "double", "vizier", "rival"].includes(e.kind),
  );
  const danger =
    g.screen === "ending"
      ? "calm"
      : g.depths?.active && !g.journey.depths.resolved
        ? "keeper"
        : boss?.kind === "king"
          ? "king"
          : boss?.kind === "rival"
            ? "rival"
            : boss
              ? "vizier"
              : live.some(
                    (e) =>
                      Math.abs(e.x - g.player.x) < 430 &&
                      Math.abs(e.y - g.player.y) < 220,
                  )
                ? "combat"
                : "calm";
  return {
    theme,
    danger,
    era: theme === "wing" ? g.journey.wing.era : undefined,
  };
}
