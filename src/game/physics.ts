import type { Player, Rect, Platform, Vec } from "./types";
import type { Input } from "./input";
export const GRAVITY = 1750;
export const JUMP_SPEED = 725;
export const RUN_SPEED = 325;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export function moveBody(
  body: Rect & { vx: number; vy: number },
  platforms: Platform[],
  dt: number,
) {
  let wall = 0,
    grounded = false;
  body.x += body.vx * dt;
  for (const p of platforms) {
    if (p.oneWay || !overlap(body, p)) continue;
    if (body.vx > 0) {
      body.x = p.x - body.w;
      wall = 1;
    } else if (body.vx < 0) {
      body.x = p.x + p.w;
      wall = -1;
    }
    body.vx = 0;
  }
  const previousBottom = body.y + body.h;
  body.y += body.vy * dt;
  for (const p of platforms) {
    if (p.oneWay && (body.vy < 0 || previousBottom > p.y + 1)) continue;
    if (!overlap(body, p)) continue;
    if (body.vy >= 0) {
      body.y = p.y - body.h;
      grounded = true;
    } else body.y = p.y + p.h;
    body.vy = 0;
  }
  return { wall, grounded };
}
export function stepPlayer(
  player: Player,
  input: Input,
  platforms: Platform[],
  dt: number,
  width: number,
) {
  if (input.consume("jump")) player.jumpBuffer = 0.14;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = player.grounded ? 0.11 : Math.max(0, player.coyote - dt);
  player.wallLock = Math.max(0, player.wallLock - dt);
  const axis = Number(input.down("right")) - Number(input.down("left"));
  if (player.ledge) {
    if (player.jumpBuffer > 0 || input.down("jump")) {
      player.x = player.ledge.x;
      player.y = player.ledge.y - player.h;
      player.ledge = null;
      player.vy = -190;
      player.jumpBuffer = 0;
    } else if (input.down("down") || axis === -player.face) {
      player.ledge = null;
      player.vy = 60;
      player.wallLock = 0.2;
    } else return;
  }
  if (player.dashTime > 0) {
    player.vx = player.face * 1050;
    player.vy = 0;
  } else {
    const acceleration = player.grounded ? 2600 : 1900;
    if (player.wallLock <= 0) {
      const target = axis * RUN_SPEED;
      player.vx += clamp(
        target - player.vx,
        -acceleration * dt,
        acceleration * dt,
      );
      if (axis) player.face = axis;
    }
    if (player.jumpBuffer > 0 && (player.coyote > 0 || player.wall !== 0)) {
      player.vy = -JUMP_SPEED;
      if (player.wall && !player.grounded) {
        player.vx = -player.wall * 420;
        player.face = -player.wall;
        player.wallLock = 0.22;
      }
      player.jumpBuffer = 0;
      player.coyote = 0;
      player.grounded = false;
      player.wall = 0;
      player.wallTime = 0;
    }
    if (!input.down("jump") && player.vy < -270)
      player.vy += GRAVITY * dt * 1.5;
    player.vy += GRAVITY * dt;
    if (
      player.wall !== 0 &&
      axis === player.wall &&
      !player.grounded &&
      player.wallLock === 0
    ) {
      player.wallTime += dt;
      if (player.wallTime < 0.3 && input.down("jump")) player.vy = -245;
      else player.vy = Math.min(player.vy, 100);
    } else player.wallTime = 0;
    player.vy = Math.min(player.vy, 950);
  }
  const result = moveBody(player, platforms, dt);
  player.grounded = result.grounded;
  player.wall = result.wall;
  player.x = clamp(player.x, 0, width - player.w);
  if (result.wall && player.vy >= 0 && player.wallLock <= 0) {
    for (const p of platforms) {
      const edge = result.wall > 0 ? p.x : p.x + p.w;
      const hand = result.wall > 0 ? player.x + player.w : player.x;
      if (
        Math.abs(hand - edge) < 3 &&
        player.y > p.y - 12 &&
        player.y < p.y + 27 &&
        p.h > 35
      ) {
        player.ledge = {
          x: result.wall > 0 ? p.x + 5 : p.x + p.w - player.w - 5,
          y: p.y,
        };
        player.y = p.y + 6;
        player.vy = 0;
        player.vx = 0;
        break;
      }
    }
  }
}
export function platformPositions(
  platforms: Platform[],
  time: number,
): Platform[] {
  return platforms.map((p) => {
    if (p.kind !== "moving") return p;
    const offset = Math.sin(time * (p.speed ?? 1)) * (p.range ?? 90);
    return {
      ...p,
      x: p.x + (p.axis === "x" ? offset : 0),
      y: p.y + (p.axis === "y" ? offset : 0),
    };
  });
}
