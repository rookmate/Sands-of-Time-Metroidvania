import type { Player, Rect } from "./types";

// Prince time, unaffected by Slow/Freeze. Recovery is part of the visible swing.
export const SWORD = {
  windup: 0.04,
  active: 0.1,
  recovery: 0.16,
  finisherRecovery: 0.26,
  buffer: 0.1,
  reach: 64,
  recoil: 0.12,
} as const;
export function swordDuration(combo: number) {
  return (
    SWORD.windup +
    SWORD.active +
    (combo === 0 ? SWORD.finisherRecovery : SWORD.recovery)
  );
}
export function swordPhase(player: Pick<Player, "attack" | "combo">) {
  if (player.attack <= 0) return "idle";
  const elapsed = swordDuration(player.combo) - player.attack;
  if (elapsed < SWORD.windup) return "windup";
  return elapsed < SWORD.windup + SWORD.active ? "active" : "recovery";
}
export function swordHitbox(player: Player): Rect {
  return {
    x: player.face > 0 ? player.x + player.w - 8 : player.x - SWORD.reach,
    y: player.y - 2,
    w: SWORD.reach + 8,
    h: player.h + 4,
  };
}
