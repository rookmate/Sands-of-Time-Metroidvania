import { CampaignGame } from "../campaign/CampaignGame";
import type { Action, Input } from "../game/input";
import { parseCampaign } from "../campaign/state";
import { HARNESS_STEP } from "./Harness";

export type CampaignEvent =
  | { kind: "input"; held: Action[]; pressed: Action[]; frames: number }
  | { kind: "respawn" }
  | { kind: "reload" };

export function reloadCampaign(game: CampaignGame) {
  const save = parseCampaign(JSON.stringify(game.saved));
  if (!save) throw new Error("Checkpoint failed campaign save validation");
  const loaded = new CampaignGame({
    persist: false,
    immortal: game.immortal,
    save,
  });
  Object.assign(loaded.options, game.options);
  loaded.start(true);
  return loaded;
}

// Frame inputs, including repeated presses of a held key, replay independently
// of the route planner. Consecutive identical frames share one entry.
export class CampaignTrace {
  readonly events: CampaignEvent[] = [];
  input(input: Input) {
    const held = input.snapshotHeld();
    const pressed = input.snapshotPressed();
    const last = this.events.at(-1);
    if (
      last?.kind === "input" &&
      last.held.join() === held.join() &&
      last.pressed.join() === pressed.join()
    )
      last.frames++;
    else this.events.push({ kind: "input", held, pressed, frames: 1 });
  }
  static replay(game: CampaignGame, events: readonly CampaignEvent[]) {
    for (const event of events) {
      if (event.kind === "reload") game = reloadCampaign(game);
      else if (event.kind === "respawn") {
        game.player.invincible = 0;
        game.damage(100);
        game.respawn();
      } else {
        for (let i = 0; i < event.frames; i++) {
          game.input.restoreHeld(event.held);
          for (const key of event.pressed) {
            game.input.release(key);
            game.input.press(key);
            if (!event.held.includes(key)) game.input.release(key);
          }
          game.update(HARNESS_STEP);
          if (game.screen === "story") game.closeStory();
        }
      }
    }
    return game;
  }
}
