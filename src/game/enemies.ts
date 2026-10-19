import type { Enemy, EnemySpawn, Platform, Player, Projectile } from "./types";
import { GRAVITY, moveBody } from "./physics";
import { enemyStats } from "./progression";
export function spawnEnemies(
  spawns: EnemySpawn[],
  tier: number,
  guardianDefeated: boolean,
  victory: boolean,
): Enemy[] {
  return spawns
    .filter(
      (s) =>
        (s.tier ?? 0) <= tier &&
        !(s.kind === "guardian" && guardianDefeated) &&
        !(s.kind === "vizier" && victory),
    )
    .map((s, id) => {
      const boss = s.kind === "vizier" || s.kind === "guardian";
      const h = boss ? 88 : s.kind === "brute" ? 64 : 52;
      const health = enemyStats(tier, s.kind).health;
      return {
        id,
        kind: s.kind,
        x: s.x,
        y: s.y - h,
        w: boss ? 50 : 34,
        h,
        vx: 0,
        vy: 0,
        health,
        maxHealth: health,
        patrol: s.patrol,
        face: -1,
        cooldown: 0.9,
        telegraph: 0,
        hitFlash: 0,
        attackId: -1,
        dead: false,
        phase: 0,
      };
    });
}
export function stepEnemies(
  enemies: Enemy[],
  player: Player,
  platforms: Platform[],
  projectiles: Projectile[],
  tier: number,
  dt: number,
  frozen: boolean,
  damage: (amount: number, direction: number) => void,
) {
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    if (frozen) continue;
    const stats = enemyStats(tier, enemy.kind);
    const dx = player.x - enemy.x,
      dy = Math.abs(player.y + player.h - enemy.y - enemy.h);
    const boss = enemy.kind === "guardian" || enemy.kind === "vizier";
    const ranged = enemy.kind === "archer" || enemy.kind === "vizier";
    enemy.phase = boss && enemy.health < enemy.maxHealth * 0.5 ? 1 : 0;
    enemy.cooldown -= dt;
    if (enemy.telegraph > 0) {
      enemy.telegraph -= dt;
      enemy.vx = 0;
      if (enemy.telegraph <= 0) {
        if (ranged || (boss && Math.abs(dx) > 135)) {
          const direction = Math.sign(dx) || 1;
          projectiles.push({
            x: enemy.x + 20,
            y: enemy.y + 30,
            vx: direction * (boss ? 340 : 260),
            vy: 0,
            life: 4,
            radius: boss ? 10 : 5,
          });
          if (enemy.phase)
            for (const vy of [-100, 100])
              projectiles.push({
                x: enemy.x + 20,
                y: enemy.y + 30,
                vx: direction * 310,
                vy,
                life: 4,
                radius: 8,
              });
        } else if (Math.abs(dx) < (boss ? 135 : 85) && dy < 85)
          damage(stats.damage, Math.sign(dx));
        enemy.cooldown = stats.cooldown * (enemy.phase ? 0.7 : 1);
      }
    } else {
      const range = ranged ? 570 : boss ? 380 : 360;
      const alerted = Math.abs(dx) < range && dy < 150;
      if (alerted) enemy.face = Math.sign(dx) || enemy.face;
      const reach = ranged ? 450 : boss ? 125 : 66;
      if (alerted && Math.abs(dx) < reach && enemy.cooldown <= 0)
        enemy.telegraph = boss ? 0.68 : 0.48;
      else if (!(ranged && alerted && Math.abs(dx) < 310))
        enemy.vx = enemy.face * stats.speed * (enemy.phase ? 1.25 : 1);
      else enemy.vx = 0;
      if (enemy.x <= enemy.patrol[0]) {
        enemy.x = enemy.patrol[0];
        enemy.face = 1;
      }
      if (enemy.x >= enemy.patrol[1] - enemy.w) {
        enemy.x = enemy.patrol[1] - enemy.w;
        enemy.face = -1;
      }
    }
    enemy.vy += GRAVITY * dt;
    moveBody(enemy, platforms, dt);
  }
}
