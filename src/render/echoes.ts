import type { CampaignGame } from "../campaign/CampaignGame";
import { drawPrince } from "./actors";
import { ellipse, line, type Context } from "./shapes";

export function drawEchoes(c: Context, g: CampaignGame, time = g.visualTime) {
  const e = g.echoes,
    chamber = e.chamber;
  if (!chamber) return;
  const text = (s: string, x: number, y: number) => {
    c.font = "15px Georgia";
    c.textAlign = "center";
    c.fillStyle = "#f1e9ce";
    c.fillText(s, x, y);
    c.textAlign = "left";
  };
  const { plate, bell, gate, latch } = chamber;
  c.fillStyle = e.plateHeld || e.solved ? "#adebd8" : "#ac9972";
  c.fillRect(plate.x - 48, plate.y - 8, 96, 8);
  for (let x = plate.x - 40; x < plate.x + 45; x += 16)
    line(
      c,
      [
        [x, plate.y - 9],
        [x + 8, plate.y - 18],
      ],
      "#eff6df",
      3,
    );
  text(e.plateHeld ? "Plate held" : "Prince or echo", plate.x, plate.y - 35);
  // Striped wire shows the local cause and effect even with motion reduced.
  line(
    c,
    [
      [plate.x, plate.y + 12],
      [gate.x + 15, plate.y + 12],
      [gate.x + 15, gate.h],
    ],
    "#a9dbc4",
    2,
  );
  c.strokeStyle = "#b5d9c8";
  c.lineWidth = 2;
  c.strokeRect(gate.x, gate.y, gate.w, gate.h);
  if (!e.open) {
    c.fillStyle = "#52686b";
    c.fillRect(gate.x, gate.y, gate.w, gate.h);
    for (let y = 15; y < gate.h; y += 28)
      line(
        c,
        [
          [gate.x, y],
          [gate.x + gate.w, y + 12],
        ],
        "#d5c494",
        4,
      );
  }
  text(e.open ? "OPEN" : "Echo gate", gate.x, Math.max(165, gate.h - 170));
  if (bell) {
    line(
      c,
      [
        [bell.x, bell.y],
        [bell.x, bell.y - 70],
      ],
      "#9cae9f",
      5,
    );
    ellipse(c, bell.x, bell.y - 70, 17, 20, "#d7c691");
    line(
      c,
      [
        [bell.x - 14, bell.y - 70],
        [bell.x + 14, bell.y - 70],
      ],
      "#eff6df",
      4,
    );
    text("Interact · Echo bell", bell.x, bell.y - 110);
  }
  c.fillStyle = e.solved ? "#adebd8" : "#d7b676";
  c.fillRect(latch.x - 15, latch.y - 60, 30, 60);
  text(e.solved ? "Secured" : "Interact · Latch", latch.x, latch.y - 82);
  if (chamber.bridge) {
    const b = chamber.bridge;
    c.setLineDash([8, 6]);
    c.strokeRect(b.x, b.y, b.w, b.h);
    c.setLineDash([]);
    text(
      e.plateHeld || e.solved ? "Span raised" : "Plate raises span",
      b.x + b.w / 2,
      b.y - 28,
    );
  }
  if (e.actor) {
    c.save();
    drawPrince(c, e.actor, g.options.reducedMotion ? 0 : time, true, false);
    c.strokeStyle = "#b9f7ea";
    c.lineWidth = 2;
    c.strokeRect(e.actor.x - 3, e.actor.y - 3, e.actor.w + 6, e.actor.h + 6);
    text("ECHO", e.actor.x + 15, e.actor.y - 16);
    c.restore();
  }
  if (e.phase === "recording") {
    c.strokeStyle = "#f2d48b";
    c.lineWidth = 3;
    c.strokeRect(
      g.player.x - 5,
      g.player.y - 5,
      g.player.w + 10,
      g.player.h + 10,
    );
    text("REC", g.player.x + 15, g.player.y - 20);
  }
}
