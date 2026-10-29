import { stepRival } from "./rival";
import type { Enemy, EnemySpawn, Platform, Player, Projectile } from "./types";
import { GRAVITY, moveBody } from "./physics";
import { enemyStats } from "./progression";
export const isBoss = (kind: EnemySpawn["kind"]) =>
  ["guardian", "vizier", "king", "double", "rival"].includes(kind);
export const enemyName = (kind: EnemySpawn["kind"]) =>
  ({
    rival: "Sahir · the split crest",
    guard: "Sand guard",
    archer: "Sand archer",
    brute: "Sand brute",
    guardian: "Sand Guardian",
    vizier: "The Vizier",
    king: "King Shahraman",
    double: "Vizier double",
    bird: "Sand bird",
    scarab: "Scarab",
  })[kind];
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
      const boss = isBoss(s.kind);
      const h = boss ? 88 : s.kind === "brute" ? 64 : 52;
      const health = enemyStats(tier, s.kind).health;
      return {
        id,
        kind: s.kind,
        behavior: s.behavior,
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
    enemy.chargeImpact = 0;
    if (enemy.dead) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    if (frozen || enemy.protected) continue;
    if (enemy.kind === "rival") {
      stepRival(enemy, player, platforms, projectiles, dt, damage);
      continue;
    }
    if (enemy.behavior === "ram") {
      stepRam(enemy, player, platforms, tier, dt, damage);
      continue;
    }
    if ((enemy.hitStun ?? 0) > 0) {
      enemy.hitStun = Math.max(0, enemy.hitStun! - dt);
      enemy.vy += GRAVITY * dt;
      moveBody(enemy, platforms, dt);
      continue;
    }
    const stats = enemyStats(tier, enemy.kind);
    const dx = player.x - enemy.x,
      dy = Math.abs(player.y + player.h - enemy.y - enemy.h);
    const boss = isBoss(enemy.kind);
    if (enemy.kind === "bird") {
      enemy.cooldown -= dt;
      enemy.face = Math.sign(dx) || 1;
      enemy.x += enemy.face * 95 * dt;
      enemy.y += Math.sign(player.y - 30 - enemy.y) * 60 * dt;
      if (
        Math.abs(dx) < 50 &&
        Math.abs(player.y - enemy.y) < 65 &&
        enemy.cooldown <= 0
      ) {
        damage(1, enemy.face);
        enemy.cooldown = 1.2;
      }
      continue;
    }
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

// A ram commits its direction when the long pawing telegraph begins. It uses
// the same body collision and sword damage as other ground enemies.
function stepRam(
  e: Enemy,
  player: Player,
  platforms: Platform[],
  tier: number,
  dt: number,
  damage: (amount: number, direction: number) => void,
) {
  e.cooldown -= dt;
  const dx = player.x - e.x;
  if (e.charge) {
    if (e.telegraph > 0) {
      e.telegraph = Math.max(0, e.telegraph - dt);
      e.vx = 0;
    } else {
      e.vx = e.charge.direction * 620;
      e.charge.remaining -= dt;
    }
  } else {
    if (
      Math.abs(dx) < 410 &&
      Math.abs(player.y + player.h - e.y - e.h) < 100 &&
      e.cooldown <= 0
    ) {
      e.face = Math.sign(dx) || e.face;
      e.charge = { direction: e.face, remaining: 1.3 };
      e.telegraph = 0.85;
      e.vx = 0;
    } else {
      if (e.x <= e.patrol[0]) e.face = 1;
      if (e.x + e.w >= e.patrol[1]) e.face = -1;
      e.vx = e.face * 48;
    }
  }
  e.vy += GRAVITY * dt;
  const result = moveBody(e, platforms, dt);
  if (e.charge && e.telegraph === 0) {
    if (
      Math.abs(e.vx) > 0 &&
      e.x < player.x + player.w &&
      e.x + e.w > player.x &&
      e.y < player.y + player.h &&
      e.y + e.h > player.y
    )
      damage(enemyStats(tier, e.kind).damage, e.charge.direction);
    if (result.wall || e.charge.remaining <= 0) {
      e.chargeImpact = result.wall;
      e.charge = undefined;
      e.vx = 0;
      e.cooldown = 1.4;
    }
  }
}
