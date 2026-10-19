import type { Enemy, Player } from "../game/types";
import { ellipse, line, polygon, type Context } from "./shapes";
export function drawPrince(
  c: Context,
  player: Player,
  time: number,
  ghost = false,
) {
  const moving = Math.abs(player.vx) > 25 && player.grounded;
  const stride = moving ? Math.sin(time * 15) : 0;
  const airborne = !player.grounded;
  c.save();
  c.translate(player.x + 15, player.y + 28);
  c.scale(player.face, 1);
  if (ghost) {
    c.globalAlpha *= 0.28;
    c.filter = "sepia(1) saturate(3) hue-rotate(110deg)";
  }
  const bob = moving
    ? Math.abs(Math.cos(time * 15)) * 2
    : Math.sin(time * 2.5) * 0.7;
  c.translate(0, bob);
  // Trailing crimson sash is animated separately from the body.
  const tail = Math.sin(time * 8) * 5;
  polygon(
    c,
    [
      [-5, 4],
      [-17, 6],
      [-31 - Math.abs(player.vx) * 0.035, 1 + tail],
      [-46 - Math.abs(player.vx) * 0.03, 7 + tail],
      [-25, 13 + tail],
      [-5, 11],
    ],
    "#9e403c",
  );
  line(
    c,
    [
      [-14, 7],
      [-34, 5 + tail],
    ],
    "#dc7961",
    1,
  );
  // Back leg, front leg, boots.
  const legA = airborne ? -11 : stride * 12,
    legB = airborne ? 9 : -stride * 12;
  line(
    c,
    [
      [-5, 8],
      [-8 + legA, 19],
      [-6 + legA, 29 - Math.max(0, stride) * 4],
    ],
    "#25383f",
    10,
  );
  line(
    c,
    [
      [5, 8],
      [6 + legB, 19],
      [5 + legB, 29 + Math.min(0, stride) * 4],
    ],
    "#314751",
    10,
  );
  line(
    c,
    [
      [-6 + legA, 26],
      [-5 + legA, 29],
      [1 + legA, 29],
    ],
    "#634736",
    7,
  );
  line(
    c,
    [
      [5 + legB, 26],
      [6 + legB, 29],
      [13 + legB, 29],
    ],
    "#79583d",
    7,
  );
  // Tunic, leather crossing, shoulders.
  polygon(
    c,
    [
      [-10, -17],
      [8, -18],
      [12, 3],
      [4, 10],
      [-10, 7],
      [-12, -5],
    ],
    "#e5d9b4",
  );
  polygon(
    c,
    [
      [-10, -15],
      [-3, -16],
      [7, 8],
      [1, 9],
    ],
    "#7a634a",
  );
  line(
    c,
    [
      [5, -12],
      [6, 0],
    ],
    "#fff3ce",
    2,
  );
  polygon(
    c,
    [
      [-11, 3],
      [12, 1],
      [11, 8],
      [-12, 10],
    ],
    "#a94d41",
  );
  c.fillStyle = "#e0be71";
  c.fillRect(1, 3, 4, 5);
  // Arms and sword change with the combat pose.
  const attacking = player.attack > 0;
  const armX = attacking ? 28 : airborne ? 18 : 13 + stride * 5;
  const armY = attacking
    ? player.combo === 2
      ? -20
      : -9
    : airborne
      ? -25
      : -2;
  line(
    c,
    [
      [7, -13],
      [16, -6],
      [armX, armY],
    ],
    "#bf9066",
    7,
  );
  line(
    c,
    [
      [-9, -12],
      [-15, -3],
      [-12 - stride * 7, 5],
    ],
    "#a57450",
    6,
  );
  c.fillStyle = "#526c6c";
  c.fillRect(armX - 3, armY - 4, 5, 7);
  if (attacking) {
    const swing = (0.24 - player.attack) / 0.24;
    c.save();
    c.translate(armX, armY);
    c.rotate(
      player.combo === 2
        ? 1.3 - swing * 2.5
        : -0.9 + swing * (player.combo === 0 ? 3.6 : 2.4),
    );
    polygon(
      c,
      [
        [-2, 3],
        [36, -3],
        [47, -9],
        [36, 3],
        [-2, 8],
      ],
      "#dce9df",
    );
    line(
      c,
      [
        [-2, 0],
        [0, 12],
      ],
      "#d4ad65",
      3,
    );
    c.restore();
    c.beginPath();
    c.ellipse(20, -2, 58, 45, 0, -1.4 + swing, 0.2 + swing);
    c.strokeStyle = "#f1e0ad99";
    c.lineWidth = 4;
    c.stroke();
    c.beginPath();
    c.ellipse(20, -2, 65, 49, 0, -1.2 + swing, 0.1 + swing);
    c.strokeStyle = "#faf7d540";
    c.lineWidth = 2;
    c.stroke();
  } else {
    polygon(
      c,
      [
        [armX, armY],
        [armX + 4, armY + 28],
        [armX + 8, armY + 35],
        [armX + 8, armY + 10],
      ],
      "#cee0dc",
    );
    line(
      c,
      [
        [armX - 4, armY + 5],
        [armX + 8, armY + 3],
      ],
      "#d3b56e",
      3,
    );
  }
  // Dagger at the sash, head, black hair, and tied headband.
  polygon(
    c,
    [
      [-8, 6],
      [-3, 8],
      [-8, 25],
      [-11, 29],
    ],
    "#9ed4c9",
  );
  c.fillStyle = "#c3956b";
  c.fillRect(-5, -26, 12, 12);
  ellipse(c, 2, -26, 9, 10, "#bf8b61");
  polygon(
    c,
    [
      [-8, -23],
      [-10, -31],
      [-5, -39],
      [5, -39],
      [11, -32],
      [7, -28],
      [3, -33],
      [-2, -27],
      [-3, -19],
    ],
    "#252d2e",
  );
  line(
    c,
    [
      [-8, -31],
      [9, -32],
    ],
    "#ae5546",
    3,
  );
  line(
    c,
    [
      [-8, -30],
      [-18, -25],
    ],
    "#a3483e",
    2,
  );
  c.fillStyle = "#2f302c";
  c.fillRect(6, -27, 2, 2);
  c.restore();
}
export function drawEnemy(
  c: Context,
  enemy: Enemy,
  time: number,
  frozen: boolean,
) {
  if (enemy.dead) return;
  const boss = enemy.kind === "guardian" || enemy.kind === "vizier";
  const scale = boss ? 1.5 : enemy.kind === "brute" ? 1.17 : 1;
  c.save();
  c.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h - 29 * scale);
  c.scale(enemy.face * scale, scale);
  if (enemy.hitFlash > 0) c.filter = "brightness(2.5)";
  const color = frozen ? "#75a9bc" : boss ? "#544a60" : "#74776b";
  const stride =
    !frozen && Math.abs(enemy.vx) > 10 ? Math.sin(time * 9) * 7 : 0;
  polygon(
    c,
    [
      [-12, -20],
      [11, -21],
      [16, 19],
      [5, 28],
      [-18, 20],
    ],
    color,
  );
  line(
    c,
    [
      [-6, 8],
      [-7 + stride, 29],
    ],
    "#3c494b",
    9,
  );
  line(
    c,
    [
      [7, 8],
      [9 - stride, 29],
    ],
    "#39494b",
    9,
  );
  polygon(
    c,
    [
      [-13, -20],
      [0, -27],
      [15, -20],
      [17, -4],
      [-16, -3],
    ],
    frozen ? "#a3d1dc" : "#a69673",
  );
  line(
    c,
    [
      [-14, -17],
      [-19, -3],
      [-13, 8],
    ],
    color,
    7,
  );
  const weaponX = enemy.telegraph > 0 ? 9 : 20;
  const weaponY = enemy.telegraph > 0 ? -40 : -6;
  line(
    c,
    [
      [12, -16],
      [19, -8],
      [weaponX, weaponY],
    ],
    color,
    7,
  );
  if (enemy.kind === "vizier" || enemy.kind === "archer") {
    line(
      c,
      [
        [weaponX, weaponY - 29],
        [weaponX, weaponY + 37],
      ],
      "#9f9272",
      3,
    );
    ellipse(c, weaponX, weaponY - 32, 5, 8, "#e6b66e");
  } else {
    polygon(
      c,
      [
        [weaponX, weaponY - 3],
        [weaponX + 5, weaponY - 36],
        [weaponX + 10, weaponY - 45],
        [weaponX + 10, weaponY - 7],
      ],
      "#a5b8af",
    );
    line(
      c,
      [
        [weaponX - 4, weaponY - 5],
        [weaponX + 13, weaponY - 6],
      ],
      "#b8a371",
      3,
    );
  }
  ellipse(c, 0, -29, 10, 12, color);
  polygon(
    c,
    [
      [-11, -29],
      [-9, -39],
      [0, -45],
      [10, -38],
      [12, -28],
    ],
    frozen ? "#b0d8df" : "#b1a27e",
  );
  c.fillStyle = "#edc982";
  c.fillRect(3, -29, 5, 2);
  c.fillRect(-5, -29, 4, 2);
  if (boss)
    polygon(
      c,
      [
        [-12, -37],
        [-16, -53],
        [-4, -43],
        [0, -56],
        [6, -44],
        [15, -54],
        [11, -36],
      ],
      "#c4ac77",
    );
  if (enemy.telegraph > 0) {
    c.fillStyle = "#f3bc7b";
    c.font = "bold 19px Georgia";
    c.fillText("!", -3, -58);
  }
  c.restore();
  if (enemy.health < enemy.maxHealth && !boss) {
    c.fillStyle = "#182b2a";
    c.fillRect(enemy.x - 6, enemy.y - 13, enemy.w + 12, 3);
    c.fillStyle = "#d4b585";
    c.fillRect(
      enemy.x - 6,
      enemy.y - 13,
      ((enemy.w + 12) * enemy.health) / enemy.maxHealth,
      3,
    );
  }
  if (frozen) {
    c.strokeStyle = "#a1e5e890";
    c.lineWidth = 1;
    c.strokeRect(enemy.x - 7, enemy.y - 7, enemy.w + 14, enemy.h + 12);
  }
}
