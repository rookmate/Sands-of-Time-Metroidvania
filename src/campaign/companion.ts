import { RIVAL_IDS } from "./rival";
import { TRAVERSAL_IDS } from "./enemyTraversal";
import { cooperationActive, stairPosition } from "./cooperation";
import type { Companion, Vec } from "../game/types";
import { clamp, distance, overlap } from "../game/physics";
import type { CampaignGame } from "./CampaignGame";

export class Farah {
  actor: Companion | null = null;
  private trail: Vec[] = [];
  private invincible = 0;
  private telegraphs = new Set<number>();
  constructor(private game: CampaignGame) {}
  enter() {
    const g = this.game;
    this.trail = [];
    this.telegraphs.clear();
    // Farah waits outside the hollow-creature pens instead of killing their mechanisms.
    this.actor = [...TRAVERSAL_IDS, ...RIVAL_IDS].includes(g.room.id)
      ? null
      : g.journey.farah === "following" || g.journey.farah === "restored"
        ? {
            x: g.journey.farah === "restored" ? 650 : g.player.x - 75,
            y: g.player.y,
            w: 30,
            h: 56,
            vx: 0,
            vy: 0,
            face: 1,
            health: 8,
            maxHealth: 8,
            cooldown: 0.5,
            holding: null,
          }
        : null;
    if (cooperationActive(g)) this.step(0);
  }
  atMirror(point: Vec) {
    this.trail = [];
    if (this.actor)
      Object.assign(this.actor, {
        x: point.x - 55,
        y: point.y - this.actor.h,
        vx: 0,
        vy: 0,
        holding: null,
      });
  }
  step(dt: number) {
    const f = this.actor,
      g = this.game;
    if (!f) return;
    if (cooperationActive(g)) {
      const s = g.journey.cooperation;
      const location = s.phase === "scouting" ? "bathworks" : "valve-loft";
      if (g.room.id !== location) {
        this.actor = null;
        return;
      }
      const point =
        s.phase === "scouting" ? stairPosition(s.travel) : { x: 650, y: 650 };
      f.x = point.x - 15;
      f.y = point.y - f.h;
      f.face = 1;
      return;
    }
    if (g.journey.farah === "restored") {
      f.face = g.player.x > f.x ? 1 : -1;
      return;
    }
    this.invincible = Math.max(0, this.invincible - dt);
    const before = f.x;
    this.trail.push({ x: g.player.x - 65 * g.player.face, y: g.player.y });
    if (this.trail.length > 72) this.trail.shift();
    if (f.holding) {
      f.x += clamp(f.holding.x - 15 - f.x, -220 * dt, 220 * dt);
      f.y = f.holding.y - f.h;
    } else {
      const point = this.trail[0];
      f.x += clamp(point.x - f.x, -400 * dt, 400 * dt);
      f.y = point.y;
    }
    f.vx = (f.x - before) / dt;
    if (Math.abs(f.vx) > 1) f.face = Math.sign(f.vx);
    f.cooldown -= dt;
    const target = g.enemies
      .filter((e) => !e.dead && !e.protected && distance(e, f) < 570)
      .sort((a, b) => distance(a, f) - distance(b, f))[0];
    if (target && f.cooldown <= 0) {
      f.face = Math.sign(target.x - f.x) || 1;
      target.health -= 1;
      target.hitFlash = 0.15;
      if (target.health <= 0) g.farahDefeatedEnemy(target);
      f.cooldown = 1.2;
      g.burst(target.x + 15, target.y + 20, "#e1c89e", 3);
    }
    for (const enemy of g.enemies) {
      if (
        !enemy.dead &&
        this.telegraphs.has(enemy.id) &&
        enemy.telegraph <= 0 &&
        Math.abs(enemy.x - f.x) < 110 &&
        Math.abs(enemy.y + enemy.h - f.y - f.h) < 90
      )
        this.hurt();
    }
    this.telegraphs = new Set(
      g.enemies.filter((e) => e.telegraph > 0).map((e) => e.id),
    );
    for (const shot of g.projectiles) {
      if (
        shot.life > 0 &&
        overlap(f, { x: shot.x - 8, y: shot.y - 8, w: 16, h: 16 })
      ) {
        this.hurt();
        shot.life = 0;
      }
    }
  }
  private hurt() {
    if (!this.actor || this.invincible > 0 || this.game.immortal) return;
    this.actor.health = Math.max(0, this.actor.health - 1);
    this.invincible = 1.5;
    if (this.actor.health === 0) {
      this.game.deaths++;
      this.game.notify(
        "Farah has fallen. Return to the fountain to try together again.",
      );
      this.game.setScreen("death");
    }
  }
}
