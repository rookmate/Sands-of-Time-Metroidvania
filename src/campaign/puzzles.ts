import { swordPhase } from "../game/combat";
import { spawnEnemies } from "../game/enemies";
import { clamp, distance } from "../game/physics";
import type { Platform, Vec } from "../game/types";
import type { CampaignGame } from "./CampaignGame";
import { traceLight } from "./light";
import { freshPuzzle } from "./state";

export class Puzzles {
  private lastStrike = -1;
  constructor(private game: CampaignGame) {}
  get definition() {
    return this.game.section.puzzle;
  }
  get state() {
    return (this.game.journey.puzzles[this.game.room.id] ??= freshPuzzle(
      this.definition,
    ));
  }
  get mirrors() {
    const p = this.definition;
    return p?.kind === "mirror"
      ? p.mirrors.map((v, i) => ({
          ...v,
          x: i === p.movable ? this.state.crateX : v.x,
        }))
      : [];
  }
  get light() {
    const p = this.definition;
    return p?.kind === "mirror"
      ? traceLight(this.mirrors, this.state.values, p.target)
      : { rays: [], lit: false };
  }
  get controls(): (Vec & { label: string; action: () => void })[] {
    const p = this.definition,
      s = this.state,
      g = this.game;
    if (!p || s.solved) return [];
    switch (p.kind) {
      case "crank":
        return p.controls.map((v, i) => ({
          ...v,
          label: `${v.label} · ${(s.values[i] ?? 0) + 1}/${v.steps}`,
          action: () => {
            s.values[i] = ((s.values[i] ?? 0) + 1) % v.steps;
            g.sound.play("step");
          },
        }));
      case "timed":
        return [
          {
            ...p.lever,
            label: `Open the gate · ${p.seconds} seconds`,
            action: () => {
              s.remaining = p.seconds;
              g.notify("The gate is open. Move!");
            },
          },
        ];
      case "crate":
        return [
          {
            x: s.crateX + 24,
            y: p.plate.y,
            label: "Hold E + move to push or pull the crate",
            action: () => {},
          },
        ];
      case "paired":
        return [
          {
            ...p.prince,
            label: s.activated
              ? "Hold your switch while Farah moves"
              : "Ask Farah to hold the other switch",
            action: () => {
              if (g.companion) {
                s.activated = true;
                g.companion.holding = p.farah;
                g.notify("Farah: I’ll hold this one. Stay on your switch.");
              }
            },
          },
        ];
      case "mirror":
        return p.controls.map((v, i) => ({
          ...v,
          x: i === p.movable ? s.crateX : v.x,
          label:
            i === p.movable
              ? "Rotate mirror · hold down + E + move to slide"
              : "Rotate mirror",
          action: () => {
            if (!g.input.down("down")) s.values[i] = 1 - (s.values[i] ?? 0);
          },
        }));
      case "columns":
        return p.levers.map((v, i) => ({
          ...v,
          label: `Extend column ${i + 1}`,
          action: () => {
            s.values[i] = 1;
            if (s.remaining <= 0) s.remaining = p.seconds;
          },
        }));
      case "illusion":
        return p.doors.map((v, i) => ({
          ...v,
          label: `Enter passage ${i + 1}${p.sequence[s.values[0] ?? 0] === i ? " · flowing water" : " · silence"}`,
          action: () => {
            const n = s.values[0] ?? 0;
            s.values[0] = p.sequence[n] === i ? n + 1 : 0;
            s.solved = s.values[0] === p.sequence.length;
            g.notify(
              s.solved
                ? "The dream releases its hold."
                : s.values[0]
                  ? "The water sounds closer."
                  : "The passage returns you to the beginning. Listen for water.",
            );
          },
        }));
      case "battle":
        return p.recovery && !s.activated
          ? [
              {
                ...p.recovery,
                label: "Reach for Farah and the Dagger",
                action: () => {
                  g.recoverDagger();
                  s.activated = true;
                },
              },
            ]
          : [];
      case "wall":
      case "vizier":
        return [];
    }
  }
  platforms(base: Platform[]): Platform[] {
    const p = this.definition,
      s = this.state;
    if (!p) return base;
    const solid = (v: Platform) => ({ ...v, oneWay: false });
    switch (p.kind) {
      case "timed":
        return [
          ...base,
          ...(!s.solved && s.remaining <= 0 ? [solid(p.gate)] : []),
        ];
      case "crate":
        return [
          ...base,
          solid({ ...p.crate, x: s.crateX }),
          ...(!s.solved ? [solid(p.gate)] : []),
        ];
      case "paired":
        return [
          ...base,
          ...(!s.solved ? [solid(p.gate)] : []),
          ...(this.game.section.layout === "drawbridge"
            ? [
                {
                  x: 850,
                  y: s.solved ? 650 : 1000,
                  w: 430,
                  h: 24,
                  kind: "moving" as const,
                  oneWay: true,
                },
              ]
            : []),
        ];
      case "wall":
        return [...base, ...(!s.solved ? [solid(p.wall)] : [])];
      case "illusion":
        return [
          ...base,
          ...(!s.solved ? [solid({ x: 1450, y: 330, w: 45, h: 320 })] : []),
        ];
      case "columns":
        return [
          ...base,
          ...[650, 850, 1050].map((x, i): Platform => ({
            x,
            y:
              s.solved ||
              (s.remaining > 0 && s.values[0] === 1 && s.values[1] === 1)
                ? [535, 435, 350][i]
                : 1200,
            w: 180,
            h: 24,
            // Columns extend/retract instantly; they are not rideable motion.
            // Treating retraction as a platform delta carries riders below the floor.
            oneWay: true,
          })),
        ];
      case "battle":
        return p.elevator
          ? [
              ...base,
              {
                x: 300,
                y: 650 - s.lift,
                w: 1500,
                h: 150,
                kind: "moving",
                oneWay: false,
              },
            ]
          : base;
      case "crank":
        return this.game.section.layout === "library" && !s.solved
          ? base.map((v, i) => (i ? { ...v, y: v.y + 1200 } : v))
          : base;
      default:
        return base;
    }
  }
  step(dt: number) {
    const p = this.definition,
      s = this.state,
      g = this.game;
    if (!p || (s.solved && p.kind !== "crate" && p.kind !== "mirror")) return;
    const axis = Number(g.input.down("right")) - Number(g.input.down("left"));
    const feet = { x: g.player.x + 15, y: g.player.y + g.player.h };
    const worldDt = dt * (g.freezeTime > 0 ? 0 : g.slowTime > 0 ? 0.25 : 1);
    switch (p.kind) {
      case "crank":
        s.solved = p.controls.every((c, i) => (s.values[i] ?? 0) === c.target);
        break;
      case "timed":
        s.remaining = Math.max(0, s.remaining - worldDt);
        s.solved = s.remaining > 0 && g.player.x > p.gate.x + p.gate.w;
        break;
      case "crate":
        if (
          g.input.down("interact") &&
          Math.abs(feet.x - s.crateX - 24) < 100 &&
          Math.abs(feet.y - p.plate.y) < 35
        )
          s.crateX = clamp(s.crateX + axis * 260 * dt, 300, 1300);
        s.solved = Math.abs(s.crateX + 24 - p.plate.x) < 34;
        break;
      case "paired":
        s.solved =
          !!g.companion &&
          s.activated &&
          distance(feet, p.prince) < 65 &&
          distance({ x: g.companion.x + 15, y: g.companion.y + 56 }, p.farah) <
            35;
        break;
      case "mirror": {
        if (
          g.input.down("down") &&
          g.input.down("interact") &&
          Math.abs(feet.x - s.crateX) < 95 &&
          Math.abs(feet.y - 650) < 35
        )
          s.crateX = clamp(s.crateX + axis * 325 * dt, 450, 1500);
        s.solved = this.light.lit;
        break;
      }
      case "columns":
        s.remaining = Math.max(0, s.remaining - worldDt);
        if (s.remaining === 0) s.values = [];
        s.solved = s.remaining > 0 && g.player.x > 1330 && feet.y <= 355;
        break;
      case "wall":
        if (
          swordPhase(g.player) === "active" &&
          g.attackId !== this.lastStrike &&
          Math.abs(g.player.x + 15 - p.wall.x) < 110 &&
          Math.abs(feet.y - 650) < 100
        ) {
          this.lastStrike = g.attackId;
          if (g.journey.sword >= p.sword) {
            s.values[0] = (s.values[0] ?? 0) + 1;
            s.solved = s.values[0] >= (g.journey.sword === 3 ? 1 : 2);
            g.burst(p.wall.x, 560, "#cdb783", 25);
          } else g.notify("A stronger sword is needed to break this wall.");
        }
        break;
      case "battle": {
        if (!p.recovery && g.player.x > 500) s.activated = true;
        if (!s.activated) break;
        if (p.elevator) s.lift = Math.min(240, s.lift + worldDt * 20);
        if (!g.enemies.some((e) => !e.dead)) {
          if (s.wave < p.waves) {
            const y = p.elevator ? 650 - s.lift : 650;
            const spawns = p.boss
              ? [
                  {
                    kind: p.boss,
                    x: 1400,
                    y,
                    patrol: [1020, 1850] as [number, number],
                  },
                ]
              : [0, 1, 2].map((n) => ({
                  kind:
                    n === 2 && g.tier >= 2
                      ? ("brute" as const)
                      : ("guard" as const),
                  x: (p.recovery ? 1450 : 1000) + n * 220,
                  y,
                  patrol: (p.recovery ? [1150, 2150] : [700, 1750]) as [
                    number,
                    number,
                  ],
                }));
            g.enemies = spawnEnemies(spawns, g.tier, false, false);
            g.enemies.forEach((e) => (e.id += s.wave * 10));
            s.wave++;
          } else s.solved = !p.elevator || s.lift >= 240;
        }
        break;
      }
      case "vizier": {
        if (!s.activated) {
          if (!g.journey.grandRewind) break;
          g.enemies = spawnEnemies(
            [{ kind: "vizier", x: 1900, y: 650, patrol: [1900, 1950] }],
            4,
            false,
            false,
          );
          g.enemies[0].protected = true;
          s.activated = true;
        }
        if (
          !g.enemies.some((e) => e.kind === "double" && !e.dead) &&
          s.wave < 3
        ) {
          const clone = spawnEnemies(
            [{ kind: "double", x: 1250, y: 650, patrol: [650, 1720] }],
            4,
            false,
            false,
          )[0];
          clone.id = 10 + s.wave;
          g.enemies.push(clone);
          s.wave++;
        }
        if (
          s.wave === 3 &&
          !g.enemies.some((e) => e.kind === "double" && !e.dead)
        ) {
          const vizier = g.enemies.find((e) => e.kind === "vizier");
          if (vizier) {
            vizier.protected = false;
            vizier.cooldown = 9999;
            vizier.health = Math.min(3, vizier.health);
            s.solved = vizier.dead;
          }
        }
        break;
      }
      case "illusion":
        break;
    }
  }
}
