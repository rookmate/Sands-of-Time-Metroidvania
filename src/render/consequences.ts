import type { CampaignGame } from "../campaign/CampaignGame";
import { CONSEQUENCE_IDS, STORE_BAR } from "../campaign/consequences";
import { arch, ellipse, line, polygon, type Context } from "./shapes";

function lamp(c: Context, x: number, y: number, lit: boolean) {
  line(
    c,
    [
      [x, y - 55],
      [x, y - 20],
    ],
    "#b69d6b",
    2,
  );
  polygon(
    c,
    [
      [x - 9, y - 20],
      [x + 9, y - 20],
      [x + 7, y],
      [x - 7, y],
    ],
    lit ? "#e8c997" : "#514f3d",
    "#b69d6b",
  );
  if (lit) ellipse(c, x, y - 10, 3, 7, "#fff0bd");
}
function nima(c: Context, x: number) {
  ellipse(c, x, 646, 28, 5, "#172b3090");
  polygon(
    c,
    [
      [x - 11, 602],
      [x + 10, 602],
      [x + 23, 644],
      [x - 23, 644],
    ],
    "#6a8b80",
    "#d6ba86",
  );
  ellipse(c, x, 592, 9, 12, "#d6b18c");
  polygon(
    c,
    [
      [x - 12, 588],
      [x, 578],
      [x + 12, 588],
      [x + 9, 593],
      [x - 10, 593],
    ],
    "#d8c4a1",
  );
  line(
    c,
    [
      [x - 7, 613],
      [x + 18, 623],
      [x + 29, 615],
    ],
    "#d6b18c",
    4,
  );
  lamp(c, x + 31, 632, true);
}
export function drawConsequences(c: Context, g: CampaignGame) {
  const id = g.room.id,
    s = g.journey.consequences;
  c.save();
  c.font = "16px Georgia";
  c.textAlign = "center";
  if (id === "root-conduit" || id === "cypress-crown") {
    const x = id === "root-conduit" ? 220 : 900;
    lamp(c, x, 510, id === "cypress-crown" && s.nimaRescued);
    c.fillStyle = "#f0dcae";
    c.fillText(id === "root-conduit" ? "Lamp store" : "Lamp refuge", x, 545);
  }
  if (id === "warden-loft") {
    lamp(c, 750, 510, s.liftRepaired && g.journey.palace.prisonOpen);
    c.fillStyle = "#f0dcae";
    c.fillText("Refuge lift", 750, 545);
  }
  if (!CONSEQUENCE_IDS.includes(id)) {
    c.restore();
    return;
  }
  for (const x of [190, 500, 810]) {
    arch(c, x, 220, 180, 190, "#243a40", "#849085");
    for (const y of [310, 370]) {
      line(
        c,
        [
          [x + 10, y],
          [x + 170, y],
        ],
        "#b69d6b",
        6,
      );
      for (let n = 0; n < 4; n++) lamp(c, x + 27 + n * 40, y - 8, false);
    }
  }
  // Static shelf chevrons guide the climb without a timer or pulsing marker.
  for (const [x, y] of [
    [355, 510],
    [640, 400],
  ])
    line(
      c,
      [
        [x - 12, y],
        [x, y - 12],
        [x + 12, y],
      ],
      "#e8c997",
      3,
    );
  c.fillStyle = "#f0dcae";
  if (id === "lamp-store") {
    c.fillText(
      s.nimaRescued
        ? "Grille secured · Nima went to the refuge"
        : "Grille release · Interact",
      970,
      375,
    );
    line(
      c,
      [
        [1000, 420],
        [1000, 388],
        [s.nimaRescued ? 1020 : 980, 375],
      ],
      "#e8c997",
      6,
    );
    if (!s.nimaRescued) {
      nima(c, 890);
      c.fillStyle = "#f0dcae";
      c.fillText("Nima · Interact to speak", 680, 565);
      for (let x = STORE_BAR.x; x <= STORE_BAR.x + STORE_BAR.w; x += 7)
        line(
          c,
          [
            [x, STORE_BAR.y],
            [x, 650],
          ],
          "#b69d6b",
          4,
        );
      line(
        c,
        [
          [788, 500],
          [1110, 500],
        ],
        "#b69d6b",
        5,
      );
    } else {
      lamp(c, 890, 610, false);
      line(
        c,
        [
          [710, 625],
          [670, 625],
          [682, 617],
        ],
        "#f0dcae",
        3,
      );
      c.fillText("Nima's chalk arrow · Interact", 680, 575);
    }
  } else {
    polygon(
      c,
      [
        [370, 635],
        [515, 635],
        [530, 648],
        [360, 648],
      ],
      "#72494f",
    );
    if (s.nimaRescued) nima(c, 450);
    lamp(c, 420, 548, s.nimaRescued);
    for (const x of [500, 532])
      ellipse(c, x, 638, 12, 5, s.nimaRescued ? "#d8c4a1" : "#514f3d");
    c.fillStyle = "#f0dcae";
    c.fillText(
      s.nimaRescued
        ? "Nima kept a light · Interact"
        : "Unlit refuge · Interact",
      450,
      570,
    );
    if (s.nimaRescued && g.journey.history.read.includes("witness")) {
      c.fillText("Names copied from the cypress shelter", 450, 220);
      for (let n = 0; n < 5; n++)
        line(
          c,
          [
            [405, 245 + n * 12],
            [480 - n * 4, 245 + n * 12],
          ],
          "#d8c4a1",
          2,
        );
    }
    if (s.nimaRescued && g.journey.rival.outcome === "released")
      polygon(
        c,
        [
          [540, 610],
          [553, 600],
          [550, 627],
          [535, 627],
        ],
        "#9ec6be",
        "#d8c4a1",
      );
    c.strokeStyle = "#b69d6b";
    c.lineWidth = 4;
    c.strokeRect(1118, 525, 64, 125);
    line(
      c,
      [
        [1150, 420],
        [1150, 525],
      ],
      "#b69d6b",
      3,
    );
    ellipse(c, 1000, 396, 21, 21, "#514f3d");
    line(
      c,
      [
        [980, 396],
        [1020, 396],
      ],
      "#b69d6b",
      5,
    );
    line(
      c,
      [
        [1000, 375],
        [1000, 417],
      ],
      "#b69d6b",
      5,
    );
    polygon(
      c,
      s.liftRepaired
        ? [
            [995, 390],
            [1005, 390],
            [1005, 402],
            [995, 402],
          ]
        : [
            [1040, 412],
            [1065, 412],
            [1065, 420],
            [1040, 420],
          ],
      "#e8c997",
    );
    c.fillStyle = "#f0dcae";
    c.fillText(
      s.liftRepaired
        ? "Drive pinned · Interact"
        : "Fallen drive pin · Interact",
      975,
      350,
    );
    lamp(c, 1150, 510, s.liftRepaired && g.journey.palace.prisonOpen);
    c.fillText(
      s.liftRepaired
        ? g.journey.palace.prisonOpen
          ? "Warden lift · Interact"
          : "Cage held by prison locks"
        : "Broken lift drive",
      1100,
      690,
    );
  }
  c.restore();
}
