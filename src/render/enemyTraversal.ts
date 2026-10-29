import type { CampaignGame } from "../campaign/CampaignGame";
import {
  CROSSING_STONES,
  RAM_WALL,
  SCARAB_PLATE,
  TRAVERSAL_IDS,
  scarabOnPlate,
} from "../campaign/enemyTraversal";
import { ellipse, line, type Context } from "./shapes";

export function drawEnemyTraversal(c: Context, g: CampaignGame) {
  if (g.room.id === "zoo") {
    c.save();
    c.fillStyle = "#efd6a0";
    c.font = "16px Georgia";
    label(c, "Hollow creatures · service pens · Interact", 280, 475);
    c.restore();
  }
  if (!TRAVERSAL_IDS.includes(g.room.id)) return;
  c.save();
  c.textAlign = "center";
  c.font = "16px Georgia";
  c.fillStyle = "#f5dfb3";
  label(c, "Recall bell · Interact", 300, 570);
  label(c, "Hollow sand: no combat sand reward", 300, 300);
  c.fillStyle = "#d8b77b";
  c.fillRect(296, 600, 8, 50);
  ellipse(c, 300, 596, 15, 11, "#e5c58b");
  if (g.room.id === "ram-run") {
    c.fillStyle = "#f5dfb3";
    label(c, "Bait toward the cracks. Jump after it sights you.", 680, 365);
    if (!g.journey.traversal.broken) {
      c.fillStyle = "#d8c89d";
      c.fillRect(RAM_WALL.x, 0, RAM_WALL.w, 650);
      for (let y = 30; y < 640; y += 100)
        line(
          c,
          [
            [924, y],
            [910, y + 28],
            [935, y + 53],
            [920, y + 86],
          ],
          "#423d30",
          5,
        );
      c.fillStyle = "#f5dfb3";
      label(c, "Weakened masonry", 980, 290);
    } else {
      for (let i = 0; i < 6; i++)
        ellipse(c, 890 + i * 12, 644, 10, 6, "#d8c89d");
      label(c, "Passage broken open", 960, 300);
    }
    for (const e of g.enemies) {
      if (e.dead) continue;
      c.fillStyle = "#ffe2ae";
      label(
        c,
        e.telegraph > 0
          ? "SIGHTED · JUMP CLEAR"
          : e.charge
            ? "CHARGE"
            : "Hollow ram",
        e.x + 17,
        e.y - 34,
      );
      if (e.charge)
        line(
          c,
          [
            [e.x + 17, e.y + e.h - 5],
            [e.x + 17 + e.charge.direction * 250, e.y + e.h - 5],
          ],
          "#eeb76f",
          3,
        );
    }
  } else {
    const on = scarabOnPlate(g),
      latched = g.journey.traversal.latched;
    c.fillStyle = on ? "#a4e4d3" : "#e1bb74";
    c.fillRect(SCARAB_PLATE.x, 414, SCARAB_PLATE.w, 6);
    for (let x = SCARAB_PLATE.x; x < SCARAB_PLATE.x + SCARAB_PLATE.w; x += 12)
      line(
        c,
        [
          [x, 414],
          [x + 6, 403],
        ],
        "#f8e2ad",
        2,
      );
    label(c, "Freeze scarab on stripes · F", 650, 285);
    label(c, "Jump stones. Secure far latch · Interact", 1090, 225);
    label(
      c,
      "Missed? Safe floor returns west to fountain and recall.",
      900,
      605,
    );
    for (const p of CROSSING_STONES) {
      line(
        c,
        [
          [p.x + p.w / 2, 420],
          [p.x + p.w / 2, 650],
        ],
        "#b39d7066",
        3,
      );
      if (!on && !latched) {
        c.strokeStyle = "#c5ba9588";
        c.setLineDash([8, 8]);
        c.strokeRect(p.x, p.y, p.w, p.h);
        c.setLineDash([]);
      }
    }
    c.fillStyle = latched ? "#a4e4d3" : "#e1bb74";
    c.fillRect(1384, 365, 12, 55);
    label(c, latched ? "Stones latched" : "Far latch · Interact", 1400, 345);
  }
  c.restore();
}

function label(c: Context, text: string, x: number, y: number) {
  c.save();
  const w = c.measureText(text).width;
  c.fillStyle = "#183739cc";
  c.fillRect(
    c.textAlign === "center" ? x - w / 2 - 6 : x - 6,
    y - 17,
    w + 12,
    23,
  );
  c.fillStyle = "#f6dfaf";
  c.fillText(text, x, y);
  c.restore();
}
