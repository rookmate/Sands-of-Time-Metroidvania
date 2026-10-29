import type { Enemy, Platform, Player, Projectile } from "./types";
import { GRAVITY, moveBody } from "./physics";

// Sahir always commits facing at the start of the windup. Neither the strike
// nor the high cast tracks a dodging player. Time powers use the ordinary dt.
export function stepRival(
  e: Enemy,
  p: Player,
  platforms: Platform[],
  shots: Projectile[],
  dt: number,
  damage: (amount: number, direction: number) => void,
) {
  e.cooldown -= dt;
  e.vx = 0;
  if (e.rivalMove) {
    if (e.telegraph > 0) {
      e.telegraph = Math.max(0, e.telegraph - dt);
      if (e.telegraph === 0 && e.rivalMove === "cast") {
        shots.push({
          x: e.x + e.w / 2,
          y: e.y + 28,
          vx: e.face * 300,
          vy: 0,
          radius: 8,
          life: 3,
        });
        e.rivalMove = undefined;
        e.cooldown = 1.6;
      }
    } else {
      e.vx = e.face * 350;
      e.rivalLunge = Math.max(0, (e.rivalLunge ?? 0) - dt);
      if (
        Math.abs(p.x - e.x) < 90 &&
        Math.abs(p.y + p.h - e.y - e.h) < 65 &&
        Math.sign(p.x - e.x) === e.face
      )
        damage(1, e.face);
      if (e.rivalLunge === 0) {
        e.rivalMove = undefined;
        e.vx = 0;
        e.cooldown = 1.6;
      }
    }
  } else if (e.cooldown <= 0) {
    const dx = p.x - e.x;
    e.face = Math.sign(dx) || e.face;
    e.rivalMove =
      e.phase > 0 &&
      (Math.abs(dx) > 190 || Math.abs(p.y + p.h - e.y - e.h) > 80)
        ? "cast"
        : "thrust";
    e.telegraph = e.rivalMove === "cast" ? 1.1 : 0.95;
    e.rivalLunge = 0.38;
  }
  e.vy += GRAVITY * dt;
  moveBody(e, platforms, dt);
  e.x = Math.max(e.patrol[0], Math.min(e.x, e.patrol[1] - e.w));
}
