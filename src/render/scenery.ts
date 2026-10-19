import type { Room, Platform } from "../game/types";
import { arch, ellipse, line, polygon, seeded, type Context } from "./shapes";
export interface Palette {
  sky: string[];
  far: string;
  middle: string;
  stone: string;
  light: string;
  dark: string;
  teal: string;
  foliage: string;
}
export const PALETTES: Record<Room["theme"], Palette> = {
  palace: {
    sky: ["#727f81", "#c9b99b", "#e5c69a"],
    far: "#a49f8c",
    middle: "#7e8c84",
    stone: "#a49778",
    light: "#d7c29a",
    dark: "#4a5a55",
    teal: "#3c7774",
    foliage: "#314f42",
  },
  garden: {
    sky: ["#6c9193", "#b9c7ad", "#e6cf9f"],
    far: "#9cae95",
    middle: "#728d7c",
    stone: "#a7a083",
    light: "#dfcda3",
    dark: "#485c50",
    teal: "#407f7a",
    foliage: "#345c42",
  },
  tower: {
    sky: ["#5b7b88", "#b3b9a4", "#e4c28b"],
    far: "#94a5a0",
    middle: "#677f7e",
    stone: "#a49272",
    light: "#dbbf91",
    dark: "#515c57",
    teal: "#427e83",
    foliage: "#475d46",
  },
  water: {
    sky: ["#253c49", "#527c7e", "#89aaa0"],
    far: "#587b79",
    middle: "#3b6264",
    stone: "#7e9386",
    light: "#bdd0b2",
    dark: "#344e50",
    teal: "#37958a",
    foliage: "#315d4e",
  },
  corrupt: {
    sky: ["#333c50", "#7c797e", "#b29b8a"],
    far: "#777b7f",
    middle: "#566570",
    stone: "#7d8079",
    light: "#b9ada0",
    dark: "#343f4b",
    teal: "#516b7f",
    foliage: "#414c58",
  },
  throne: {
    sky: ["#556d7c", "#d1b69e", "#f7dba9"],
    far: "#a69c91",
    middle: "#7f8c89",
    stone: "#ad9a7c",
    light: "#e2cca0",
    dark: "#4e5a5b",
    teal: "#457f7e",
    foliage: "#4a5b46",
  },
};
function dome(
  c: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.bezierCurveTo(
    x - w * 0.6,
    y - h * 0.5,
    x - w * 0.18,
    y - h * 0.65,
    x,
    y - h,
  );
  c.bezierCurveTo(
    x + w * 0.18,
    y - h * 0.65,
    x + w * 0.6,
    y - h * 0.5,
    x + w / 2,
    y,
  );
  c.closePath();
  c.fillStyle = color;
  c.fill();
  line(
    c,
    [
      [x, y - h],
      [x, y - h - 20],
    ],
    color,
    2,
  );
  ellipse(c, x, y - h - 22, 3, 3, color);
}
export function skyline(
  c: Context,
  width: number,
  palette: Palette,
  seed: number,
  depth: number,
) {
  const random = seeded(seed);
  const base = 580;
  for (let x = -180; x < width + 200; x += 110 + random() * 90) {
    const w = 90 + random() * 130,
      h = 80 + random() * 170;
    const y = base - h;
    c.fillStyle = depth === 0 ? palette.far : palette.middle;
    c.fillRect(x, y, w, h + 240);
    if (random() > 0.4)
      dome(
        c,
        x + w / 2,
        y,
        w * 1.06,
        65 + random() * 60,
        c.fillStyle as string,
      );
    else for (let bx = x; bx < x + w; bx += 16) c.fillRect(bx, y - 10, 9, 12);
    c.fillStyle = depth === 0 ? "#667b761a" : "#203e3d22";
    for (let wx = x + 16; wx < x + w - 10; wx += 26)
      for (let wy = y + 30; wy < base; wy += 52)
        arch(c, wx, wy, 12, 30, c.fillStyle as string);
    if (random() > 0.45) {
      const mx = x + w - 15,
        mh = h + 90 + random() * 70;
      c.fillStyle = depth === 0 ? palette.far : palette.middle;
      c.fillRect(mx, base - mh, 24, mh);
      c.fillRect(mx - 7, base - mh + 30, 38, 6);
      c.fillRect(mx - 5, base - mh + 45, 34, 5);
      dome(c, mx + 12, base - mh, 32, 35, c.fillStyle as string);
    }
  }
}
function leaves(
  c: Context,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  seed: number,
) {
  const random = seeded(seed);
  for (let i = 0; i < width / 9; i++) {
    const lx = x + random() * width,
      length = random() * height;
    line(
      c,
      [
        [lx, y],
        [lx - 8, y + length * 0.6],
        [lx + 3, y + length],
      ],
      color,
      1.3,
    );
    for (let ly = 0; ly < length; ly += 11) {
      const offset = random() * 6;
      ellipse(c, lx - offset - 3, y + ly, 5.5, 2.7, color);
      ellipse(c, lx - offset + 4, y + ly + 5, 5, 2.5, color);
    }
  }
}
function column(
  c: Context,
  x: number,
  y: number,
  height: number,
  palette: Palette,
  w = 44,
) {
  const gradient = c.createLinearGradient(x, 0, x + w, 0);
  gradient.addColorStop(0, palette.dark);
  gradient.addColorStop(0.3, palette.stone);
  gradient.addColorStop(0.5, palette.light);
  gradient.addColorStop(1, palette.stone);
  c.fillStyle = gradient;
  c.fillRect(x + 5, y, w - 10, height);
  c.fillStyle = palette.light;
  c.fillRect(x - 8, y, w + 16, 8);
  c.fillRect(x - 3, y + 12, w + 6, 8);
  c.fillStyle = palette.dark;
  c.fillRect(x - 6, y + height - 20, w + 12, 10);
  c.fillStyle = palette.light;
  c.fillRect(x - 12, y + height - 10, w + 24, 10);
  line(
    c,
    [
      [x + w * 0.5, y + 28],
      [x + w * 0.5, y + height - 30],
    ],
    "#f1dbb52b",
  );
  c.fillStyle = palette.teal;
  c.fillRect(x + 2, y + 32, w - 4, 16);
  c.fillRect(x + 2, y + height - 48, w - 4, 12);
  for (let n = 7; n < w; n += 9)
    polygon(
      c,
      [
        [x + n, y + 35],
        [x + n + 3, y + 40],
        [x + n, y + 45],
        [x + n - 3, y + 40],
      ],
      palette.light,
    );
}
function arcade(c: Context, room: Room, palette: Palette) {
  const y = room.height > 1000 ? 330 : 290;
  const base = room.height > 1000 ? room.height - 120 : 650;
  c.fillStyle = palette.dark + "32";
  c.fillRect(0, y - 40, room.width, base - y + 160);
  for (let x = -120; x < room.width + 250; x += 250) {
    arch(c, x, y - 26, 220, base - y + 30, palette.stone, palette.light);
    arch(
      c,
      x + 14,
      y - 10,
      192,
      base - y + 15,
      palette.dark,
      palette.light + "80",
    );
    // Open arches reveal the independently scrolling city behind the courtyard.
    c.save();
    c.globalCompositeOperation = "destination-out";
    arch(c, x + 24, y + 4, 172, base - y, "#000");
    c.restore();
    arch(
      c,
      x + 24,
      y + 4,
      172,
      base - y,
      room.theme === "water" ? "#183b4590" : "#203e4226",
    );
    c.save();
    c.globalAlpha = 0.25;
    arch(c, x + 36, y + 58, 148, base - y - 58, "transparent", palette.light);
    arch(c, x + 43, y + 68, 134, base - y - 68, "transparent", palette.light);
    c.restore();
    column(c, x - 21, y + 68, base - y - 68, palette, 43);
    c.strokeStyle = palette.light + "4a";
    c.lineWidth = 1;
    for (let sy = y + 98; sy < base - 20; sy += 27)
      line(
        c,
        [
          [x + 30, sy],
          [x + 182, sy],
        ],
        palette.dark + "32",
      );
    if (room.theme === "garden" || x % 500 === 130)
      leaves(c, x - 20, y + 40, 90, 200, palette.foliage, x + 500);
  }
  c.fillStyle = palette.stone;
  c.fillRect(0, y - 62, room.width, 25);
  c.fillStyle = palette.light;
  c.fillRect(0, y - 64, room.width, 4);
  c.fillRect(0, y - 38, room.width, 4);
  c.fillStyle = palette.teal;
  c.fillRect(0, y - 56, room.width, 14);
  for (let x = 0; x < room.width; x += 22)
    polygon(
      c,
      [
        [x, y - 49],
        [x + 7, y - 55],
        [x + 14, y - 49],
        [x + 7, y - 43],
      ],
      "#d0b78666",
    );
}
export function buildBackdrop(room: Room): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = room.width;
  canvas.height = room.height;
  const c = canvas.getContext("2d")!;
  const palette = PALETTES[room.theme];
  arcade(c, room, palette);
  // Silk standards, ropes, lamps, and tiled screens.
  for (let x = 200; x < room.width; x += 500) {
    const top = room.height > 1000 ? 80 : 70;
    line(
      c,
      [
        [x, top],
        [x, top + 180],
      ],
      palette.dark,
      2,
    );
    polygon(
      c,
      [
        [x - 27, top + 16],
        [x + 27, top + 16],
        [x + 25, top + 180],
        [x, top + 205],
        [x - 25, top + 180],
      ],
      room.theme === "corrupt" ? "#584953" : "#416f70",
    );
    line(
      c,
      [
        [x - 21, top + 23],
        [x - 20, top + 176],
        [x, top + 195],
        [x + 20, top + 176],
        [x + 21, top + 23],
      ],
      "#c6af7966",
    );
    polygon(
      c,
      [
        [x, top + 65],
        [x + 14, top + 90],
        [x, top + 115],
        [x - 14, top + 90],
      ],
      "#d8bd8166",
    );
  }
  if (room.theme === "water") {
    for (let x = 80; x < room.width; x += 360) {
      arch(c, x, 35, 180, 170, "#263f49", "#8ba69b");
      for (let bx = x + 15; bx < x + 175; bx += 18)
        line(
          c,
          [
            [bx, 90],
            [bx, 205],
          ],
          "#709b9630",
          3,
        );
    }
  }
  if (room.id === "observatory") {
    c.strokeStyle = "#ccb986";
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.ellipse(760, 240, 100, 100 - i * 22, i * 0.5, 0, Math.PI * 2);
      c.stroke();
    }
    ellipse(c, 760, 240, 20, 20, "#bca66d");
    line(
      c,
      [
        [760, 120],
        [760, 365],
      ],
      "#bca66d",
      5,
    );
  }
  if (room.id === "throne") {
    arch(c, 1070, 90, 330, 560, "#b5a184", "#e6c98e");
    arch(c, 1095, 112, 280, 540, "#3b5658", "#d2bd8f");
    polygon(
      c,
      [
        [1180, 620],
        [1180, 435],
        [1235, 380],
        [1290, 435],
        [1290, 620],
      ],
      "#af9365",
      "#e0c798",
    );
    c.fillStyle = "#566970";
    c.fillRect(1194, 455, 82, 135);
    c.fillStyle = "#af9365";
    c.fillRect(1150, 590, 170, 25);
    c.fillRect(1130, 625, 210, 25);
  }
  return canvas;
}
export function drawPlatform(
  c: Context,
  p: Platform,
  palette: Palette,
  seed: number,
) {
  const random = seeded(seed + 754);
  const fill = c.createLinearGradient(0, p.y, 0, p.y + Math.min(p.h, 170));
  fill.addColorStop(0, palette.stone);
  fill.addColorStop(1, palette.dark);
  c.fillStyle = fill;
  c.fillRect(p.x, p.y, p.w, p.h);
  if (p.h > 60) {
    c.strokeStyle = "#162b2d35";
    c.lineWidth = 1;
    for (let y = p.y + 32, row = 0; y < p.y + p.h; y += 36, row++) {
      line(
        c,
        [
          [p.x, y],
          [p.x + p.w, y],
        ],
        "#152e2c38",
      );
      for (let x = p.x + (row % 2 ? 35 : 0); x < p.x + p.w; x += 75)
        line(
          c,
          [
            [x, y],
            [x, Math.min(y + 36, p.y + p.h)],
          ],
          "#243e3738",
        );
    }
    for (let i = 0; i < (p.w * p.h) / 700; i++) {
      const x = p.x + random() * p.w,
        y = p.y + random() * p.h;
      c.fillStyle = random() > 0.5 ? "#f6d7a315" : "#0a252719";
      c.fillRect(x, y, 1 + random() * 8, 1 + random() * 2);
    }
  }
  c.fillStyle = palette.dark;
  c.fillRect(p.x - 3, p.y + 9, p.w + 6, 7);
  c.fillStyle = palette.teal;
  c.fillRect(p.x, p.y + 17, p.w, 10);
  for (let x = p.x + 9; x < p.x + p.w - 6; x += 21) {
    polygon(
      c,
      [
        [x, p.y + 18],
        [x + 5, p.y + 22],
        [x, p.y + 26],
        [x - 5, p.y + 22],
      ],
      "#cfb88288",
    );
  }
  c.fillStyle = palette.light;
  c.fillRect(p.x - 5, p.y, p.w + 10, 5);
  c.fillStyle = "#e9d9ad";
  c.globalAlpha = 0.5;
  c.fillRect(p.x, p.y, p.w, 1);
  c.globalAlpha = 1;
  if (p.h <= 30) {
    polygon(
      c,
      [
        [p.x + 12, p.y + p.h],
        [p.x + 32, p.y + p.h + 28],
        [p.x + 52, p.y + p.h],
      ],
      palette.dark,
    );
    polygon(
      c,
      [
        [p.x + p.w - 52, p.y + p.h],
        [p.x + p.w - 32, p.y + p.h + 28],
        [p.x + p.w - 12, p.y + p.h],
      ],
      palette.dark,
    );
  }
  if (p.kind !== "moving" && p.w > 100 && random() > 0.3)
    leaves(
      c,
      p.x + p.w * 0.65,
      p.y + 2,
      Math.min(70, p.w * 0.3),
      60,
      palette.foliage,
      seed + 18,
    );
}
export function drawPalm(
  c: Context,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  polygon(
    c,
    [
      [-7, 0],
      [4, -105],
      [14, -183],
      [21, -180],
      [15, -100],
      [8, 0],
    ],
    color,
  );
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i * Math.PI) / 8;
    const ex = 15 + Math.cos(a) * 103,
      ey = -178 + Math.sin(a) * 54 + 25;
    c.beginPath();
    c.moveTo(16, -180);
    c.quadraticCurveTo(15 + Math.cos(a) * 70, -220 + Math.sin(a) * 35, ex, ey);
    c.quadraticCurveTo(
      15 + Math.cos(a) * 54,
      -182 + Math.sin(a) * 30,
      16,
      -180,
    );
    c.fillStyle = color;
    c.fill();
    for (let n = 1; n < 9; n++) {
      const t = n / 10,
        lx = 16 + (ex - 16) * t,
        ly = -180 + (ey + 180) * t - Math.sin(t * Math.PI) * 24;
      line(
        c,
        [
          [lx, ly],
          [lx + Math.cos(a) * 15, ly + 22],
        ],
        color,
        2,
      );
    }
  }
  c.restore();
}
