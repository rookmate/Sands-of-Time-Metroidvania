import type { CampaignGame } from "../campaign/CampaignGame";
import {
  HISTORY_EVIDENCE,
  HISTORY_IDS,
  HISTORY_ROOM,
} from "../campaign/history";
import { arch, ellipse, line, polygon, type Context } from "./shapes";

export function drawHistory(c: Context, g: CampaignGame) {
  c.save();
  c.font = "16px Georgia";
  c.textAlign = "center";
  if (g.room.id === "garden-court") {
    // Twin carved trees and cart grooves identify the same opening as the plan.
    if (!g.journey.history.opened) {
      arch(c, 715, 435, 130, 215, "#756f55", "#dcc28b");
      for (let y = 480; y < 640; y += 32)
        line(
          c,
          [
            [718, y],
            [842, y],
          ],
          "#aaa17a",
          2,
        );
      c.fillStyle = "#c9b78d";
      c.fillRect(713, 640, 134, 10);
      c.fillStyle = "#514f3d";
      c.fillRect(772, 642, 16, 5);
    }
    if (g.journey.history.opened) {
      c.fillStyle = "#c9b78d";
      c.fillRect(600, 640, 60, 10);
      c.fillStyle = "#514f3d";
      c.fillRect(624, 642, 12, 5);
      c.fillStyle = "#f4dfb2";
      c.fillText("Worn freight sill · E", 605, 600);
    }
    for (const x of [687, 873]) {
      line(
        c,
        [
          [x, 650],
          [x, 480],
        ],
        "#dac08a",
        5,
      );
      polygon(
        c,
        [
          [x, 455],
          [x - 19, 590],
          [x + 19, 590],
        ],
        "#485b42",
        "#c9b78d",
      );
    }
    for (const x of [748, 810])
      line(
        c,
        [
          [x, 649],
          [x - 22, 663],
        ],
        "#e1c89b",
        3,
      );
    c.fillStyle = "#f4dfb2";
    c.fillText(
      g.journey.history.opened
        ? "The cypress facing is open"
        : "Twin cypresses · worn sill · E",
      780,
      415,
    );
  }
  if (g.room.id === HISTORY_ROOM) {
    // Smoke stains stop at the entry lintel; the shelves beyond stayed clean.
    for (let i = 0; i < 12; i++)
      ellipse(
        c,
        80 + i * 10,
        505 + Math.sin(i * 2) * 12,
        17,
        18 + (i % 4) * 6,
        "#332f273b",
      );
    line(
      c,
      [
        [150, 480],
        [150, 560],
      ],
      "#d8c499",
      4,
    );
    for (const x of [250, 460, 960]) {
      c.fillStyle = "#8f7553";
      c.fillRect(x - 65, 520, 130, 12);
      c.fillRect(x - 65, 590, 130, 12);
      for (let i = 0; i < 4; i++) {
        ellipse(c, x - 41 + i * 28, 515, 9, 5, "#c3a776");
      }
    }
    line(
      c,
      [
        [690, 480],
        [690, 640],
      ],
      "#d8c499",
      2,
    );
    for (const y of [536, 560, 585, 611])
      line(
        c,
        [
          [682, y],
          [703, y],
        ],
        "#d8c499",
        2,
      );
    c.fillStyle = "#ecd9af";
    c.fillText("Smoke at the lintel. Bread shelves beyond.", 620, 370);
    c.font = "14px Georgia";
    c.fillText("Nima · Rafi · Leyla", 760, 480);
    c.font = "16px Georgia";
  }
  for (const id of HISTORY_IDS) {
    const e = HISTORY_EVIDENCE[id];
    if (e.room !== g.room.id || id === "sill") continue;
    const read = g.journey.history.read.includes(id);
    c.fillStyle = "#433d30";
    c.fillRect(e.x - 28, e.y - 95, 56, 78);
    c.strokeStyle = read ? "#b2c4a2" : "#e0c18b";
    c.lineWidth = 2;
    c.strokeRect(e.x - 28, e.y - 95, 56, 78);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = "#ceb889";
      c.fillRect(e.x - 18, e.y - 80 + i * 13, 36 - i * 4, 2);
    }
    c.fillStyle = "#f4dfb2";
    c.fillText(
      `${id === "decree" ? "Court tablet" : id === "bowls" ? "Gardener's ledger" : id === "plan" ? "Old court plan" : "Names by the door"} · E${read ? " · reread" : ""}`,
      e.x,
      e.y - 115,
    );
  }
  c.restore();
}
