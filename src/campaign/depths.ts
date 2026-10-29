import type { CampaignGame } from "./CampaignGame";
import type { CampaignDoor } from "./types";
import { overlap } from "../game/physics";

export interface DepthsState {
  diverted: boolean;
  seals: 0 | 1 | 2;
  resolved: boolean;
}
export const freshDepths = (): DepthsState => ({
  diverted: false,
  seals: 0,
  resolved: false,
});
export function depthsBlock(g: CampaignGame, d: CampaignDoor) {
  if (
    d.gate === "depths-entry" &&
    (!g.journey.baths.drained ||
      g.journey.sword < 2 ||
      !g.abilities.has("dash"))
  )
    return "Submerged cracked hatch · drain the Baths, then return with the stronger sword and Time Dash";
  if (d.gate === "depths-filter" && !g.journey.depths.diverted)
    return "Divert the foul filter race at the far-bank wheel";
  if (d.gate === "depths-rest" && !g.journey.depths.resolved)
    return "The keeper still holds the spring · lift opens from below";
  return null;
}
// A local environmental guardian. Only secured relief valves persist. A live
// pressure test restarts on room exit, death or Continue, with a full warning.
export class Depths {
  active = false;
  clock = 0;
  constructor(private g: CampaignGame) {}
  leave() {
    this.active = false;
    this.clock = 0;
  }
  get jet() {
    const phase = this.g.journey.depths.seals;
    if (!this.active || phase === 2) return null;
    const cycle = phase === 0 ? 4.8 : 4;
    const t = this.clock % cycle;
    // First relief: a curtain across the west climb. Second: alternating shelf risers.
    const west = Math.floor(this.clock / cycle) % 2 === 0;
    const rect =
      phase === 0
        ? { x: 420, y: 320, w: 110, h: 430 }
        : { x: west ? 515 : 1230, y: 250, w: 110, h: 500 };
    return { ...rect, warning: t < 1.5, live: t >= 1.5 && t < 2.5 };
  }
  step(dt: number) {
    if (this.g.room.id !== "depths-heart" || !this.active) return;
    this.clock +=
      this.g.freezeTime > 0 ? 0 : dt * (this.g.slowTime > 0 ? 0.38 : 1);
    const jet = this.jet;
    if (jet?.live && this.g.freezeTime <= 0 && overlap(this.g.player, jet))
      this.g.damage(1, this.g.player.x < 800 ? -1 : 1);
  }
  controls() {
    const g = this.g,
      s = g.journey.depths;
    const remember = () => {
      g.history = [];
      g.save(false);
    };
    if (g.room.id === "sluice-reservoir")
      return [
        {
          x: 580,
          y: 650,
          label: "Listen at the three-knock pipe",
          action: () =>
            g.showStory(
              "A sound beneath the reservoir",
              "Three knocks rise through a pipe that carries no water. Below the tide line: a cracked hatch, a ladder, and a bronze hand holding a spring shut. Someone is still answering the intake.",
              "Drain the Baths. A stronger sword and Time Dash can open the hatch beside this pipe after the upper pools. The main sluice route continues east.",
            ),
        },
      ];
    if (g.room.id === "depths-well")
      return [
        {
          x: 530,
          y: 780,
          label: "Read the keeper's depth marks",
          action: () =>
            g.showStory(
              "The last clean water",
              "Flood rings descend past the royal seal. Below it, a worker cut a different mark: a cupped hand. 'If the upper race runs black, keep the spring closed. Answer with clean water, not the king's seal.'",
              "The flood lock leads to the filter bypass. The ladder on the west wall always returns to the reservoir.",
            ),
        },
      ];
    if (g.room.id === "depths-race")
      return [
        {
          x: 1090,
          y: 420,
          label: s.diverted
            ? "Read the clean bypass gauge"
            : "Divert the foul filter race",
          action: () => {
            if (!s.diverted) {
              s.diverted = true;
              remember();
            }
            g.showStory(
              "A pipe running the wrong way",
              "The filter basket is packed with black sand. You turn its overflow away from the spring. A narrow clear stream answers from below. The keeper was obeying its last instruction: protect the water, even from the palace.",
              "Below, start the keeper's pressure test at the inlet. Open the west relief, then the east. Once both are safe, give the keeper the clean-water answer at its cupped hand.",
            );
          },
        },
      ];
    if (g.room.id === "depths-heart")
      return [
        {
          x: 320,
          y: 750,
          label: s.resolved
            ? "The keeper rests"
            : this.active
              ? "Pressure test running · retreat west anytime"
              : "Admit clean water to the keeper",
          action: () => {
            if (s.resolved || this.active) return;
            if (!s.diverted) {
              g.notify(
                "The keeper refuses the foul intake. Turn the filter bypass above.",
              );
              return;
            }
            this.active = true;
            this.clock = 0;
            g.history = [];
            g.notify(
              s.seals === 2
                ? "Both reliefs hold. Answer at the keeper's cupped hand below."
                : "Pressure test. Outlined pipes warn for 1.5s before a jet. Climb to the west relief, then the east. Retreat remains open.",
            );
          },
        },
        ...[
          { x: 600, y: 500 },
          { x: 1340, y: 500 },
        ].map((point, i) => ({
          ...point,
          label:
            s.seals > i
              ? "Relief secured"
              : `${i ? "East" : "West"} relief valve`,
          action: () => {
            if (s.seals > i) {
              g.notify("This relief stays secured.");
              return;
            }
            if (!this.active || s.seals !== i) {
              g.notify(
                "Admit clean water at the lower inlet, then open west before east.",
              );
              return;
            }
            s.seals = i === 0 ? 1 : 2;
            this.clock = 0;
            remember();
            g.notify(
              i === 0
                ? "West relief secured. The keeper redirects pressure to alternating shelf pipes. Watch their outlines before climbing east."
                : "Both reliefs secured. Pressure is safe. Answer at the keeper's cupped hand on the lower floor.",
            );
          },
        })),
        {
          x: 800,
          y: 750,
          label: s.resolved
            ? "Read the keeper's final answer"
            : "Offer the clean-water answer",
          action: () => {
            if (s.seals !== 2) {
              g.notify(
                "The cupped hand is clenched. Both high reliefs must be secured first.",
              );
              return;
            }
            if (!s.resolved) {
              s.resolved = true;
              this.leave();
              remember();
            }
            g.showStory(
              "You may let go",
              "Clear water fills the bronze palm. The keeper unfolds its fingers. Inside lies a child's clay cup, repaired with copper wire. It guarded a drinking spring for the workers below the Baths. Three knocks, then silence. Its charge is safe.",
              "The spring opens east. Its heart is optional; its service lift returns to the Baths rotunda. The palace's main water supply and story remain as you left them.",
            );
          },
        },
      ];
    if (g.room.id === "depths-spring")
      return [
        {
          x: 510,
          y: 650,
          label: "Read the cup beside the spring",
          action: () =>
            g.showStory(
              "For whoever comes thirsty",
              "No royal names are carved here. Just the outline of a small hand beside a larger bronze one. You place the repaired cup where anyone can reach it. The spring answers the reservoir with clean water.",
              "The high bank holds a heart. The east lift goes to the Baths rotunda and works in both directions. This discovery never becomes a story requirement.",
            ),
        },
      ];
    return [];
  }
}
