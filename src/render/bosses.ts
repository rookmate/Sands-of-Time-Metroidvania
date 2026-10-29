import type { Enemy } from "../game/types";
import { bossLane } from "../game/bosses";
import { line, type Context } from "./shapes";

export function drawBossTell(c: Context, e: Enemy, frozen: boolean) {
  if (e.kind !== "king" && e.kind !== "double") return;
  c.save();
  const x = e.x + e.w / 2,
    feet = e.y + e.h;
  c.font = "bold 16px Georgia";
  c.textAlign = "center";
  if (!e.bossAttack) {
    line(
      c,
      [
        [x, feet - 8],
        [x + e.face * 25, feet - 24],
        [x + e.face * 25, feet - 78],
      ],
      frozen ? "#9ee7e5" : "#ffe0a6",
      4,
    );
    c.fillStyle = "#ffe0a6";
    c.fillText(
      frozen ? "Frozen guard · strike" : "Guard · approach to draw a tell",
      x,
      e.y - 38,
    );
  } else if (e.telegraph > 0) {
    const lane = bossLane(e);
    c.strokeStyle = "#ffe0a6";
    c.lineWidth = 2;
    c.setLineDash([8, 6]);
    c.strokeRect(lane.x, lane.y, lane.w, lane.h);
    c.setLineDash([]);
    line(
      c,
      [
        [x, feet - 8],
        [x + e.face * 25, feet - 24],
        [x + e.face * 25, feet - 78],
      ],
      frozen ? "#9ee7e5" : "#ffe0a6",
      4,
    );
    const move = e.bossAttack.move;
    const label =
      move === "sweep"
        ? e.bossAttack.followup
          ? "Two sweeps · jump or flank"
          : e.bossAttack.duration === 0.72
            ? "Second sweep · jump or stay behind"
            : "Low sweep · jump or flank"
        : move === "high"
          ? "High bolt · stay low"
          : "Low bolt · jump";
    c.fillStyle = "#14282be8";
    c.fillRect(x - 165, e.y - 58, 330, 28);
    c.fillStyle = "#ffe0a6";
    c.fillText(label, x, e.y - 38);
    c.font = "14px Georgia";
    c.fillText(
      frozen ? "Frozen guard · strike" : "Front guarded · wait or flank",
      x,
      e.y - 66,
    );
    c.fillStyle = "#14282b";
    c.fillRect(x - 32, e.y - 22, 64, 5);
    c.fillStyle = "#ffe0a6";
    c.fillRect(
      x - 32,
      e.y - 22,
      64 * Math.max(0, 1 - e.telegraph / e.bossAttack.duration),
      5,
    );
  } else {
    line(
      c,
      [
        [x - 26, feet - 5],
        [x, feet - 1],
        [x + 26, feet - 5],
      ],
      "#b8f0db",
      3,
    );
    c.fillStyle = "#14282be8";
    c.fillRect(x - 95, e.y - 51, 190, 27);
    c.fillStyle = "#c2f6e2";
    c.fillText("Opening · strike", x, e.y - 32);
  }
  c.restore();
}
