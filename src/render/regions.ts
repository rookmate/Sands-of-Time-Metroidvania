import { BATHS_IDS } from "../campaign/baths";
import { DEPTHS_IDS } from "../campaign/depthsRooms";
import { WING_IDS, type WingEra } from "../campaign/eraWing";
import type { Room } from "../game/types";
import { arch, ellipse, line, polygon, type Context } from "./shapes";

// This selects art only. Room identity, connections and collision stay in world.ts.
export function regionArt(room: Room) {
  if (DEPTHS_IDS.includes(room.id)) return "depths";
  if (WING_IDS.includes(room.id)) return "wing";
  if (
    BATHS_IDS.includes(room.id) ||
    ["crown-baths", "spillway", "valve-loft"].includes(room.id)
  )
    return "baths";
  if (
    [
      "prison",
      "prison-cells",
      "chain-shaft",
      "warden-loft",
      "crown-warden",
    ].includes(room.id)
  )
    return "prison";
  if (["orrery", "observatory", "lens-roof", "archive-stair"].includes(room.id))
    return "observatory";
  return "palace";
}

function ring(
  c: Context,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
  width = 2,
  angle = 0,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

// Baked into the renderer's existing four-entry backdrop cache, including era.
export function drawRegionArchitecture(c: Context, room: Room, era: WingEra) {
  const region = regionArt(room),
    w = room.width,
    h = room.height;
  if (region === "depths") return; // Its existing enclosed pressure vessels remain.
  if (region === "palace") {
    // Sun-cut plaster belongs to the main palace, including the restored Hall.
    if (room.theme === "palace" || room.theme === "throne")
      for (let x = 120; x < w; x += 500) {
        ring(c, x, 140, 46, 46, "#dbc39166", 3);
        for (let n = 0; n < 12; n++) {
          const a = (n * Math.PI) / 6;
          line(
            c,
            [
              [x + Math.cos(a) * 30, 140 + Math.sin(a) * 30],
              [x + Math.cos(a) * 40, 140 + Math.sin(a) * 40],
            ],
            "#dbc39166",
            2,
          );
        }
        polygon(
          c,
          [
            [x, 119],
            [x + 15, 140],
            [x, 161],
            [x - 15, 140],
          ],
          "#b2946355",
        );
      }
    return;
  }
  const wall =
    region === "baths"
      ? "#25494c"
      : region === "prison"
        ? "#252f36"
        : region === "observatory"
          ? "#202e41"
          : era === "intact"
            ? "#756a56"
            : "#393e3d";
  c.fillStyle = wall;
  c.fillRect(0, 0, w, h);
  if (region === "baths") {
    // Glazed lower tiles, scalloped plaster vaults and round roof lights.
    for (let y = 300; y < h; y += 64)
      for (let x = 0; x < w; x += 128) {
        c.fillStyle = (x / 128 + y / 64) % 2 < 1 ? "#345a5966" : "#39605b55";
        c.fillRect(x + 2, y + 2, 124, 60);
        line(
          c,
          [
            [x + 46, y + 32],
            [x + 64, y + 14],
            [x + 82, y + 32],
            [x + 64, y + 50],
            [x + 46, y + 32],
          ],
          "#8eb19c30",
        );
      }
    for (let x = 80; x < w; x += 340) {
      arch(c, x - 90, -70, 300, 370, "#516c65", "#9ca88a");
      arch(c, x - 74, -52, 268, 330, wall);
      ellipse(c, x + 60, 145, 44, 44, "#0f3039");
      ring(c, x + 60, 145, 50, 50, "#a8b69a", 8);
      ring(c, x + 60, 145, 37, 37, "#739d93", 2);
      polygon(
        c,
        [
          [x + 25, 175],
          [x + 95, 175],
          [x + 230, 560],
          [x - 70, 560],
        ],
        "#9ed9c00b",
      );
      line(
        c,
        [
          [x + 60, 104],
          [x + 60, 186],
        ],
        "#849c81",
        3,
      );
    }
    c.fillStyle = "#9da38755";
    c.fillRect(0, 295, w, 7);
  } else if (region === "prison") {
    for (let x = 50; x < w; x += 310) {
      c.fillStyle = "#151f26";
      c.fillRect(x, 55, 220, h - 55);
      for (let bx = x + 12; bx < x + 220; bx += 27)
        line(
          c,
          [
            [bx, 55],
            [bx, h],
          ],
          "#435051",
          5,
        );
      for (const y of [110, 290])
        line(
          c,
          [
            [x - 12, y],
            [x + 232, y],
          ],
          "#53605a",
          14,
        );
      polygon(
        c,
        [
          [x - 30, 0],
          [x + 2, 0],
          [x + 2, 340],
          [x - 30, 380],
        ],
        "#647067",
      );
      for (let y = 40; y < 330; y += 70) ellipse(c, x - 14, y, 4, 4, "#a69572");
      // Heavy suspension chains end above the playable floor.
      for (let y = 15; y < 230; y += 20)
        ring(c, x + 140, y, 6, 13, "#8e876c66", 3);
    }
  } else if (region === "observatory") {
    const cx = w / 2;
    // An open dome and calibrated brass ribs, rather than another courtyard.
    ellipse(c, cx, 110, Math.min(w * 0.46, 750), 270, "#111f32");
    for (let i = 0; i < 65; i++)
      ellipse(
        c,
        35 + ((i * 173) % (w - 70)),
        28 + ((i * 47) % 225),
        i % 7 === 0 ? 2 : 1,
        1,
        "#d4d6b780",
      );
    for (let x = 100; x < w; x += 320) {
      line(
        c,
        [
          [cx, -220],
          [x, 310],
        ],
        "#8d8e7255",
        5,
      );
      arch(c, x - 70, 340, 160, h - 340, "#2b3c4b", "#56666a");
      arch(c, x - 56, 358, 132, h - 358, "#182c3a");
    }
    line(
      c,
      [
        [0, 310],
        [w, 310],
      ],
      "#a2916855",
      12,
    );
  } else {
    // Same mural and niches in both moments. Missing plaster exposes the ribs.
    for (let x = 70; x < w; x += 300) {
      arch(
        c,
        x,
        70,
        220,
        480,
        era === "intact" ? "#918269" : "#4c514c",
        "#b6a17b66",
      );
      arch(c, x + 18, 88, 184, 445, era === "intact" ? "#5f6a61" : "#283c3c");
      ring(c, x + 110, 208, 58, 58, "#cbb78888", 3);
      polygon(
        c,
        [
          [x + 110, 154],
          [x + 153, 208],
          [x + 110, 262],
          [x + 67, 208],
        ],
        "#bfa77a44",
      );
      if (era === "ruined") {
        polygon(
          c,
          [
            [x - 5, 70],
            [x + 75, 70],
            [x + 46, 164],
            [x + 89, 204],
            [x + 25, 294],
            [x - 5, 352],
          ],
          wall,
        );
        line(
          c,
          [
            [x + 142, 275],
            [x + 125, 324],
            [x + 149, 366],
            [x + 130, 439],
          ],
          "#142b2d",
          4,
        );
      }
    }
  }
}

// Only background motion, drawn before doors, collision surfaces and all actors.
// At most six motifs are evaluated per frame, regardless of room dimensions.
export function drawRegionMotion(
  c: Context,
  room: Room,
  era: WingEra,
  time: number,
  cameraX: number,
  drained: boolean,
) {
  const region = regionArt(room);
  c.save();
  if (region === "observatory") {
    const x = room.width / 2,
      y = 205;
    for (let i = 0; i < 3; i++) {
      const a = time * 0.07 + i * 1.04,
        tilt = Math.sin(a) * 0.35,
        px = Math.cos(a) * (170 - i * 25),
        py = Math.sin(a) * (38 + i * 18);
      ring(c, x, y, 170 - i * 25, 38 + i * 18, "#c4ac7666", 3, tilt);
      ellipse(
        c,
        x + px * Math.cos(tilt) - py * Math.sin(tilt),
        y + px * Math.sin(tilt) + py * Math.cos(tilt),
        7,
        7,
        "#cab785",
      );
    }
    line(
      c,
      [
        [x, 80],
        [x, 330],
      ],
      "#8b8b70",
      4,
    );
    ellipse(c, x, y, 15, 15, "#b9ab79");
  }
  for (
    let x = Math.max(0, Math.floor(cameraX / 340) * 340);
    x < Math.min(room.width, cameraX + 1450);
    x += 340
  ) {
    if (region === "baths") {
      const rise = (time * 14 + x * 0.13) % 90;
      for (let i = 0; i < 3; i++) {
        ellipse(
          c,
          x + 90 + Math.sin(time * 0.4 + i) * 14,
          530 - rise - i * 30,
          52 + i * 12,
          10,
          drained ? "#c1dcc00a" : "#c1dcc017",
        );
        line(
          c,
          [
            [x + 35 + i * 15, 365 + i * 30],
            [x + 155 - i * 10, 365 + i * 30 + Math.sin(time + i) * 3],
          ],
          "#9ddbc51c",
          3,
        );
      }
    } else if (region === "prison") {
      c.save();
      c.translate(x + 155, 180);
      c.rotate(time * 0.09);
      ring(c, 0, 0, 64, 64, "#9c936c66", 9);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        line(
          c,
          [
            [Math.cos(a) * 15, Math.sin(a) * 15],
            [Math.cos(a) * 62, Math.sin(a) * 62],
          ],
          "#9c936c66",
          7,
        );
      }
      ellipse(c, 0, 0, 13, 13, "#58615a");
      c.restore();
    } else if (region === "wing" && era === "intact") {
      const sway = Math.sin(time * 0.6 + x) * 5;
      polygon(
        c,
        [
          [x + 90, 70],
          [x + 140, 70],
          [x + 140 + sway, 280],
          [x + 115 + sway, 300],
          [x + 90 + sway, 280],
        ],
        "#966b5266",
        "#c4a67766",
      );
    } else if (region === "depths") {
      // Small beads on the pressure vessels, well away from the guardian's jets.
      const drop = (time * 24 + x * 0.3) % 210;
      ellipse(c, x + 110, 160 + drop, 2, 5, "#a0cbb15c");
      ring(c, x + 110, 380, 9 + drop * 0.03, 2, "#a0cbb126");
    }
  }
  c.restore();
}
