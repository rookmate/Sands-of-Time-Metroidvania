import type { CampaignGame } from "../campaign/CampaignGame";
import { MASTERY_GOALS, MASTERY_IDS } from "../campaign/mastery";
import { ellipse, line, type Context } from "./shapes";

export function drawMastery(c: Context, g: CampaignGame) {
  const goal = MASTERY_GOALS[g.room.id];
  if (!goal) {
    if (g.room.id === "garden-court") {
      label(c, "Movement chambers", 660, 550);
      label(c, "Optional · wall / rope / Dash", 660, 572);
    }
    return;
  }
  const solved = g.journey.mastery.solved.includes(g.room.id);
  // Static stripes identify usable faces and a distinct, harmless catch mat.
  c.fillStyle = "#516c67";
  c.fillRect(0, 730, g.room.width, 14);
  for (let x = 0; x < g.room.width; x += 32)
    line(
      c,
      [
        [x, 742],
        [x + 16, 730],
      ],
      "#c4b783",
      3,
    );
  if (g.room.id === "mastery-wall")
    for (let y = 300; y < 650; y += 32)
      line(
        c,
        [
          [520, y],
          [536, y - 12],
        ],
        "#e4ce99",
        4,
      );
  if (g.room.id === "mastery-dash") {
    line(
      c,
      [
        [670, 420],
        [695, 400],
      ],
      "#e4ce99",
      4,
    );
    label(c, "Jump, then Dash", 1080, 170);
  }
  for (const grip of g.grips) {
    ellipse(c, grip.x, grip.y, 14, 14, "#213d43");
    ellipse(c, grip.x, grip.y, 7, 7, "#e4ce99");
  }
  ellipse(c, 310, 642, 25, 8, "#c4b783");
  line(
    c,
    [
      [299, 630],
      [310, 619],
      [321, 630],
    ],
    "#e8e2cf",
    3,
  );
  label(c, "Interact · retry", 310, 590);
  ellipse(c, goal.x, goal.y - 22, 18, 18, solved ? "#9ed8ba" : "#b69d6b");
  if (solved)
    line(
      c,
      [
        [goal.x - 8, goal.y - 22],
        [goal.x, goal.y - 14],
        [goal.x + 9, goal.y - 30],
      ],
      "#213d43",
      3,
    );
  else
    for (let finger = -1; finger <= 1; finger++)
      line(
        c,
        [
          [goal.x + finger * 6, goal.y - 16],
          [goal.x + finger * 6, goal.y - 30],
        ],
        "#213d43",
        3,
      );
  label(
    c,
    solved ? "Seal secured · Interact return" : "Interact · secure seal",
    goal.x,
    goal.y - 67,
  );
  label(c, `${MASTERY_IDS.indexOf(g.room.id) + 1} / 3 · no timer`, 165, 470);
  label(c, "Catch mat: instant retry", 660, 706);
}
function label(c: Context, text: string, x: number, y: number) {
  c.save();
  c.font = "16px Georgia";
  c.textAlign = "center";
  c.fillStyle = "#152c32";
  const width = c.measureText(text).width + 16;
  c.fillRect(x - width / 2, y - 17, width, 24);
  c.fillStyle = "#e8e2cf";
  c.fillText(text, x, y);
  c.restore();
}
