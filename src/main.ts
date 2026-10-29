import "./style.css";
import { Game } from "./game/Game";
import { CampaignGame } from "./campaign/CampaignGame";
import { Renderer } from "./render/Renderer";
import { UI } from "./ui/UI";
const params = new URLSearchParams(location.search);
const playback =
  import.meta.env.DEV && params.has("harness")
    ? new (await import("./harness/browser")).BrowserHarness(params)
    : null;
const game: Game = playback?.harness.game ?? new CampaignGame();
const currentGame = () => playback?.harness.game ?? game;
const root = document.querySelector<HTMLElement>("#app")!;
const ui = new UI(root, currentGame);
playback?.mount(root);
const renderer = new Renderer(
  document.querySelector<HTMLCanvasElement>("#game")!,
  currentGame,
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
    if (playback) playback.advance();
    else game.update(STEP);
    accumulator -= STEP;
  }
  renderer.draw();
  ui.update(elapsed);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Development-only inspection for reproducible route and physics checks. Excluded from production.
if (import.meta.env.DEV)
  Object.defineProperty(window, "__sands", { get: currentGame });
