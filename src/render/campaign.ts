import { drawEchoes } from "./echoes";
import { drawPalace } from "./palace";
import { drawCooperation } from "./cooperation";
import { drawRewards } from "./rewards";
import { drawBaths } from "./baths";
import { CampaignGame } from "../campaign/CampaignGame";
import type { Game } from "../game/Game";
import { arch, ellipse, line, polygon, star, type Context } from "./shapes";

export function drawTraversal(c: Context, g: Game) {
  for (const grip of g.grips) {
    if (grip.kind === "ladder") {
      line(
        c,
        [
          [grip.x - 14, grip.y],
          [grip.x - 14, grip.y + (grip.length ?? 200)],
        ],
        "#b69d6b",
        4,
      );
      line(
        c,
        [
          [grip.x + 14, grip.y],
          [grip.x + 14, grip.y + (grip.length ?? 200)],
        ],
        "#b69d6b",
        4,
      );
      for (let y = grip.y; y < grip.y + (grip.length ?? 200); y += 20)
        line(
          c,
          [
            [grip.x - 14, y],
            [grip.x + 14, y],
          ],
          "#b69d6b",
          3,
        );
    } else if (grip.kind === "bar") {
      line(
        c,
        [
          [grip.x, grip.y - 90],
          [grip.x, grip.y],
        ],
        "#756f57",
        3,
      );
      line(
        c,
        [
          [grip.x - 32, grip.y],
          [grip.x + 32, grip.y],
        ],
        "#ddc58c",
        6,
      );
    } else {
      line(
        c,
        [
          [grip.x - 25, grip.y - (grip.length ?? 220)],
          [grip.x - 12, grip.y - 70],
          [grip.x, grip.y],
        ],
        "#c9b17e",
        4,
      );
      ellipse(c, grip.x, grip.y, 5, 8, "#dec995");
    }
  }
}
function lever(
  c: Context,
  x: number,
  y: number,
  label: string,
  active = false,
) {
  c.fillStyle = "#455858";
  c.fillRect(x - 13, y - 54, 26, 54);
  line(
    c,
    [
      [x, y - 25],
      [x + (active ? 15 : -15), y - 65],
    ],
    active ? "#a4d8be" : "#d6be88",
    5,
  );
  ellipse(
    c,
    x + (active ? 15 : -15),
    y - 65,
    6,
    6,
    active ? "#a4d8be" : "#e4ce99",
  );
  c.font = "12px Georgia";
  c.textAlign = "center";
  c.fillStyle = "#e8e2cf";
  c.fillText(label, x, y - 86);
  c.textAlign = "left";
}
function gate(c: Context, x: number, y: number, w: number, h: number) {
  c.fillStyle = "#536164";
  c.fillRect(x, y, w, h);
  for (let py = y + 10; py < y + h; py += 26)
    line(
      c,
      [
        [x, py],
        [x + w, py],
      ],
      "#d4bd83",
      3,
    );
}
export function drawCampaignObjects(c: Context, game: Game) {
  if (!(game instanceof CampaignGame)) return;
  drawEchoes(c, game);
  drawBaths(c, game);
  drawPalace(c, game);
  drawCooperation(c, game);
  drawRewards(c, game);
  const g = game,
    p = g.puzzles.definition,
    s = g.puzzles.state;
  if (p) {
    switch (p.kind) {
      case "crank":
        p.controls.forEach((v, i) => {
          lever(
            c,
            v.x,
            v.y,
            `${(s.values[i] ?? 0) + 1} / ${v.steps}`,
            s.solved,
          );
          for (let n = 0; n < v.steps; n++) {
            const a = (n * Math.PI * 2) / v.steps;
            ellipse(
              c,
              v.x + Math.cos(a) * 28,
              v.y - 120 + Math.sin(a) * 28,
              5,
              5,
              n === v.target ? "#a7e0c8" : "#766e58",
            );
          }
          const angle = ((s.values[i] ?? 0) * Math.PI * 2) / v.steps;
          line(
            c,
            [
              [v.x, v.y - 120],
              [v.x + Math.cos(angle) * 25, v.y - 120 + Math.sin(angle) * 25],
            ],
            "#ecd499",
            4,
          );
        });
        if (g.section.layout === "library")
          for (let i = 0; i < 4; i++) {
            c.strokeStyle = "#bda97688";
            c.beginPath();
            c.ellipse(1100, 180, 90 + i * 40, 30 + i * 20, 0, 0, Math.PI * 2);
            c.stroke();
            ellipse(
              c,
              1100 + Math.cos(g.worldTime * 0.3 + i) * 140,
              180 + Math.sin(g.worldTime * 0.3 + i) * 60,
              10,
              10,
              "#cdb783",
            );
          }
        break;
      case "timed":
        lever(
          c,
          p.lever.x,
          p.lever.y,
          s.remaining > 0 ? `${s.remaining.toFixed(1)}s` : "Timed gate",
          s.remaining > 0,
        );
        if (!s.solved && s.remaining <= 0)
          gate(c, p.gate.x, p.gate.y, p.gate.w, p.gate.h);
        break;
      case "crate":
        c.fillStyle = s.solved ? "#9ed7ba" : "#bc9c69";
        c.fillRect(p.plate.x - 40, p.plate.y - 5, 80, 5);
        c.fillStyle = "#8c704f";
        c.fillRect(s.crateX, p.crate.y, p.crate.w, p.crate.h);
        c.strokeStyle = "#dbc494";
        c.strokeRect(s.crateX + 4, p.crate.y + 4, p.crate.w - 8, p.crate.h - 8);
        line(
          c,
          [
            [s.crateX + 4, p.crate.y + 4],
            [s.crateX + p.crate.w - 4, p.crate.y + p.crate.h - 4],
          ],
          "#dbc494",
          3,
        );
        if (!s.solved) gate(c, p.gate.x, p.gate.y, p.gate.w, p.gate.h);
        break;
      case "paired":
        lever(c, p.prince.x, p.prince.y, "Prince", s.solved);
        lever(c, p.farah.x, p.farah.y, "Farah", s.activated);
        if (!s.solved) gate(c, p.gate.x, p.gate.y, p.gate.w, p.gate.h);
        break;
      case "mirror":
        for (const ray of g.puzzles.light.rays)
          line(
            c,
            [
              [ray.from.x, ray.from.y],
              [ray.to.x, ray.to.y],
            ],
            "#f4db9c",
            3,
          );
        g.puzzles.mirrors.forEach((m, i) => {
          const v = p.controls[i];
          const x = i === p.movable ? s.crateX : v.x;
          line(
            c,
            [
              [x, 650],
              [m.x, m.y],
            ],
            "#8d8265",
            2,
          );
          const sign = (s.values[i] ?? 0) % 2 ? 1 : -1;
          line(
            c,
            [
              [m.x - 18, m.y - 18 * sign],
              [m.x + 18, m.y + 18 * sign],
            ],
            "#b9e0d7",
            7,
          );
          lever(c, x, 650, `Mirror ${i + 1}`, s.solved);
        });
        star(c, p.target.x, p.target.y, 22, s.solved ? "#b7ead4" : "#c5ab74");
        break;
      case "columns":
        p.levers.forEach((v, i) =>
          lever(
            c,
            v.x,
            v.y,
            s.remaining > 0 ? `${s.remaining.toFixed(1)}s` : "Extend",
            s.values[i] === 1,
          ),
        );
        break;
      case "illusion":
        p.doors.forEach((v, i) => {
          arch(c, v.x - 35, v.y - 120, 70, 120, "#8d9c91", "#cdb783");
          arch(c, v.x - 27, v.y - 110, 54, 110, "#273e45");
          if (!s.solved && p.sequence[s.values[0] ?? 0] === i)
            for (let j = 0; j < 4; j++)
              ellipse(
                c,
                v.x,
                v.y - 14 - j * 12,
                12 + Math.sin(g.visualTime * 3 + j) * 4,
                2,
                "#9adacc99",
              );
        });
        if (!s.solved) gate(c, 1450, 330, 45, 320);
        break;
      case "wall":
        if (!s.solved) {
          gate(c, p.wall.x, p.wall.y, p.wall.w, p.wall.h);
          line(
            c,
            [
              [p.wall.x + 12, 390],
              [p.wall.x + 25, 470],
              [p.wall.x + 8, 550],
              [p.wall.x + 30, 620],
            ],
            "#222f33",
            4,
          );
        }
        break;
      case "battle":
        if (p.elevator) {
          line(
            c,
            [
              [330, 0],
              [330, 650 - s.lift],
            ],
            "#ae9a70",
            4,
          );
          line(
            c,
            [
              [1770, 0],
              [1770, 650 - s.lift],
            ],
            "#ae9a70",
            4,
          );
        }
        if (p.recovery && !s.activated) {
          star(c, p.recovery.x, p.recovery.y - 70, 16, "#92ded0");
          c.font = "16px Georgia";
          c.fillStyle = "#eee0bd";
          c.fillText("Farah", p.recovery.x - 25, p.recovery.y - 100);
        }
        break;
      case "vizier":
        c.font = "16px Georgia";
        c.fillStyle = "#ead7ab";
        c.fillText(
          `Doubles defeated: ${g.enemies.filter((e) => e.kind === "double" && e.dead).length} / 3`,
          1570,
          350,
        );
        break;
    }
  }
  const f = g.companion;
  if (f) {
    c.save();
    c.translate(f.x + 15, f.y + 28);
    c.scale(f.face, 1);
    line(
      c,
      [
        [-6, 7],
        [-9, 28],
      ],
      "#5a343b",
      8,
    );
    line(
      c,
      [
        [5, 7],
        [9, 28],
      ],
      "#713b41",
      8,
    );
    polygon(
      c,
      [
        [-10, -16],
        [8, -16],
        [13, 10],
        [-13, 10],
      ],
      "#b95d4c",
    );
    line(
      c,
      [
        [-8, -12],
        [-15, 0],
      ],
      "#bf926b",
      6,
    );
    line(
      c,
      [
        [8, -12],
        [22, -4],
      ],
      "#caa47b",
      6,
    );
    c.strokeStyle = "#cfb47d";
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(24, -5, 10, 23, 0, -Math.PI / 2, Math.PI / 2);
    c.stroke();
    line(
      c,
      [
        [24, -28],
        [24, 18],
      ],
      "#dfd1ad",
    );
    ellipse(c, 1, -27, 9, 11, "#c89c72");
    polygon(
      c,
      [
        [-9, -24],
        [-9, -38],
        [7, -38],
        [12, -27],
        [7, -31],
        [2, -33],
        [-3, -24],
        [-11, -4],
      ],
      "#2e292b",
    );
    c.fillStyle = "#d2b477";
    c.fillRect(-9, -36, 18, 3);
    c.restore();
    c.fillStyle = "#192e32";
    c.fillRect(f.x - 5, f.y - 22, 40, 3);
    c.fillStyle = "#dbb884";
    c.fillRect(f.x - 5, f.y - 22, (40 * f.health) / f.maxHealth, 3);
  }
}

