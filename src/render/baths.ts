import type { CampaignGame } from "../campaign/CampaignGame";
import { BATHS_IDS } from "../campaign/baths";
import { ellipse, line, type Context } from "./shapes";

export function drawBaths(c: Context, g: CampaignGame) {
  const id = g.room.id,
    b = g.journey.baths;
  if (!BATHS_IDS.includes(id)) return;
  c.save();
  if (["baths-main", "sluice-reservoir", "upper-baths"].includes(id)) {
    const x = id === "baths-main" ? 710 : 350;
    const y = b.drained ? 625 : 475;
    c.fillStyle = b.drained ? "#64a89c35" : "#64a89c80";
    c.fillRect(x, y, id === "baths-main" ? 310 : 600, 650 - y);
    for (let n = 0; n < 4; n++)
      line(
        c,
        [
          [x + n * 60, y + Math.sin(g.visualTime * 2 + n) * 3],
          [x + n * 60 + 65, y],
        ],
        "#a9dbca",
        2,
      );
    c.fillStyle = "#e0d1ac";
    c.font = "13px Georgia";
    c.fillText(
      b.drained
        ? "Low water · service routes open"
        : "High water · sluice closed",
      x,
      y - 15,
    );
  }
  if (["steam-chambers", "bathworks", "sluice-reservoir"].includes(id)) {
    line(
      c,
      [
        [320, 690],
        [1140, 690],
        [1140, 470],
      ],
      b.intake ? "#9dc9ae" : "#7e7659",
      12,
    );
    for (let x = 340; x < 1140; x += 140)
      line(
        c,
        [
          [x, 676],
          [x, 704],
        ],
        "#d3b87e",
        3,
      );
  }
  if (id === "steam-chambers")
    for (const vent of g.room.hazards) {
      const active = Math.sin((g.worldTime * Math.PI * 2) / 3) > 0.3;
      for (let n = 0; n < 5; n++)
        ellipse(
          c,
          vent.x + 25 + Math.sin(g.visualTime * 2 + n) * 12,
          620 - n * 15,
          25,
          12,
          active ? "#e3dbb36b" : "#c4cebe18",
        );
    }
  const control = g.regionalControl;
  if (control) {
    const { x, y } = control;
    c.strokeStyle = "#d1b881";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(x, y - 45, 25, 0, Math.PI * 2);
    c.stroke();
    line(
      c,
      [
        [x - 25, y - 45],
        [x + 25, y - 45],
      ],
      "#d1b881",
      4,
    );
    line(
      c,
      [
        [x, y - 70],
        [x, y],
      ],
      "#d1b881",
      4,
    );
    c.font = "13px Georgia";
    c.textAlign = "center";
    c.fillStyle = "#f0dfb6";
    c.fillText(
      id === "bathworks"
        ? "Sluice wheel"
        : id === "maintenance"
          ? "Rotunda latch"
          : "Reservoir intake",
      x,
      y - 90,
    );
  }
  if (id === "maintenance") {
    c.font = "14px Georgia";
    c.fillStyle = "#ddc898";
    c.fillText("Waterkeepers' conduit", 580, 390);
    c.fillText("Jump from the broken ledge, then Time Dash", 510, 420);
  }
  c.restore();
}
