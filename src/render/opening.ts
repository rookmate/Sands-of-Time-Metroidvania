import type { CampaignGame } from "../campaign/CampaignGame";
import { SUN_HEART, SUN_VAULT } from "../campaign/opening";
import { ellipse, line, type Context } from "./shapes";

function sun(c: Context, x: number, y: number) {
  ellipse(c, x, y, 18, 18, "#e7c77f");
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line(
      c,
      [
        [x + Math.cos(a) * 24, y + Math.sin(a) * 24],
        [x + Math.cos(a) * 34, y + Math.sin(a) * 34],
      ],
      "#e7c77f",
      3,
    );
  }
}
export function drawOpening(c: Context, g: CampaignGame) {
  c.save();
  c.font = "16px Georgia";
  c.fillStyle = "#f0dfb6";
  if (g.room.id === "siege") {
    sun(c, 650, 370);
    c.textAlign = "center";
    c.font = "13px Georgia";
    c.fillText(
      g.hasDagger ? "Dagger seal open · life upgrade" : "Dagger-shaped seal",
      650,
      437,
    );
    if (!g.hasDagger) {
      line(
        c,
        [
          [638, 455],
          [638, 527],
        ],
        "#e7c77f",
        4,
      );
      line(
        c,
        [
          [662, 455],
          [662, 527],
        ],
        "#e7c77f",
        4,
      );
    }
    c.textAlign = "left";
    c.fillText("Palace →", 1090, 615);
    // Broken masonry marks the lip before the floor disappears.
    for (const x of [810, 990])
      line(
        c,
        [
          [x, 643],
          [x + 24, 627],
          [x + 42, 643],
        ],
        "#e7c77f",
        4,
      );
  }
  if (g.room.id === "treasury") {
    c.fillText("Blade crossing", 1400, 550);
    line(
      c,
      [
        [1465, 648],
        [1465, 570],
        [1565, 570],
        [1565, 648],
      ],
      "#e7c77f",
      2,
    );
    c.fillText("← Sun vault", 1110, 615);
  }
  if (g.room.id === SUN_VAULT) {
    sun(c, 1000, 160);
    c.textAlign = "center";
    c.fillText(
      g.collected.has(SUN_HEART) ? "A life remembered" : "Life upgrade",
      1000,
      220,
    );
    c.textAlign = "left";
    c.fillText("← Siege terrace", 55, 490);
  }
  c.restore();
}