export function drawCampaignScenery(c: Context, game: Game) {
  if (!(game instanceof CampaignGame)) return;
  const id = game.room.id,
    w = game.room.width;
  c.save();
  c.globalAlpha = 0.75;
  if (["warehouse", "mess-hall"].includes(id))
    for (let x = 650; x < w - 200; x += 220) {
      c.fillStyle = "#695a45";
      c.fillRect(x, 555, 110, 70);
      line(
        c,
        [
          [x, 555],
          [x + 110, 625],
        ],
        "#ad9973",
        4,
      );
    }
  if (["zoo", "aviary"].includes(id))
    for (let x = 500; x < w; x += 260) {
      arch(c, x, 200, 200, 390, "#41595a", "#b49e73");
      for (let n = x + 15; n < x + 200; n += 20)
        line(
          c,
          [
            [n, 240],
            [n, 590],
          ],
          "#a6976f",
          3,
        );
    }
  if (["baths-main", "bathworks", "tomb"].includes(id))
    for (let x = 350; x < w - 100; x += 400) {
      ellipse(c, x, 640, 110, 16, "#95c5b080");
      for (let n = 0; n < 3; n++)
        ellipse(
          c,
          x + Math.sin(game.visualTime + n) * 30,
          560 - n * 30,
          30,
          9,
          "#c9e0ca20",
        );
    }
  if (id === "harem")
    for (let x = 380; x < w; x += 300)
      polygon(
        c,
        [
          [x, 240],
          [x + 130, 240],
          [x + 115, 590],
          [x + 30, 600],
        ],
        "#84585b",
      );
  if (id === "learning")
    for (let x = 300; x < w; x += 270) {
      c.fillStyle = "#5d5141";
      c.fillRect(x, 330, 190, 280);
      for (let y = 350; y < 600; y += 50)
        for (let n = 0; n < 9; n++) {
          c.fillStyle = ["#6a8b80", "#ab9972", "#865e52"][n % 3];
          c.fillRect(x + 10 + n * 19, y, 13, 35);
        }
    }
  if (["prison", "tomb"].includes(id))
    for (let x = 300; x < w; x += 350) {
      arch(c, x, 300, 150, 350, "#243a40", "#849085");
      for (let n = x + 15; n < x + 150; n += 20)
        line(
          c,
          [
            [n, 330],
            [n, 650],
          ],
          "#737e74",
          4,
        );
    }
  if (["treasury", "hourglass", "sunset"].includes(id)) {
    const x = id === "treasury" ? 1600 : 1700,
      y = 170;
    polygon(
      c,
      [
        [x - 80, y],
        [x + 80, y],
        [x + 45, y + 80],
        [x, y + 150],
        [x + 55, y + 240],
        [x + 80, y + 300],
        [x - 80, y + 300],
        [x - 55, y + 240],
        [x, y + 150],
        [x - 45, y + 80],
      ],
      "#9ec6be44",
      "#d9c087",
    );
    line(
      c,
      [
        [x - 95, y],
        [x + 95, y],
      ],
      "#c8ac72",
      10,
    );
    line(
      c,
      [
        [x - 95, y + 300],
        [x + 95, y + 300],
      ],
      "#c8ac72",
      10,
    );
    polygon(
      c,
      [
        [x - 50, y + 30],
        [x + 50, y + 30],
        [x, y + 140],
      ],
      "#d4b77999",
    );
    polygon(
      c,
      [
        [x, y + 180],
        [x + 50, y + 280],
        [x - 50, y + 280],
      ],
      "#d4b77999",
    );
  }
  if (id === "honor") {
    arch(c, 1740, 200, 230, 400, "#b5a081", "#e8c997");
    c.fillStyle = "#72494f";
    c.fillRect(460, 550, 320, 65);
    c.fillStyle = "#d8c4a1";
    c.fillRect(470, 535, 300, 25);
  }
  c.restore();
}
