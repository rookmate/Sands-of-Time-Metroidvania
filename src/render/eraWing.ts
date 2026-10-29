import type { CampaignGame } from "../campaign/CampaignGame";
import { WING } from "../campaign/eraWing";
import { arch, line, polygon, type Context } from "./shapes";

export function drawEraWing(c: Context, g: CampaignGame) {
  const wing = WING[g.room.id];
  if (!wing) return;
  const intact = g.journey.wing.era === "intact";
  // The same column shafts stand in one moment and become the
  // traversable rubble shelves in the other. Silhouettes carry the rule.
  for (let i = 0; i < 3; i++) {
    const x = 350 + i * 235;
    if (intact) {
      c.fillStyle = "#c9b98c";
      c.fillRect(x, 180, 32, 470);
      c.fillRect(x - 12, 170, 56, 20);
      arch(c, x + 32, 180, 203, 150, "#9b876055", "#d6bd83");
    } else {
      polygon(
        c,
        [
          [x, 650],
          [x + 12, 554 - i * 110],
          [x + 47, 574 - i * 110],
          [x + 70, 650],
        ],
        "#7d7563",
        "#beaa82",
      );
      line(
        c,
        [
          [x, 230],
          [x + 15, 263],
          [x - 8, 286],
        ],
        "#bfa77b",
        3,
      );
    }
  }
  for (const m of wing.mirrors) {
    arch(c, m.x - 30, m.y - 110, 60, 110, "#272c29", "#e2ce91");
    line(
      c,
      [
        [m.x - 16, m.y - 24],
        [m.x + 16, m.y - 88],
      ],
      "#c9dbca",
      4,
    );
    line(
      c,
      [
        [m.x - 16, m.y - 88],
        [m.x + 16, m.y - 24],
      ],
      "#e2ce91",
      2,
    );
    c.font = "15px Georgia";
    c.textAlign = "center";
    c.fillStyle = "#fff1c9";
    c.fillText(`E · ${g.journey.wing.era} ↔`, m.x, m.y - 125);
  }
  c.textAlign = "left";
  if (g.room.id === "mirror-vault") {
    c.fillStyle = "#c9b98c";
    c.fillRect(1180, 610, 75, 40);
    c.fillStyle = "#97674e";
    c.beginPath();
    c.arc(1210, 597, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#e2ce91";
    c.font = "14px Georgia";
    c.fillText("A gift never sent · E", 1090, 565);
  }
}
