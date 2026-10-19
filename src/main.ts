import "./style.css";
import { Game } from "./game/Game";
import { Renderer } from "./render/Renderer";
import { UI } from "./ui/UI";
const game = new Game();
const ui = new UI(document.querySelector<HTMLElement>("#app")!, game);
const renderer = new Renderer(
  document.querySelector<HTMLCanvasElement>("#game")!,
  game,
);
// A fixed simulation step keeps jumps, coyote time, and rewind consistent at any refresh rate.
const STEP = 1 / 120;
let previous = performance.now(),
  accumulator = 0;
function frame(now: number) {
  const elapsed = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    game.update(STEP);
    accumulator -= STEP;
  }
  renderer.draw();
  ui.update(elapsed);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Development-only inspection for reproducible route and physics checks. Excluded from production.
if (import.meta.env.DEV) Object.assign(window, { __sands: game });
