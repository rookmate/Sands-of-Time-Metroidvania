import type { Enemy, Platform, Player, Projectile, Rect } from "./types";
import { GRAVITY, moveBody, overlap } from "./physics";

// These two palace encounters share committed tells and recovery, not the
// ordinary enemies' release-time tracking. No live attempt enters a save.
export function bossLane(e: Enemy): Rect {
  const feet = e.y + e.h;
  if (e.bossAttack?.move === "sweep")
    return {
      x: e.face > 0 ? e.x + e.w / 2 : e.x - 135,
      y: feet - 62,
      w: 160,
      h: 62,
    };
  return {
    x: e.x + e.w / 2 - (e.face > 0 ? 8 : 1288),
    y: feet - (e.bossAttack?.move === "high" ? 110 : 24) - 8,
    w: 1296,
    h: 16,
  };
}

export function bossGuards(
  e: Enemy,
  p: Pick<Player, "x" | "w">,
  frozen: boolean,
) {
  return (
    (e.kind === "king" || e.kind === "double") &&
    !frozen &&
    (!e.bossAttack || e.telegraph > 0) &&
    (p.x + p.w / 2 - e.x - e.w / 2) * e.face >= 0
  );
}

export function stepPalaceBoss(
  e: Enemy,
  p: Player,
  platforms: Platform[],
  shots: Projectile[],
  dt: number,
  damage: (amount: number, direction: number) => void,
) {
  const phase = e.health < e.maxHealth * 0.5 ? 1 : 0;
  if (phase !== e.phase) e.bossBeat = 0;
  e.phase = phase;
  e.cooldown = Math.max(0, e.cooldown - dt);
  e.vx = 0;
  const attack = e.bossAttack;
  if (attack) {
    if (e.telegraph > 0) {
      e.telegraph = Math.max(0, e.telegraph - dt);
      if (e.telegraph === 0) {
        const lane = bossLane(e);
        if (attack.move === "sweep") {
          e.bossImpact = lane;
          if (overlap(p, lane)) damage(1, e.face);
        } else {
          shots.push({
            x: e.x + e.w / 2,
            y: lane.y + 8,
            vx: e.face * 320,
            vy: 0,
            radius: 8,
            life: 4,
          });
        }
        // The King's second sweep has its own full tell, with the same
        // committed facing. Jump again or stay behind; it never turns mid-chain.
        if (attack.followup) {
          e.bossAttack = { move: "sweep", duration: 0.72, followup: false };
          e.telegraph = 0.72;
        } else e.cooldown = 1.15;
      }
    } else if (e.cooldown === 0) e.bossAttack = undefined;
  } else {
    const dx = p.x + p.w / 2 - e.x - e.w / 2;
    const dy = Math.abs(p.y + p.h - e.y - e.h);
    e.face = Math.sign(dx) || e.face;
    if (
      Math.abs(dx) < (e.kind === "king" ? 150 : 520) &&
      dy < 180 &&
      e.cooldown === 0
    ) {
      const beat = e.bossBeat ?? 0;
      e.bossBeat = beat + 1;
      const move =
        e.kind === "king"
          ? "sweep"
          : e.phase && beat % 2 === 0
            ? "high"
            : "low";
      e.bossAttack = {
        move,
        duration: 0.9,
        followup: e.kind === "king" && e.phase === 1,
      };
      e.telegraph = 0.9;
    } else {
      e.vx = e.face * (e.kind === "king" ? 75 : 55);
    }
  }
  e.vy += GRAVITY * dt;
  moveBody(e, platforms, dt);
  e.x = Math.max(e.patrol[0], Math.min(e.x, e.patrol[1] - e.w));
}
