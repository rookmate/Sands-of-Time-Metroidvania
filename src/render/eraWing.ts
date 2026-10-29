import type { CampaignGame } from "../campaign/CampaignGame";
import { WING } from "../campaign/eraWing";
import { arch, line, type Context } from "./shapes";

export function drawEraWing(c: Context, g: CampaignGame) {
  const wing = WING[g.room.id];
  if (!wing) return;
  // Architecture lives behind terrain; only real mirrors and the gift draw here.
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
    c.fillText(`Interact · ${g.journey.wing.era} ↔`, m.x, m.y - 125);
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
    c.fillText("A gift never sent · Interact", 1090, 565);
  }
}
