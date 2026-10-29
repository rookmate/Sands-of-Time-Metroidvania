import type { CampaignGame } from "../campaign/CampaignGame";
import { RIVAL_IDS, RIVAL_SITES } from "../campaign/rival";
import type { Enemy } from "../game/types";
import { ellipse, line, polygon, type Context } from "./shapes";

function label(c: Context, text: string, x: number, y: number) {
  c.font = "16px Georgia";
  c.textAlign = "center";
  const w = c.measureText(text).width + 18;
  c.fillStyle = "#202d2b";
  c.fillRect(x - w / 2, y - 18, w, 25);
  c.fillStyle = "#f4dfb2";
  c.fillText(text, x, y);
}
function crest(c: Context, x: number, y: number, color: string) {
  polygon(
    c,
    [
      [x - 15, y + 20],
      [x - 19, y - 18],
      [x - 5, y - 9],
      [x, y + 4],
      [x + 4, y - 18],
      [x + 18, y - 24],
      [x + 14, y + 20],
    ],
    color,
    "#d9b981",
  );
}
export function drawRival(
  c: Context,
  e: Pick<
    Enemy,
    | "x"
    | "y"
    | "w"
    | "h"
    | "face"
    | "hitFlash"
    | "telegraph"
    | "rivalMove"
    | "cooldown"
  >,
  frozen: boolean,
) {
  c.save();
  const x = e.x + e.w / 2,
    feet = e.y + e.h;
  if (e.hitFlash > 0) c.filter = "brightness(2)";
  const color = frozen ? "#9ac5f6" : "#a36352";
  // Narrow split crest, long trailing coat, single hooked glaive.
  polygon(
    c,
    [
      [x - 14, feet - 66],
      [x + 13, feet - 66],
      [x + 26, feet - 8],
      [x + 3, feet - 24],
      [x - 28, feet - 4],
    ],
    color,
    "#e0b67b",
  );
  line(
    c,
    [
      [x - 8, feet - 27],
      [x - 12, feet],
    ],
    "#333b39",
    9,
  );
  line(
    c,
    [
      [x + 8, feet - 27],
      [x + 14, feet],
    ],
    "#333b39",
    9,
  );
  ellipse(c, x, feet - 73, 13, 12, "#d7b67f");
  crest(
    c,
    x,
    feet - 90,
    e.rivalMove === "cast" && e.telegraph > 0 ? "#f5edce" : color,
  );
  const raised = e.telegraph > 0;
  const tipX = x + e.face * (raised ? 30 : 97);
  const tipY = feet - (raised ? 120 : 45);
  line(
    c,
    [
      [x - e.face * 17, feet - 22],
      [tipX, tipY],
    ],
    "#e0c491",
    5,
  );
  line(
    c,
    [
      [tipX - e.face * 15, tipY - 13],
      [tipX + e.face * 9, tipY - 20],
      [tipX + e.face * 14, tipY + 6],
      [tipX, tipY + 13],
    ],
    "#e9e3cc",
    6,
  );
  if (e.telegraph > 0) {
    line(
      c,
      [
        [x, feet - (e.rivalMove === "cast" ? 60 : 3)],
        [x + e.face * 240, feet - (e.rivalMove === "cast" ? 60 : 3)],
      ],
      "#f4dfb2",
      3,
    );
    label(
      c,
      e.rivalMove === "cast"
        ? "High cast · shelter below"
        : "Thrust · jump, then strike",
      Math.max(220, Math.min(x, 1050)),
      feet - 150,
    );
  } else if (!e.rivalMove && e.cooldown > 0) {
    label(c, "Opening · strike", Math.max(220, Math.min(x, 1050)), feet - 150);
  }
  c.restore();
}
export function drawRivalRooms(c: Context, g: CampaignGame) {
  c.save();
  const site = RIVAL_SITES.find((s) => s.parent === g.room.id);
  if (site) {
    crest(c, site.x, 550, "#a36352");
    label(c, "Split-crest passage · E", site.x, 505);
  }
  const stage = RIVAL_IDS.indexOf(g.room.id);
  if (stage < 0) {
    c.restore();
    return;
  }
  const s = g.journey.rival;
  for (const x of [460, ...(stage === 2 ? [600] : [])]) {
    const blue = x === 600;
    line(
      c,
      [
        [x, 650],
        [x, blue ? 580 : 490],
      ],
      "#d0b784",
      4,
    );
    polygon(
      c,
      [
        [x, blue ? 580 : 490],
        [x + 50, blue ? 590 : 510],
        [x, blue ? 610 : 540],
      ],
      blue ? "#75a9bc" : "#b59457",
    );
    crest(c, x + 15, blue ? 595 : 515, blue ? "#75a9bc" : "#a36352");
  }
  // Training grooves mark the thrust lane; the gallery offers a sheltered floor.
  for (let x = 640; x < 1090; x += 70)
    line(
      c,
      [
        [x, stage ? 531 : 650],
        [x + 24, stage ? 531 : 650],
      ],
      "#dfbd7f",
      3,
    );
  c.fillStyle = "#594938";
  c.fillRect(286, 565, 48, 66);
  for (let y = 580; y < 625; y += 10)
    line(
      c,
      [
        [294, y],
        [324, y],
      ],
      "#dec394",
      2,
    );
  label(c, stage ? "Muster roll · E" : "Weapon rack · E", 295, 545);
  label(
    c,
    s.outcome || stage < s.bouts
      ? "The gold standard is quiet"
      : "Gold standard · duel · E",
    460,
    458,
  );
  if (stage === 2)
    label(
      c,
      s.outcome ? "The vigil is over" : "Blue standard · release · E",
      655,
      690,
    );
  label(
    c,
    stage
      ? "Safe floor beneath high casts"
      : "Raised hook: jump the committed thrust",
    865,
    720,
  );
  const active = g.enemies.some((e) => e.kind === "rival" && !e.dead);
  if (!active && !s.outcome && stage >= s.bouts) {
    // Presence before acceptance. It cannot collide, shoot, or grant rewards.
    const enemy = {
      x: stage ? 900 : 820,
      y: stage ? 442 : 562,
      w: 50,
      h: 88,
      face: -1,
      hitFlash: 0,
      telegraph: 0,
      cooldown: 0,
    };
    c.globalAlpha = stage === s.bouts ? 0.85 : 0.35;
    drawRival(c, enemy, false);
    c.globalAlpha = 1;
    label(
      c,
      stage === s.bouts
        ? "Sahir waits for your answer"
        : "An unfinished drill calls him elsewhere",
      870,
      365,
    );
  }
  if (stage === 2 && s.outcome) {
    if (s.outcome === "released") {
      c.save();
      c.translate(900, 530);
      c.scale(1, 0.68);
      c.translate(-900, -530);
      drawRival(
        c,
        {
          x: 875,
          y: 442,
          w: 50,
          h: 88,
          face: -1,
          hitFlash: 0,
          telegraph: 0,
          cooldown: 0,
        },
        false,
      );
      c.restore();
    } else {
      line(
        c,
        [
          [850, 528],
          [905, 519],
        ],
        "#e0c491",
        5,
      );
      line(
        c,
        [
          [920, 525],
          [958, 505],
        ],
        "#e9e3cc",
        6,
      );
      crest(c, 940, 510, "#a36352");
    }
    label(
      c,
      s.outcome === "released"
        ? "All accounted for. Sahir rests."
        : "The broken crest. His last drill is over.",
      880,
      400,
    );
  }
  c.restore();
}
