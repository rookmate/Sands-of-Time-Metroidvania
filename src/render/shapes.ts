export type Context = CanvasRenderingContext2D;
export function polygon(
  c: Context,
  points: number[][],
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
export function line(c: Context, points: number[][], color: string, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
export function arch(
  c: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + w * 0.48);
  c.bezierCurveTo(x, y + w * 0.23, x + w * 0.34, y + w * 0.08, x + w / 2, y);
  c.bezierCurveTo(
    x + w * 0.66,
    y + w * 0.08,
    x + w,
    y + w * 0.23,
    x + w,
    y + w * 0.48,
  );
  c.lineTo(x + w, y + h);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
export function ellipse(
  c: Context,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
}
export function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function glow(
  c: Context,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  const gradient = c.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");
  c.fillStyle = gradient;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
export function star(
  c: Context,
  x: number,
  y: number,
  r: number,
  color: string,
  rotation = 0,
) {
  const points: number[][] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 + rotation,
      radius = i % 2 ? r * 0.42 : r;
    points.push([x + Math.cos(a) * radius, y + Math.sin(a) * radius]);
  }
  polygon(c, points, color);
}
