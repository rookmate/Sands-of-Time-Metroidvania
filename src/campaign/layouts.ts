import type { Grip, Platform, Vec } from "../game/types";
import type { Layout } from "./types";
const p = (x: number, y: number, w: number, h = 24): Platform => ({
  x,
  y,
  w,
  h,
  oneWay: h <= 30,
});
export interface Geometry {
  width: number;
  height: number;
  platforms: Platform[];
  entry: Vec;
  exit: Vec;
  grips: Grip[];
}
export function geometry(layout: Layout): Geometry {
  const base: Geometry = {
    width: 2200,
    height: 800,
    platforms: [p(0, 650, 2200, 150)],
    entry: { x: 100, y: 650 },
    exit: { x: 2100, y: 650 },
    grips: [],
  };
  switch (layout) {
    case "hall":
      return base;
    case "courtyard":
      return {
        ...base,
        platforms: [
          p(0, 650, 850, 150),
          p(980, 650, 1220, 150),
          p(520, 535, 180),
          p(790, 455, 200),
          p(1100, 525, 170),
          p(1450, 495, 200),
        ],
      };
    case "terraces":
      return {
        ...base,
        platforms: [
          p(0, 650, 500, 150),
          p(640, 650, 330, 150),
          p(1100, 650, 1100, 150),
          p(330, 530, 180),
          p(590, 430, 200),
          p(870, 350, 210),
          p(1150, 450, 180),
          p(1430, 530, 150),
        ],
      };
    case "tower":
    case "descent": {
      const tower = {
        ...base,
        width: 1280,
        height: 1510,
        platforms: [
          p(0, 1370, 1280, 140),
          p(230, 1240, 230),
          p(530, 1110, 220),
          p(820, 980, 200),
          p(550, 850, 200),
          p(270, 720, 220),
          p(540, 590, 210),
          p(820, 460, 210),
          p(1090, 330, 190),
        ],
        entry: { x: 100, y: 1370 },
        exit: { x: 1160, y: 330 },
      };
      return layout === "tower"
        ? tower
        : { ...tower, entry: tower.exit, exit: tower.entry };
    }
    case "library":
      return {
        ...base,
        exit: { x: 2100, y: 300 },
        platforms: [
          ...base.platforms,
          p(370, 520, 180),
          p(620, 400, 180),
          p(920, 300, 1280),
        ],
      };
    case "bridge":
      return {
        ...base,
        platforms: [
          p(0, 650, 380, 150),
          p(700, 570, 320, 230),
          p(1400, 650, 800, 150),
          p(340, 520, 160),
          p(1050, 430, 180),
        ],
      };
    case "drawbridge":
      return {
        ...base,
        platforms: [p(0, 650, 850, 150), p(1280, 650, 920, 150)],
      };
    case "ferry":
      return {
        ...base,
        height: 950,
        entry: { x: 100, y: 710 },
        exit: { x: 2100, y: 710 },
        platforms: [
          p(0, 710, 470, 240),
          p(760, 710, 400, 240),
          p(1450, 710, 750, 240),
          {
            ...p(490, 620, 170),
            kind: "moving",
            axis: "x",
            range: 160,
            speed: 1.5,
          },
          p(930, 575, 200),
          {
            ...p(1170, 530, 170),
            kind: "moving",
            axis: "y",
            range: 100,
            speed: 1.2,
          },
          p(1450, 430, 300),
        ],
      };
    case "swing":
      return {
        ...base,
        platforms: [p(0, 650, 420, 150), p(1780, 650, 420, 150)],
        grips: [450, 690, 930, 1170, 1410, 1650].map((x, i) => ({
          id: `swing-${i}`,
          kind: i % 2 ? "rope" : "bar",
          x,
          y: [460, 410, 390, 410, 450, 480][i],
          length: 220,
        })),
      };
    case "ladder":
      return {
        ...base,
        height: 1100,
        entry: { x: 100, y: 950 },
        exit: { x: 2100, y: 350 },
        platforms: [
          p(0, 950, 600, 150),
          p(450, 750, 440),
          p(830, 550, 460),
          p(1250, 350, 950),
        ],
        grips: [
          { id: "ladder-0", kind: "ladder", x: 510, y: 750, length: 200 },
          { id: "ladder-1", kind: "ladder", x: 860, y: 550, length: 200 },
          { id: "ladder-2", kind: "ladder", x: 1280, y: 350, length: 200 },
        ],
      };
    case "prison":
      return {
        ...base,
        exit: { x: 2100, y: 350 },
        platforms: [...base.platforms, p(1330, 350, 870)],
      };
    case "elevator":
      return {
        ...base,
        exit: { x: 2100, y: 410 },
        platforms: [
          p(0, 650, 300, 150),
          p(1800, 410, 400, 390),
          p(110, 530, 130),
          p(270, 410, 140),
        ],
      };
  }
}
