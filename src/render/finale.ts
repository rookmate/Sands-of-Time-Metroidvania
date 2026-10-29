import { FINALE_IDS, finaleControls } from "../campaign/finale";
import type { CampaignGame } from "../campaign/CampaignGame";
import { arch, ellipse, line, polygon, type Context } from "./shapes";

export function drawFinale(c: Context, g: CampaignGame) {
  if (!FINALE_IDS.includes(g.room.id)) return;
  const id = g.room.id,
    s = g.puzzles.state;
  c.save();
  c.font = "16px Georgia";
  c.fillStyle = "#ead6ae";
  if (id === "crown-baths") {
    // The rotunda basin and its copper supply pipe, seen from above.
    ellipse(c, 720, 710, 290, 55, "#34675c");
    ellipse(c, 720, 700, 260, 29, "#77b5a65e");
    line(
      c,
      [
        [320, 650],
        [320, 720],
        [1100, 720],
        [1100, 420],
      ],
      "#a99060",
      10,
    );
    c.strokeStyle = s.activated ? "#9bd1ad" : "#d8b67c";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(1100, 375, 28, 0, Math.PI * 2);
    c.stroke();
    line(
      c,
      [
        [1072, 375],
        [1128, 375],
      ],
      c.strokeStyle as string,
      4,
    );
    line(
      c,
      [
        [320, 650],
        [320, 390],
        [1010, 390],
      ],
      g.journey.consequences.liftRepaired ? "#a5c8a1" : "#6c6657",
      4,
    );
    c.fillStyle = "#e5d1ac";
    c.fillText(
      g.journey.consequences.liftRepaired
        ? "Refuge drive repaired · Interact to ride"
        : "Silent refuge drive · shelves remain open",
      185,
      590,
    );
    c.fillText("Dry overflow · jump, then Dash east", 570, 365);
    c.fillText(
      s.activated ? "Overflow grille open" : "Wheel opens the Hall grille",
      950,
      305,
    );
    if (g.journey.consequences.nimaRescued) {
      ellipse(c, 570, 599, 8, 13, "#f2ce82");
      line(
        c,
        [
          [555, 605],
          [555, 590],
          [570, 575],
          [585, 590],
        ],
        "#f0e4c5",
        3,
      );
      c.fillText("Nima's lamp · the keepers reached shelter", 390, 555);
    } else
      c.fillText("Keeper's niche · Interact to read the dry route", 450, 605);
  } else if (id === "crown-hall") {
    for (let x = 430; x < 1200; x += 130)
      arch(c, x, 170, 65, 160, "#6f6046", "#b89e71");
    const high = s.values[0] === 1;
    line(
      c,
      [
        [330, 598],
        [1080, high ? 355 : 625],
      ],
      high ? "#f4dd93" : "#c7b77a",
      4,
    );
    for (const [x, y] of [
      [330, 598],
      [1080, 365],
    ]) {
      line(
        c,
        [
          [x - 22, y + 15],
          [x + 22, y - 15],
        ],
        "#d8ecd9",
        7,
      );
      line(
        c,
        [
          [x, y + 15],
          [x, y + 50],
        ],
        "#b99864",
        5,
      );
    }
    c.fillStyle = "#ead6ae";
    c.fillText(
      high
        ? "Light rises to the roof receiver"
        : "Lower drain · turn west mirror to aim high",
      390,
      570,
    );
    c.fillText("Pin the east receiver · Interact", 950, 310);
    c.fillText(
      g.journey.history.read.includes("witness")
        ? "The witnesses' names, signed in daylight"
        : "LIGHT RISES · WATER FALLS",
      530,
      620,
    );
    if (!s.activated) {
      line(
        c,
        [
          [1165, 185],
          [1165, 420],
        ],
        "#b29d76",
        12,
      );
      c.fillText("Roof shutter closed", 1040, 210);
    }
  } else {
    // The familiar prison winch, now carrying the route over the cells.
    ellipse(c, 590, 210, 62, 62, "#756c55");
    ellipse(c, 590, 210, 45, 45, "#353d38");
    line(
      c,
      [
        [590, 210],
        [880, 210],
        [880, 310],
      ],
      "#c1af86",
      6,
    );
    line(
      c,
      [
        [590, 210],
        [590, 470],
      ],
      "#c1af86",
      6,
    );
    c.fillStyle = "#6f715e";
    c.fillRect(540, 455, 100, 150);
    for (let x = 60; x < 1200; x += 140) {
      arch(c, x, 690, 80, 100, "#253e38", "#8e866c");
      line(
        c,
        [
          [x + 25, 715],
          [x + 25, 790],
        ],
        "#8e866c",
        4,
      );
      line(
        c,
        [
          [x + 55, 715],
          [x + 55, 790],
        ],
        "#8e866c",
        4,
      );
    }
    polygon(
      c,
      [
        [600, 570],
        [640, 580],
        [625, 615],
        [603, 609],
      ],
      "#ac956b",
    );
    line(
      c,
      [
        [619, 574],
        [613, 610],
      ],
      "#2c443c",
      4,
    );
    c.fillStyle = "#ead6ae";
    c.fillText(
      g.journey.rival.outcome === "released"
        ? "Sahir's last watch · level crossing left for you"
        : g.journey.rival.outcome === "defeated"
          ? "Sahir's crest · the last rematch is over"
          : "The old watch · catch the bar, jump east",
      480,
      275,
    );
    c.fillText(
      "Hourglass ahead · returns stay open until its descent",
      760,
      370,
    );
    c.fillText("Lower landing catches missed handholds", 730, 610);
  }
  c.font = "13px Georgia";
  c.fillStyle = "#f2dfb8";
  c.textAlign = "center";
  for (const control of finaleControls(g)) {
    ellipse(c, control.x, control.y - 12, 6, 6, "#f2dfb8");
    c.fillText("Interact", control.x, control.y - 27);
  }
  c.restore();
}
