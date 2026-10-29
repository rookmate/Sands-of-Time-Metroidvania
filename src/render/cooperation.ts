import type { CampaignGame } from "../campaign/CampaignGame";
import { cooperationStatus, FARAH_STAIR } from "../campaign/cooperation";
import { ellipse, line, type Context } from "./shapes";

export function drawCooperation(c: Context, g: CampaignGame, time: number) {
  const id = g.room.id,
    s = g.journey.cooperation;
  if (!["bathworks", "spillway", "valve-loft"].includes(id)) return;
  c.save();
  c.font = "14px Georgia";
  c.fillStyle = "#f0dfb6";
  if (id === "bathworks") {
    line(
      c,
      FARAH_STAIR.map((v) => [v.x, v.y - 5]),
      "#b69d6b",
      4,
    );
    for (const point of FARAH_STAIR) c.fillRect(point.x - 22, point.y, 44, 9);
    c.fillStyle = "#192e32";
    c.fillRect(1078, 225, 44, 85);
    c.fillStyle = "#f0dfb6";
    c.fillText("Farah's narrow service stair → valve loft", 660, 235);
    c.fillText(
      s.phase === "idle"
        ? "Interact: ask Farah here"
        : "Service stair to the valve loft",
      660,
      560,
    );
    c.fillText("Bell spillway →", 1020, 575);
  }
  if (id === "spillway") {
    c.fillStyle = "#455858";
    c.fillRect(945, 642, 45, 8);
    const active = Math.sin((g.worldTime * Math.PI * 2) / 3) > 0.3;
    for (let n = 0; n < 5; n++)
      ellipse(
        c,
        967 + Math.sin(time * 2 + n) * 8,
        630 - n * 12,
        20,
        9,
        active ? "#e3dbb36b" : "#c4cebe18",
      );
    // Bell pipes rise toward the adjoining loft. Raised spans use the same color.
    for (const [x, y, label] of [
      [220, 650, "1 · Raise step"],
      [700, 420, "2 · Span · 8s"],
    ] as const) {
      line(
        c,
        [
          [x, y - 65],
          [x, 230],
          [1200, 230],
        ],
        "#b69d6b",
        3,
      );
      ellipse(c, x, y - 60, 17, 19, "#d1b881");
      line(
        c,
        [
          [x, y - 40],
          [x, y - 5],
        ],
        "#d1b881",
        2,
      );
      c.fillStyle = "#f0dfb6";
      c.fillText(label, x - 45, y - 95);
    }
    c.fillText("Bell pipe → Farah's valve loft", 870, 210);
    c.fillText("Upper bell resets the whole crossing window", 540, 315);
    c.fillText(
      s.remaining > 0
        ? `Span held: ${s.remaining.toFixed(1)}s`
        : ["crossed", "reunited"].includes(s.phase)
          ? "Bridge latched permanently"
          : "Span lowered · ring upper bell",
      790,
      380,
    );
    line(
      c,
      [
        [1060, 420],
        [1060, 355],
        [1085, 340],
      ],
      "#d1b881",
      5,
    );
    c.fillText("Interact: latch", 1020, 310);
    if (["primed", "crossed", "reunited"].includes(s.phase))
      line(
        c,
        [
          [450, 475],
          [580, 475],
        ],
        "#a4d8be",
        6,
      );
    if (s.remaining > 0 || ["crossed", "reunited"].includes(s.phase))
      line(
        c,
        [
          [790, 420],
          [950, 420],
        ],
        "#a4d8be",
        6,
      );
    c.fillText("Steam vent", 925, 555);
  }
  if (id === "valve-loft") {
    line(
      c,
      [
        [0, 300],
        [650, 300],
        [650, 650],
      ],
      "#b69d6b",
      10,
    );
    ellipse(c, 650, 570, 34, 34, "#455858");
    c.fillStyle = "#f0dfb6";
    c.fillText("Farah's spillway valve", 555, 495);
    c.fillText("Reservoir service shortcut →", 960, 560);
  }
  // A fixed caption remains visible when the transient dialogue clears.
  c.font = "13px Georgia";
  c.fillStyle = "#f0dfb6";
  c.fillStyle = "#192e32cc";
  c.fillRect(35, 240, 850, 28);
  c.fillStyle = "#f0dfb6";
  c.fillText(cooperationStatus(g), 45, 260);
  c.restore();
}
