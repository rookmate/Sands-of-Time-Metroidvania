# Sands of Time

A complete, compact 2D Metroidvania inspired by _Prince of Persia: The Sands of Time_. Explore twelve connected rooms, recover four time powers, restore the palace waterways, defeat the Sand Guardian, and confront the Vizier. The ending leaves the palace open for further exploration.

All scenery, characters, animation, particles, icons, music, and effects are drawn or synthesized by the game. There are no downloaded art packs, external fonts, asset services, or runtime dependencies. This is an unofficial fan project.

## Run locally

Requires Node.js 22.12 or later and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, normally **http://localhost:5173**. Click **Begin your journey**. Audio starts after that first interaction.

```sh
npm test          # Physics, traversal, progression, combat, and save checks
npm run build     # Type checking and production build
npm run preview   # Serve the production build locally
npm run format    # Format source and documentation
```

The `dist/` directory is a standalone static site. Deploy its contents to any static web host at the site root. No backend is required. Current desktop browsers with Canvas 2D and Web Audio are supported. Mobile play is landscape-only, with touch controls. Portrait orientation displays a rotation prompt and pauses active play; turning back to landscape resumes it. Keyboard and a larger screen are recommended for the precise jumps.

## Controls

| Action                                         | Keyboard                     |
| ---------------------------------------------- | ---------------------------- |
| Move                                           | A / D or left / right arrows |
| Jump                                           | Space, W, or up arrow        |
| Sword                                          | J or K                       |
| Interact with doors, fountains, and mechanisms | E                            |
| Rewind                                         | Hold R                       |
| Slow Time                                      | Q                            |
| Sand Prison                                    | F                            |
| Time Dash                                      | Shift                        |
| Palace map                                     | M                            |
| Pause / close menu                             | Escape                       |
| Drop from a ledge                              | S or down arrow              |

Hold jump for full height. Jump while pressing into a wall to leap away from it. Holding jump toward a wall gives a short upward wall run. Ledges catch automatically while falling; jump to climb. Thin terraces can be jumped through from below. Movement includes 110 ms of coyote time and a 140 ms jump buffer. Chain three sword strikes within the combo window for a stronger final hit.

Touch players can use the on-screen arrows, jump, sword, and interaction buttons. Unlocked time powers also have clickable HUD controls. Clicking Rewind performs a one-second rewind; a keyboard allows continuous control.

## The Dagger and the palace

- **Rewind** retraces up to four seconds of recorded movement and health at double playback speed, consuming one sand unit per second held. It does not restore sand or consumed collectibles. Room transitions clear the recording. After death, a safe recorded moment can be restored for one grain when available.
- **Slow Time** costs one grain and slows enemies, moving platforms, and traps to one-quarter speed for six seconds. The Prince moves normally.
- **Sand Prison** costs two grains, freezes the room for four seconds, and doubles sword damage.
- **Time Dash** costs one grain and grants a short, invulnerable burst across gaps. Jump first; dashing near the top of your jump gives the most clearance.
- The Dagger holds six grains. Sand clouds and defeated enemies refill it. A spent dagger recovers one emergency grain after seven seconds, so required traversal never forces a restart.
- Fountains restore all health and sand and set your respawn point. Progress also saves when you claim a permanent upgrade or complete a story event. Reloading or continuing returns you to your last fountain with your permanent progress intact.
- Each new power raises the curse tier. Revisiting rooms spawns tougher enemies, some rooms gain archers or brutes, and sand rewards become scarcer. Restoring the sluice adds flowing water and reopens return shortcuts.
- Hidden rubies increase maximum health. The map records visited rooms, reveals adjacent passages, and marks fountains, unclaimed memories, and the next objective.

There is one local save slot per browser origin. Options are also stored locally. Private browsing or clearing site data can remove the save. If storage is blocked, the game remains playable for the current session and displays a notice. **Journey assist**, available in Options, reduces damage, lengthens hit protection, and slowly restores sand.

## Route guide

<details>
<summary>Show the main route and optional chambers</summary>

1. **Palace Courtyard → Hanging Gardens.** Learn movement and recover sand. Climb the terraces to claim Rewind. The Forgotten Baths are an early optional health upgrade room, reached from the courtyard's upper door.
2. **Sun Tower → Observatory.** Ascend alternating terraces and claim Slow Time beneath the celestial sphere.
3. **Royal Cistern → Garden of Reflection.** Use Slow Time to ride the moving platforms. Ride the vertical lift upward to reach Sand Prison on the eastern terrace. Restore the garden sluice on the next room's raised eastern terrace.
4. **Upper Palace → Corrupted Wing.** The restored water opens the courtyard lift and the Scriptorium return passage. The Scriptorium contains an optional health upgrade. Climb the upper palace columns to claim Time Dash, then cross the corrupted causeway and defeat the Sand Guardian.
5. **Bridge of the Hour → Throne of Dawn.** Jump and dash across the bridge. Rest at the last fountain. The Vizier's second phase adds a spread of sand bolts. Freeze him to create an opening; rewind mistakes when you have sand. Defeat him to restore the palace.

All opened rooms remain accessible. The courtyard's high ruby requires Time Dash. The final bridge has optional sand above the direct route.

</details>

## Code structure

The game uses TypeScript, Canvas 2D, the Web Audio API, and Vite. Rendering runs on `requestAnimationFrame`; simulation runs at a fixed 120 Hz and caps accumulated time after interruptions. Losing focus pauses play.

| Module                    | Responsibility                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `src/game/world.ts`       | Room geometry, connections, collectible locations, hazards, spawn points, and map coordinates |
| `src/game/types.ts`       | Shared world and runtime types                                                                |
| `src/game/progression.ts` | Ability metadata, gates, objectives, and enemy scaling                                        |
| `src/game/Game.ts`        | Simulation orchestration, time powers, combat, story events, and checkpoints                  |
| `src/game/physics.ts`     | Collision, movement, ledges, coyote time, jump buffering, and moving platforms                |
| `src/game/enemies.ts`     | Enemy spawning, patrols, telegraphs, ranged attacks, and boss phases                          |
| `src/game/input.ts`       | Keyboard and touch action state                                                               |
| `src/game/storage.ts`     | Validated, versioned local saves and options                                                  |
| `src/game/audio.ts`       | Synthesized score and sound effects                                                           |
| `src/render/`             | Procedural scenery, cached terrain, animated actors, and effects                              |
| `src/ui/`                 | Menus, HUD, SVG exploration map, controls, and styles                                         |
| `tests/`                  | Movement and gameplay checks, plus a continuous campaign playthrough                          |

To add a room, define a `Room` in `world.ts`, give it unique pickup IDs, add reciprocal door connections, and assign a map position. Set its `mapLabel` for the exploration map. Gates use typed ability or story requirements; objectives and tier rules belong in `progression.ts`. Room artwork follows its theme. Renderers read game state without changing simulation.

The tests exercise real fixed-step jumps through the main terraces, tower, cistern, and final bridge, along with gate reachability, return connections, sand costs, rewind behavior, damage, saving, and the ending. A continuous campaign test reaches the ending using movement, combat, and time powers with enemies active, without teleporting or granting resources. The Vite development build exposes `window.__sands` for inspection. This inspection handle is excluded from the production build.
