# Sands of Time

A 2D Metroidvania adaptation of _Prince of Persia: The Sands of Time_. The main campaign represents all forty milestones in [IGN’s walkthrough](https://www.ign.com/wikis/prince-of-persia-the-sands-of-time/Walkthrough), in their original order, from the Maharajah’s palace to the Grand Rewind and the confrontation in Farah’s chamber. Layouts, puzzle solutions, time-power unlocks, and combat are adapted for this 2D game.

Play through palace defenses, warehouses, the zoo and aviary, baths, bridges, caverns, a reservoir, the harem, library and observatory, prison, the Tower of Dawn, and the tomb. Farah follows, assists with her bow, holds remote switches, and needs protection during the elevator battle. The later campaign removes the Dagger and its time powers, introduces the final sword, then restores the Dagger before the Grand Rewind. The Vizier remains protected until three successive doubles have fallen; return the Dagger to Farah to finish the story.

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
npm run test:harness # Complete campaign and standalone boss runs, without a browser
npm run harness   # Open the rendered, immortal campaign harness
npm run build     # Type checking and production build
npm run preview   # Serve the production build locally
npm run format    # Format source and documentation
```

The `dist/` directory is a standalone static site. Deploy its contents to any static web host at the site root. No backend is required. Current desktop browsers with Canvas 2D and Web Audio are supported. Mobile play is landscape-only, with touch controls for movement, jumping, combat, interaction, and dropping or climbing. Portrait orientation displays a rotation prompt and pauses active play; turning back to landscape resumes it. Keyboard and a larger screen are recommended for the precise jumps.

## Game harness

Run `npm run harness`, or start `npm run dev` and open **http://localhost:5173/?harness=campaign**. The automated player traverses all forty sections using normal inputs through the real 120 Hz simulation. It solves mechanisms, timed gates, weighted plates, companion switches, mirrors, illusion passages, and retracting columns; crosses bars, ropes, ladders, bridges, and moving platforms; and completes the story in order. Campaign playback never teleports or grants powers or resources.

The toolbar offers pause, single-step, restart, 1×/4×/16× playback, JSON report download, and manual takeover. **Play manually** releases automated inputs so you can practice the selected encounter. Restart to return to automation. Audio starts muted. Harness progress and options stay in memory without reading or overwriting your normal save.

- `/?harness=campaign&speed=16` plays the full adaptation faster.
- `/?harness=king` starts the Sand King encounter with test equipment.
- `/?harness=vizier` starts the three doubles and final Vizier encounter after a fixture Grand Rewind.
- `&autoplay=0` starts paused, useful before manual takeover.
- `&immortal=0` enables normal damage for the Prince and Farah.
- `/?harness=legacy` retains the earlier twelve-room palace campaign for regression checks. `&explore=0` uses its shorter main route; `/?harness=guardian` retains its custom Guardian encounter.

Immortality prevents combat and hazard damage and knockback. Falling out of a room still fails a run. A failure reports the current action, area, coordinates, and frame. The full report records forty ordered milestones, puzzle completion, enemy defeats, powers used, and the Dagger, Farah, and timeline state at every chapter boundary.

`npm run test:harness` runs the same driver without rendering, including the full adaptation, standalone encounters, and the earlier palace route. The browser exposes `window.__sandsHarness.report()`, `.pause()`, `.resume()`, and `.step(120)`. Explicit stepping works while paused. Both browser harnesses are excluded from production builds.

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
| Drop from a ledge or thin terrace              | S or down arrow              |

Hold jump for full height. Jump while pressing into a wall to leap away from it. Ledges catch automatically while falling; jump to climb or press down to drop. Press down to drop through thin terraces. Bars and ropes catch automatically: release jump, then press it again while holding a direction to launch toward the next grip. On ladders, hold jump to climb, down to descend, and move sideways to dismount.

Hold **E + move** to push or pull crates. Use E at cranks, timed levers, and Farah switches. Align the gold crank pointers with the pale green marks. At mirrors, E rotates; hold **down + E + move** to slide the movable mirror. Light must actually reach the receiver. Follow the water ripples and passage labels at illusion doors. Stronger swords can break cracked walls.

Touch players can use the on-screen arrows, jump, sword, and interaction buttons. Unlocked time powers also have clickable HUD controls. Clicking Rewind performs a one-second rewind; a keyboard allows continuous control.

## The Dagger and the palace

- **Rewind** retraces up to four seconds of recorded movement and health at double playback speed, consuming one sand unit per second held. It does not restore sand or consumed collectibles. Room transitions clear the recording. After death, a safe recorded moment can be restored for one grain when available.
- **Slow Time** costs one grain and slows enemies, moving platforms, and traps to one-quarter speed for six seconds. The Prince moves normally.
- **Sand Prison** costs two grains, freezes the room for four seconds, and doubles sword damage.
- **Time Dash** costs one grain and grants a short, invulnerable burst across gaps. Jump first; dashing near the top of your jump gives the most clearance.
- The Dagger holds six grains. Sand clouds and defeated enemies refill it. A spent dagger recovers one emergency grain after seven seconds, so required traversal never forces a restart.
- Fountains restore health, restore sand while you hold the Dagger, heal Farah, and set your respawn point. Reaching a new story section also refills health and available sand, creates a checkpoint, and saves. Progress also saves when you claim a permanent upgrade. Reloading or continuing returns you to your last fountain with your permanent progress intact.
- Each learned power raises the curse tier, strengthening enemies and reducing sand rewards. Later swords increase damage; the final sword destroys ordinary creatures in one blow. The Dagger’s ownership is separate from learned powers, so the tomb and return climb disable all time powers until the Dagger is recovered.
- Hidden rubies increase maximum health. The campaign map lists visited areas, the current area, and the next objective. The legacy palace map retains its connected-room view.

The expanded campaign has its own versioned local save slot per browser origin, `sands-of-time:campaign:v2`. It records ordered milestones, puzzle states, sword upgrades, Dagger ownership, Farah’s story state, and the Grand Rewind. The earlier palace save slot is preserved separately. Unfinished combat waves restart on reload or death so a partially saved battle cannot skip opponents. Options are also stored locally. Private browsing or clearing site data can remove the save. If storage is blocked, the game remains playable for the current session and displays a notice. **Journey assist**, available in Options, reduces damage, lengthens hit protection, and slowly restores sand.

## Route guide

<details>
<summary>Show the main route and optional chambers</summary>

1. **India and Azad.** Cross the siege, climb the treasury for the Dagger, survive the release of the Sands, and find Farah.
2. **Palace defenses.** Align the defense machinery, race timed gates, cross the courtyard, defeat the transformed King Shahraman, and cooperate with Farah.
3. **Tower, warehouse, zoo, and cliffs.** Climb the early tower, weight the warehouse plate, open the enclosure with Farah, and cross the aviary bars and cliff ropes.
4. **Baths and soldiers’ quarters.** Move bathhouse machinery, drain the upper passages, collect the stronger sword, break cracked walls, and clear the mess hall.
5. **Bridges and waterfall.** Coordinate the drawbridge, cross broken spans, separate from Farah, and descend by the falls.
6. **Underground waterworks and harem.** Climb ladders, ride the slowed ferry and water lift, escape the well, and reunite with Farah.
7. **Learning and astronomy.** Align and position the mirrors, climb the library, operate the observatory, and cross the courtyard ropes and ramparts.
8. **Prison and the first tower approach.** Extend both prison columns, escape before they retract, defend Farah on the rising elevator, and reach the Hourglass. The attempt fails.
9. **Tomb and return climb.** Follow the water echoes, recover the final sword, and pursue Farah without the Dagger. Reach her at sunset, regain the empty Dagger, clear the chamber, and perform the Grand Rewind.
10. **Honor and Glory.** Back in India before the invasion, defeat three Vizier doubles in sequence. Strike the exhausted Vizier after his shield falls, then return to Farah and give back the Dagger.

Optional health upgrades and sand clouds sit along the traversal routes. Completed passages can be revisited before the Grand Rewind; after it, the story moves to the restored timeline.
</details>

## Code structure

The game uses TypeScript, Canvas 2D, the Web Audio API, and Vite. Rendering runs on `requestAnimationFrame`; simulation runs at a fixed 120 Hz and caps accumulated time after interruptions. Losing focus pauses play.

| Module                    | Responsibility                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `src/campaign/`           | Forty story sections, area geometry, reusable puzzles, Farah, chronology, and campaign saves  |
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
| `src/harness/`            | Shared campaign input driver, boss fixtures, reports, and development playback controls       |
| `tests/`                  | Movement and gameplay checks, plus a continuous campaign playthrough                          |

To add a story area, define its milestone in `src/campaign/sections.ts`, select or add geometry in `layouts.ts`, and use a typed puzzle in `types.ts`. The world generator builds reciprocal connections and unique pickup IDs. Add its traversal to `CampaignHarness.ts` and its expected position to the independent milestone list in `tests/adaptation.test.ts`. Legacy palace rooms remain in `src/game/world.ts`. Renderers read game state without changing simulation.

The tests exercise real fixed-step jumps through the main terraces, tower, cistern, and final bridge, along with gate reachability, return connections, sand costs, rewind behavior, damage, saving, and the ending. The full campaign harness verifies all forty milestones, physical puzzles and traversal, companion cooperation, Dagger loss, the Grand Rewind, and the final doubles. The earlier palace harness remains a regression check. Both use movement, combat, and time powers with enemies active, without teleporting or granting resources in campaign runs. The Vite development build exposes `window.__sands` for inspection. This inspection handle is excluded from the production build.
