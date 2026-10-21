import type { Vec } from "../game/types";
export interface LightRay {
  from: Vec;
  to: Vec;
}
// Trace orthogonal beams through actual mirror positions. Moving a mirror out
// of alignment breaks the circuit even when all its angles remain correct.
export function traceLight(
  mirrors: Vec[],
  values: number[],
  receiver: Vec,
): { rays: LightRay[]; lit: boolean } {
  let from: Vec = { x: 200, y: 420 },
    dx = 1,
    dy = 0;
  const rays: LightRay[] = [];
  const seen = new Set<string>();
  for (let bounce = 0; bounce < 12; bounce++) {
    const hits = mirrors
      .map((point, index) => ({
        point,
        index,
        d: (point.x - from.x) * dx + (point.y - from.y) * dy,
      }))
      .filter(
        (h) =>
          h.d > 1 &&
          Math.abs((h.point.x - from.x) * dy - (h.point.y - from.y) * dx) < 12,
      )
      .sort((a, b) => a.d - b.d);
    const targetDistance =
      (receiver.x - from.x) * dx + (receiver.y - from.y) * dy;
    const aligned =
      targetDistance > 0 &&
      Math.abs((receiver.x - from.x) * dy - (receiver.y - from.y) * dx) < 14;
    if (aligned && (!hits[0] || targetDistance < hits[0].d)) {
      rays.push({ from, to: receiver });
      return { rays, lit: true };
    }
    const hit = hits[0];
    if (!hit) {
      rays.push({ from, to: { x: from.x + dx * 1500, y: from.y + dy * 1500 } });
      break;
    }
    rays.push({ from, to: hit.point });
    const key = `${hit.index}:${dx}:${dy}`;
    if (seen.has(key)) break;
    seen.add(key);
    const slash = (values[hit.index] ?? 0) % 2 === 0;
    [dx, dy] = slash ? [-dy, -dx] : [dy, dx];
    from = hit.point;
  }
  return { rays, lit: false };
}
