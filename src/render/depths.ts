import type { CampaignGame } from "../campaign/CampaignGame";
import type { Room } from "../game/types";
import { DEPTHS_IDS } from "../campaign/depthsRooms";
import { ellipse, line, polygon, type Context } from "./shapes";

function text(c: Context, value: string, x: number, y: number) {
  c.font = "16px Georgia";
  c.fillStyle = "#eee3c6";
  c.textAlign = "center";
  c.fillText(value, x, y);
  c.textAlign = "left";
}
function wheel(c: Context, x: number, y: number, done: boolean, label: string) {
  line(
    c,
    [
      [x, y],
      [x, y - 65],
    ],
    "#667975",
    9,
  );
  ellipse(c, x, y - 66, 25, 25, "#253d40");
  c.strokeStyle = done ? "#a7d7bd" : "#d1af76";
  c.lineWidth = 4;
  c.beginPath();
  c.arc(x, y - 66, 25, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    line(
      c,
      [
        [x, y - 66],
        [x + Math.cos(a) * 25, y - 66 + Math.sin(a) * 25],
      ],
      done ? "#a7d7bd" : "#d1af76",
      3,
    );
  }
  text(c, label, x, y - 108);
}
// Opaque room-local walls cover the shared outdoor water backdrop before doors,
// terrain and actors are drawn. Nothing in the simulation depends on this art.
export function drawDepthsBackdrop(c: Context, room: Room) {
  if (!DEPTHS_IDS.includes(room.id)) return;
  const { width, height } = room;
  c.fillStyle = "#152d31";
  c.fillRect(0, 0, width, height);
  for (let y = 50; y < height; y += 72) {
    line(
      c,
      [
        [0, y],
        [width, y],
      ],
      "#52675c55",
      2,
    );
    for (let x = y % 144 ? 0 : 90; x < width; x += 180)
      line(
        c,
        [
          [x, y],
          [x, y + 72],
        ],
        "#71817133",
        2,
      );
  }
  for (let x = 120; x < width; x += 380) {
    c.fillStyle = "#0b2027";
    c.beginPath();
    c.ellipse(x + 80, height / 2, 125, height * 0.43, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#71837366";
    c.lineWidth = 12;
    c.stroke();
    for (let y = 160; y < height - 90; y += 110)
      line(
        c,
        [
          [x - 20, y],
          [x + 180, y],
        ],
        "#3c5755",
        5,
      );
    line(
      c,
      [
        [x + 72, 80],
        [x + 72, height - 100],
      ],
      "#9bc6ab29",
      18,
    );
  }
  polygon(
    c,
    [
      [0, 0],
      [width, 0],
      [width, 90],
      [width * 0.7, 60],
      [width * 0.4, 115],
      [0, 70],
    ],
    "#081d24",
  );
  line(
    c,
    [
      [0, height - 80],
      [width, height - 80],
    ],
    "#819d8566",
    4,
  );
}
export function drawDepthsScenery(c: Context, g: CampaignGame) {
  if (!DEPTHS_IDS.includes(g.room.id)) return;
  // Ribbed, salt-stained pressure vessels identify the descent across rooms.
  for (let x = 90; x < g.room.width; x += 310) {
    line(
      c,
      [
        [x, 90],
        [x, g.room.height - 90],
      ],
      "#112d33aa",
      48,
    );
    line(
      c,
      [
        [x - 8, 90],
        [x - 8, g.room.height - 90],
      ],
      "#82948755",
      3,
    );
    for (let y = 120; y < g.room.height - 100; y += 90) {
      line(
        c,
        [
          [x - 27, y],
          [x + 27, y],
        ],
        "#9d947064",
        7,
      );
      line(
        c,
        [
          [x - 22, y + 7],
          [x + 22, y + 7],
        ],
        "#142d32",
        3,
      );
    }
  }
  if (g.room.id === "depths-well") {
    for (let y = 360; y < 950; y += 150) {
      line(
        c,
        [
          [930, y],
          [1200, y],
        ],
        "#b6c0a566",
        2,
      );
      text(c, `${Math.round((y - 210) / 15)} cubits`, 1110, y - 12);
    }
    text(c, "Three knocks below the tide line", 600, 260);
    text(c, "E · The keeper's depth marks", 530, 735);
  }
  if (g.room.id === "depths-race") {
    polygon(
      c,
      [
        [500, 410],
        [930, 410],
        [930, 435],
        [500, 435],
      ],
      "#112b30",
    );
    for (let x = 520; x < 940; x += 65)
      line(
        c,
        [
          [x, 430],
          [x + 25, 670],
        ],
        g.journey.depths.diverted ? "#8ecfbe66" : "#554a4999",
        10,
      );
    wheel(c, 1090, 420, g.journey.depths.diverted, "E · Filter bypass");
    text(c, "Jump + Time Dash →", 350, 230);
    text(c, "Catch floor · ladder west", 650, 660);
  }
  if (g.room.id === "depths-spring") {
    ellipse(c, 760, 641, 290, 12, "#9edccba0");
    for (let x = 580; x < 940; x += 70)
      line(
        c,
        [
          [x, 425],
          [x + 5, 620],
        ],
        "#b6e8d369",
        3,
      );
    text(c, "For whoever comes thirsty", 760, 300);
  }
}
export function drawDepths(c: Context, g: CampaignGame) {
  if (g.room.id === "sluice-reservoir") {
    line(
      c,
      [
        [580, 650],
        [580, 570],
        [740, 570],
        [740, 600],
      ],
      "#9eab8d",
      9,
    );
    for (let i = 0; i < 3; i++) ellipse(c, 570 + i * 12, 568, 3, 3, "#e6c78b");
    text(c, "E · Three knocks", 580, 542);
    text(c, "Cracked hatch ↓", 740, 620);
    return;
  }
  if (g.room.id !== "depths-heart") return;
  const s = g.journey.depths;
  // The keeper is part of the spring's machinery, not an ordinary farming enemy.
  polygon(
    c,
    [
      [700, 740],
      [720, 390],
      [760, 340],
      [840, 340],
      [880, 390],
      [900, 740],
    ],
    "#526c66",
    "#bfa476",
  );
  polygon(
    c,
    [
      [740, 390],
      [800, 360],
      [860, 390],
      [850, 460],
      [800, 485],
      [750, 460],
    ],
    "#b19b72",
    "#d4c498",
  );
  line(
    c,
    [
      [765, 413],
      [784, 413],
    ],
    s.resolved ? "#638c7e" : "#f1d096",
    5,
  );
  line(
    c,
    [
      [815, 413],
      [834, 413],
    ],
    s.resolved ? "#638c7e" : "#f1d096",
    5,
  );
  for (let y = 510; y < 700; y += 42)
    line(
      c,
      [
        [744, y],
        [856, y],
      ],
      "#18383b",
      11,
    );
  line(
    c,
    [
      [730, 490],
      [665, 580],
      [740, 710],
    ],
    "#b09b75",
    28,
  );
  line(
    c,
    [
      [870, 490],
      [935, 580],
      [860, 710],
    ],
    "#b09b75",
    28,
  );
  ellipse(c, 800, 711, 63, 16, s.resolved ? "#a9ddc6" : "#b39d76");
  if (s.resolved) {
    polygon(
      c,
      [
        [786, 699],
        [814, 699],
        [809, 718],
        [791, 718],
      ],
      "#bb7e57",
    );
    line(
      c,
      [
        [788, 705],
        [808, 711],
      ],
      "#d2c08c",
      2,
    );
  }
  wheel(c, 320, 750, g.depths.active || s.resolved, "E · Clean inlet");
  wheel(c, 600, 500, s.seals > 0, "E · West relief");
  wheel(c, 1340, 500, s.seals > 1, "E · East relief");
  text(
    c,
    s.resolved
      ? "The keeper rests"
      : s.seals === 2
        ? "Both reliefs hold · E at the hand"
        : s.seals === 1
          ? "East relief · watch alternating pipes"
          : "West relief · watch the approach pipe",
    800,
    280,
  );
  text(
    c,
    s.resolved ? "A cup for the next traveler" : "E · The cupped hand",
    800,
    790,
  );
  // Both potential risers stay drawn, so the phase change has a spatial cue.
  for (const x of [570, 1285])
    line(
      c,
      [
        [800, 480],
        [x, 480],
        [x, 750],
      ],
      "#bda57988",
      9,
    );
  const jet = g.depths.jet;
  if (jet) {
    c.strokeStyle = jet.live ? "#ccefe2" : "#e7ba7b";
    c.lineWidth = 3;
    c.setLineDash(jet.warning ? [10, 8] : []);
    c.strokeRect(jet.x, jet.y, jet.w, jet.h);
    c.setLineDash([]);
    if (jet.live) {
      c.fillStyle = "#b7ead5a0";
      c.fillRect(jet.x, jet.y, jet.w, jet.h);
    }
    text(
      c,
      jet.warning ? "Pressure rising" : jet.live ? "Jet" : "Pressure easing",
      jet.x + jet.w / 2,
      jet.y - 22,
    );
  }
}
