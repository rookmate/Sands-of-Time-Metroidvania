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
npm run test:resilience # Bounded seeded interruptions with replay checks
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
- `/?harness=campaign&immortal=0&rewards=patience` or `&rewards=stillness` takes both optional Baths reward routes with the selected seal. Without `rewards`, the driver declines both rewards; `&explore=0` also skips the maintenance loop.
- `/?harness=king` starts the Sand King encounter with the health, sword, and powers available at that point in the campaign.
- `/?harness=vizier` starts the three doubles and final Vizier encounter after a fixture Grand Rewind, with the final sword and twelve health. Retrying either practice fight returns to that encounter.
- `&autoplay=0` starts paused, useful before manual takeover.
- `&immortal=0` enables normal damage for the Prince and Farah.
- `/?harness=legacy` retains the earlier twelve-room palace campaign for regression checks. `&explore=0` uses its shorter main route; `/?harness=guardian` retains its custom Guardian encounter.

Immortality prevents combat and hazard damage and knockback. Falling out of a room still fails a run. A failure reports the current action, area, coordinates, and frame. The full report records forty ordered milestones, puzzle completion, enemy defeats, powers used, and the Dagger, Farah, and timeline state at every chapter boundary.

`npm run test:harness` runs the same driver without rendering, including immortal and normal-damage campaigns, standalone encounters, checkpoint reload validation, and the earlier palace route. The browser exposes `window.__sandsHarness.report()`, `.pause()`, `.resume()`, and `.step(120)`. Explicit stepping works while paused. Both browser harnesses are excluded from production builds.

### Farah and the bell spillway

After draining the Baths, ask Farah at the narrow service stair in the sluice machinery. She climbs the marked stair to the valve loft while the Prince follows the bell pipe into the adjoining spillway. The lower bell asks her to raise a permanent teaching step. Climb that step to the upper bell, which signals an eight-second span. Cross with ordinary jumps and pull the far-bank latch before pressure runs out. Slow and Freeze can ease the window; Dash is not needed.

An expired span drops without closing the return route. The floor and spillway fountain let you retry; a steam vent marks the fall route to avoid. Each upper-bell signal resets the whole window. The far-bank latch keeps the bridge raised permanently and opens the loft stair. Reunite with Farah at her valve to open the reservoir service shortcut, which joins the existing regional loop. Once started, the upper-pools story exit asks you to reunite before continuing. You can leave the cooperation route entirely unstarted and still finish the story. The room caption, current objective and map say where Farah is and what each bell does.

Journey schema v4 adds only the authored cooperation phase, stair travel and current pressure window. It migrates v1, v2 and v3 in the existing save slot without starting this optional sequence or granting rewards. Steps, latch and reunion save immediately, remain outside movement rewind, and survive Retry, checkpoint reload and revisits. Farah's following/separated/gone/dead/restored story state stays separate. Later story events retain control of her chronology.

The campaign harness takes this route by default. `&cooperate=0` declines it. `/?harness=campaign&immortal=0&seed=42&rewards=stillness` also exercises seeded disruptions: death and checkpoint reload after the teaching step, an expired span, a missed jump onto the lower floor, and a fresh signal before the successful crossing. Compressed inputs replay these events independently of the route planner. Focused tests also cover reload while scouting, after the latch and after reunion, plus old-save migration and the complete campaign with cooperation declined.

### Optional Baths discoveries

The reservoir's cracked service arch is visible on the first visit. Drainage raises its landing; the stronger sword and Time Dash open it on a return visit. Inside the Keeper cistern, a five-second shutter tests the high-ledge jump and Dash crossing. Existing Slow Time or Sand Prison can ease the timing. The vessel increases maximum sand from six to eight and fills the Dagger once. Fountains and Retry refill the larger capacity. An inscription on the far shelf records the workers who used the conduit to escape the siege.

The maintenance conduit's far bank has a marked upper branch into the Echo gallery. Its two seals offer one permanent choice, made with E beside a seal:

- **Patient current** extends Slow Time from six to nine seconds at the usual one-sand cost.
- **Still current** reduces Sand Prison from two sand to one, with its four-second duration unchanged.

Choosing one closes the other. Both can be declined. The effects and permanence are shown before choosing, and the map records discoveries. The conduit still opens the rotunda shortcut, so its reward branch joins a useful return loop. Dash distance, sword gates, water controls, and all forty narrative milestones keep their existing rules. No optional reward is required to finish the story.

Fixed-step mortal routes cover both choices, the timed challenge, reward persistence, and the complete story with all new rewards declined. Seed 42 also takes the reward routes during disruption/reload and independent input replay checks. Rendered recordings establish route reachability and feedback, not a measured first-playthrough duration. Blind human discoverability and total campaign pacing remain unmeasured.

## Interconnected palace regions

The wider palace adds nine authored rooms to the same `CAMPAIGN_ROOMS` graph. Gardens use a split cypress and its irrigation pipe as landmarks; Learning uses the Hall receiver, shutter bridge and suspended roof equipment; Prison uses cell tiers, a counterweight shaft and the warden's release. The palace map shows physical connections separately from forty story milestones. Doors and the map share `doorBlock`; arrival gates prevent side routes from skipping story or companion chronology.

`palace.ts` owns these rooms, four permanent mechanism flags, changed platforms and local controls. `PalaceRoutes.ts` records actual movement through both goal orders and the cross-region shortcuts. `BathsRoutes.ts` holds the unchanged pilot routes, keeping the main harness below 1,000 lines. No new power, quest framework, backend or world-history rewind is added.

To run either route in the development browser:

```text
/?harness=campaign&immortal=0&order=gardens-first
/?harness=campaign&immortal=0&order=sky-first&seed=42&rewards=stillness
```

The seeded routes also miss the expired shutter onto its safe floor, reset the lever, and retry/reload after each permanent regional change. Recorded input replay checks the same final state independently of route planning. Tests cover early aqueduct access, both full-campaign orders, mandatory upgrades and Farah's convergence, v4 checkpoint migration, and the explicit no-return gate. Rendered playtests and videos assess geometry, labels and recovery. They do not measure human completion time; blind discoverability, difficulty and first-playthrough pacing still need human testing. The 4–6 hour ambition remains unmeasured. Final rendered mortal runs completed all forty anchors in both orders without browser errors. Gardens-first finished with optional rewards declined; seed 42 used sky-first, both reward chambers, thirteen injected death/Retry events and checkpoint reloads. Screenshots were inspected for the conduit, shutter failure/reset, suspended roof, cell shaft, readable map and Hourglass warning. Reports, compressed input routes and videos are stored in the local ignored `artifacts/palace/` directory.

## Campaign resilience

`npm run test:resilience` runs seeds 7, 42, and 2026 with normal damage and assist off. Each run has a 240,000-frame budget. The driver varies attack cadence, jump release and dash timing, revisits all 37 legal return passages and checks the sealed Hourglass return before the Grand Rewind, lets timed gates and prison columns expire, and interrupts mechanisms and later combat waves with lethal damage and Retry or checkpoint reload. It saves partial crank, crate, and mirror progress at fountains, and reloads while hanging from grips and riding the water lift. Reloads round-trip the campaign save parser and continue in a fresh game. These runs never read or write the player's local storage.

Every run records held keys and new presses at 120 Hz, plus explicit death/Retry and reload events. The suite replays that sequence without the route planner and checks the resulting player, story, enemies, platforms, and checkpoint. A failure writes its input sequence, seed, error, and final state to the ignored `artifacts/resilience/seed-<seed>.json` file. Replay compares against that captured state; it does not claim the failed route completed. After a fix, rerun the seed to prove it reaches the ending.

```sh
SANDS_SEED=42 npm run test:resilience
SANDS_REPLAY=artifacts/resilience/seed-42.json npm run test:resilience
```

The campaign harness's failure report also includes its compressed input events in `replay`. Lethal interruptions are test faults through the normal damage and Retry path; traversal and puzzle solutions still use player inputs. The suite samples bounded variations, rather than proving every possible input sequence safe.

## Waterkeepers' time echoes

The optional Echo gallery branch now leads to three connected chambers. Echo threshold teaches a recorded wait on a striped pressure plate. Answering bells asks you to record a run and an E press at the marked bell, then hold the plate yourself during playback. Together they open a four-second gate, leaving time to cross to its permanent latch. Divided ascent combines an elevated plate, a delayed bell and a raised traversal span. Its lower floor catches a missed jump. The final latch keeps the span up and opens a return arch into the gallery. None of these rooms advances a story milestone or grants a combat/resource reward; the forty story anchors and Farah's route remain intact.

Inside these chambers, with the Dagger held, press **C** while standing to spend one sand and record up to eight seconds. Press C again after at least half a second to release an echo. At eight seconds playback starts automatically. It repeats the movement and marked-bell presses for at most 24 seconds, returning to its starting mark each loop. The Prince can act elsewhere. C during playback spends one sand to replace the tape from the Prince's current position. **X** cancels without refund. The HUD has equivalent record/replay/replace and cancel buttons for touch. E and the HUD interaction prompt both record a bell press. A striped plate accepts either the Prince or an echo; Farah remains your companion and cannot substitute for an echo plate.

Echoes use the same movement and collision rules as the Prince. Only movement and marked bells replay. They cannot fight, collect, spend powers, interact with doors or fountains, command Farah, progress the story or write a save. Other time powers cancel the tape and run normally. Pause freezes both actors. Room transitions, death/Retry and reload clear the tape and temporary bell/gate state. Secured latches save immediately and remain open across death and reload; recording buffers are never saved. Each entry fountain restores sand and provides a safe retry. Journey assist still restores sand normally; turning off camera shake also keeps the echo's decorative pose animation static. This mechanic is local to striped chambers, separate from the Dagger's normal movement/health rewind.

Development proof route: `/?harness=campaign&immortal=0&autoplay=0&echoes=1`. Add `&seed=42&order=sky-first` for the seeded alternate-order route. Both routes use real fixed-step inputs from the campaign start through all three chambers, the return loop and all forty anchors. Input tapes replay independently of the route planner. This is proof of reachability and state consistency, not a measured first-playthrough duration.

The rendered mortal echo route completed all forty anchors without browser errors. Captures show the recorded plate hold, bell replay, divided span, safe-floor recovery and actual Retry button. A normal game page at 932 × 430 also passed Continue, touch record/replay/cancel and subsequent keyboard controls. The suite has 139 passing tests plus one conditional replay skip; it covers recording limits, sand costs, replacement/cancel, pause, normal rewind, touch-style power pulses, failed crossings, save migration and independent input replay. Reports, input events, screenshots and videos are retained locally in the ignored `artifacts/echoes/` directory. Blind puzzle discoverability and human pacing remain unmeasured.

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
| Record / replay / replace a local echo         | C                            |
| Cancel echo                                    | X                            |
| Palace map                                     | M                            |
| Pause / close menu                             | Escape                       |
| Drop from a ledge or thin terrace              | S or down arrow              |

Hold jump for full height. Jump while pressing into a wall to leap away from it. Ledges catch automatically while falling; jump to climb or press down to drop. Press down to drop through thin terraces. Bars and ropes catch automatically: release jump, then press it again while holding a direction to launch toward the next grip. On ladders, hold jump to climb, down to descend, and move sideways to dismount.

Hold **E + move** to push or pull crates. Use E at cranks, timed levers, and Farah switches. Align the gold crank pointers with the pale green marks. At mirrors, E rotates; hold **down + E + move** to slide the movable mirror. Light must actually reach the receiver. Follow the water ripples and passage labels at illusion doors. Stronger swords can break cracked walls.

Touch players can use the on-screen arrows, jump, sword, and interaction buttons. Unlocked time powers also have clickable HUD controls. Clicking Rewind performs a one-second rewind; a keyboard allows continuous control.

## The Dagger and the palace

- **Rewind** retraces up to four seconds of recorded movement and health at double playback speed, consuming one sand unit per second held. It restores recorded handholds but does not restore sand or consumed collectibles. Room transitions clear the recording. After death, a recorded landing or handhold can be restored for one grain if it is still supported and clear of solid obstacles.
- **Slow Time** costs one grain and slows enemies, moving platforms, and traps to one-quarter speed for six seconds. The Prince moves normally.
- **Sand Prison** costs two grains, freezes the room for four seconds, and doubles sword damage.
- **Time Dash** costs one grain and grants a short, invulnerable burst across gaps. Jump first; dashing near the top of your jump gives the most clearance.
- The Dagger holds six grains. Sand clouds and defeated enemies refill it. A spent dagger recovers one emergency grain after seven seconds, so required traversal never forces a restart.
- Fountains restore health, restore sand while you hold the Dagger, heal Farah, and set your respawn point. Reaching a new story section also refills health and available sand, creates a checkpoint, and saves. Progress also saves when you claim a permanent upgrade. Reloading or continuing returns you to your last fountain with your permanent progress intact.
- Each learned power raises the curse tier, strengthening enemies and reducing sand rewards. Later swords increase damage; the final sword destroys ordinary creatures in one blow. The Dagger’s ownership is separate from learned powers, so the tomb and return climb disable all time powers until the Dagger is recovered.
- Hidden rubies increase maximum health. The campaign map separates ordered story milestones from connected Baths and palace region maps, including visible gated passages and regional water state. The legacy palace map retains its connected-room view.

The expanded campaign has its own versioned local save slot per browser origin, `sands-of-time:campaign:v2`. It records ordered milestones, puzzle states, sword upgrades, Dagger ownership, Farah’s story state, the Grand Rewind, and persistent Baths intake, drainage and shortcut state. Journey schema v12 migrates v1 through v11 saves in the same slot, including old Baths checkpoints and pickup IDs. It retains the permanent time-seal choice and waterkeeper inscription and retains the local spillway cooperation state. It adds garden irrigation, the roof lens, the prison counterweight and the warden release. Older saves already beyond Learning or Prison receive those regions' completed gates, so new content cannot strand an existing late-game save. Sand capacity is derived from the collected vessel, so an older save starts with its original six measures. The earlier palace save slot is preserved separately. Unfinished combat waves restart on reload or death so a partially saved battle cannot skip opponents. Options are also stored locally. Private browsing or clearing site data can remove the save. If storage is blocked, the game remains playable for the current session and displays a notice. **Journey assist**, available in Options, reduces damage, lengthens hit protection, and slowly restores sand.

## Route guide

<details>
<summary>Show the main route and optional chambers</summary>

1. **India and Azad.** Cross the siege, climb the treasury for the Dagger, survive the release of the Sands, and find Farah.
2. **Palace defenses.** Align the defense machinery, race timed gates, cross the courtyard, defeat the transformed King Shahraman, and cooperate with Farah.
3. **Tower, warehouse, zoo, and cliffs.** Climb the early tower, weight the warehouse plate, open the enclosure with Farah, and cross the aviary bars and cliff ropes.
4. **Baths and soldiers’ quarters.** From the rotunda, climb above the steam vents to the reservoir balcony. Open its intake, descend along the pipe, then turn the wheel in the sluice machinery room. Drainage opens the rotunda stair, raises reservoir service piers, and opens the upper pools. Collect the stronger sword, continue to Daybreak to learn Time Dash, then choose whether to return to the upper pools’ cracked conduit. Jump and dash across maintenance to unlatch a permanent rotunda shortcut. Return to Daybreak, break its wall, and clear the mess hall.
5. **Bridges and waterfall.** Coordinate the drawbridge, cross broken spans, separate from Farah, and descend by the falls.
6. **Underground waterworks and harem.** Climb ladders, ride the slowed ferry and water lift, escape the well, and reunite with Farah.
7. **Gardens, Learning and astronomy.** Restore garden irrigation and pin the roof lens in either order before leaving Learning. Reach the Gardens through the Hall terraces, or return earlier through the upper Baths aqueduct with the stronger sword and Dash. Cross the root conduit to its wheel; irrigation raises the canopy stair and steps in the archive and cells. Its service stair returns directly to the canopy. Align the Hall mirrors, climb the archive ladder, cross the six-second shutter and pin the lens. The suspended lens-cleaning bars lead back to the cypress crown. Then climb the library, operate the orrery and cross the courtyard ropes and ramparts.
8. **Prison and the first tower approach.** Take the cell drain, wind the counterweight and cross the raised upper chain platform to the warden. Release the locks to open the upper cell shortcut and a stair back to the archives. Return to the prison columns, extend both and escape before they retract. Defend Farah on the rising elevator and reach the Hourglass. Finish exploration before descending from the Hourglass: this marked point of no return seals the old palace and the Dagger is lost.
9. **Tomb and return climb.** Follow the water echoes, recover the final sword, and pursue Farah without the Dagger. Reach her at sunset, regain the empty Dagger, clear the chamber, and perform the Grand Rewind.
10. **Honor and Glory.** Back in India before the invasion, defeat three Vizier doubles in sequence. Strike the exhausted Vizier after his shield falls, then return to Farah and give back the Dagger.

Optional health upgrades and sand clouds sit along the traversal routes. Completed palace passages can be revisited until the Hourglass descent. The tomb and final climb remain connected until the Grand Rewind, which moves the story to the restored timeline.
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

`CAMPAIGN_ROOMS` is the canonical traversable graph. Each room holds its content and earliest narrative availability; doors explicitly name a milestone only when that exit advances the story. Optional rooms have no milestone exit. Completed exits travel without replaying story or rewards. `SECTIONS` remains the forty-anchor chronology, independent of room count. `baths.ts` owns the regional geometry, mechanisms and water-dependent platforms. Intake, drainage and the shortcut latch save immediately, survive Retry, and are excluded from movement rewind. Fountains and new story exits still define checkpoints.

The Baths now include the pilot’s six rooms, two optional reward chambers, and the bell spillway and valve loft. Steam ledges, the reversible reservoir ladder, the flooded stair and the Time Dash conduit provide different traversal decisions. The maintenance and cooperation loops are optional; a separate mortal campaign test declines it and reaches the ending. The three resilience seeds also kill/retry and reload after drainage, and replay those events without the route planner. Room count and automated traversal times are not estimates of a first human playthrough.

To add a story area, define its milestone in `src/campaign/sections.ts`, select or add geometry in `layouts.ts`, and use a typed puzzle in `types.ts`. The world generator builds the default sequential connections and unique pickup IDs; regional authors replace those doors in the canonical graph. Add its traversal to a focused route module consumed by `CampaignHarness.ts` and its expected position to the independent milestone list in `tests/adaptation.test.ts`. Legacy palace rooms remain in `src/game/world.ts`. Renderers read game state without changing simulation.

The tests exercise real fixed-step jumps through the main terraces, tower, cistern, and final bridge, along with gate reachability, return connections, sand costs, rewind behavior, damage, saving, and the ending. The full campaign harness verifies all forty milestones, physical puzzles and traversal, companion cooperation, Dagger loss, the Grand Rewind, and the final doubles. The earlier palace harness remains a regression check. Both use movement, combat, and time powers with enemies active, without teleporting or granting resources in campaign runs. The Vite development build exposes `window.__sands` for inspection. This inspection handle is excluded from the production build.

## The twin mirror wing

An optional branch on the echo gallery's lower floor leads to three connected rooms trapped between an intact moment and a ruined one. **E at a twin mirror** switches only this wing, for no sand. Ruin opens the reception wall and makes a stair from fallen columns; the intact upper arch opens the vault. Its striped plate and bell use the existing **C/X echo** rules. The unsent gift offers a permanent health heart and a rereadable dedication. No time-seal choice or sand vessel is required.

Switches clear temporary echoes, timed echo gates, active powers and movement rewind history. Earned latches and collected gifts remain. A present Farah moves beside the mirror with her health and story state unchanged; echoes never operate mirrors or act for her. Mirrors save a checkpoint on a shared landing without refilling resources. Retry and Continue preserve the selected moment. Every room has a safe floor and a westward return; the upper arcade can always be left by dropping to its lower floor. Normal rewind never switches the wing or undoes an earned outcome.

`eraWing.ts` owns only the wing's paired geometry and mirror interactions. `world.ts` still owns the campaign graph, `SECTIONS` still has forty story anchors, and `echoes.ts` remains the bounded replay controller. The journey adds only `wing: { era, discovered }`; its vault latch uses `echoes.solved`, and its heart uses the ordinary collected-pickup reward boundary.

For development playback, use `?harness=campaign&immortal=0&autoplay=0&wing=1`, optionally with `echoes=1&seed=42&order=sky-first`. `EraWingRoute.ts` records an input-only detour from maintenance and back. `tests/eraWing.test.ts` covers the mortal campaign, independent input replay, both switch directions, collision, missed stairs, save/reload, Retry, echo cleanup, Farah and the one-time reward. Chromium rendered proof also exercises ordinary Continue, keyboard mirrors and the touch interaction button. Automated routes establish reachability and recovery; blind human discoverability, difficulty and pacing remain unmeasured. No gameplay-hours estimate is inferred from these runs.

## The court's buried account

A court tablet, a gardener's ledger and an old architectural plan disagree about a fire in the palace's past. They point to the twin cypress reliefs on the Cypress court's lower floor. Examine the worn sill with E; hold Down and press E to put weight on its heel stone. The facing stays open. Inside, names, soot and bread shelves answer the tablet's accusation. This small historical discovery is separate from the mirror wing's unsent gift and from the reservoir.

The accounts can be read in either regional order, revisited or skipped. Observing the sill is enough to solve it without collecting every clue. The revealed room has a normal fountain, a one-time heart pickup using the existing twelve-health cap, and a return to the court. The map lists places to reread observations and shows the room after the facing opens. No story milestone, mandatory upgrade, Farah state or main objective depends on the mystery. The Hourglass's existing point of no return still closes palace exploration.

`history.ts` owns the authored evidence and local opening interaction. Journey v8 adds only read evidence IDs and the permanent facing flag; v1–v7 saves migrate in the same campaign slot with their existing discoveries intact. Earned evidence, the opening and pickups survive Retry and reload. The actual entrance remains in the canonical graph. No quest or dialogue framework is added.

Development route: `/?harness=campaign&immortal=0&autoplay=0&history=1`. Add `&order=sky-first&seed=42&wing=1&echoes=1` to combine the alternate clue order with predecessor detours and resilience checks. `tests/history.test.ts` covers both full mortal campaigns and independent input replay, early observation-only access, rereading after returns, one-time reward/death/reload behavior, v7 migration and a campaign that ignores the mystery. Local ignored `artifacts/history/` holds input traces, rendered clue placements, story panels, compact landscape captures, ordinary keyboard/touch interactions, death/Retry/reload proof and videos. These routes establish reachability and state behavior; blind human discoverability and pacing remain unmeasured.

## Hollow creatures in the service pens

The Zoo has an optional entrance to two animal-service rooms. In the ram's run, a horned sand creature sights the Prince during a long pawing telegraph, commits its direction, then charges. Jump clear to send it into the pale cracked masonry. Sword attacks cannot break that barrier. The breach stays open.

Beyond it, a scarab's weight extends two crossing stones while it stands on a striped plate. Freeze it with F, cross the stones, and secure the far latch with E. The latch keeps the crossing raised, and an ordinary one-time heart waits on the far ledge. Missed crossings land on a safe floor that returns west. Both rooms have fountains and recall bells. Recall restores a killed, fallen or misplaced creature, clears active time powers and movement memories, and preserves earned openings. These hollow creatures grant no combat sand, including after recall, Retry or reentry. Other combat rewards are unchanged. Farah waits outside the pens and rejoins on return; her narrative state does not change.

`enemyTraversal.ts` owns the authored geometry, pressure-plate contract, impact check and recall interactions. The ram is an opt-in brute behavior in the existing enemy simulation, using ordinary body collision and sword damage. The scarab uses the existing patrol and melee behavior. Crossing stones are ordinary one-way platforms. Journey v9 adds only `traversal: { broken, latched }`, migrating v1–v8 in the same slot. Neither encounter advances a story milestone or requires a time-seal choice, sand vessel, or Time Dash. The existing Hourglass cutoff remains.

Development route: `/?harness=campaign&immortal=0&autoplay=0&creatures=1`. Add `&order=sky-first&seed=42&wing=1&echoes=1&history=1` for the combined predecessor route. `EnemyTraversalRoute.ts` records normal inputs from the Zoo and back; it suppresses the harness's automatic sword pulses only inside the pens so it can intentionally preserve the mechanisms. Seven focused tests cover both full mortal regional orders and independent input replay, sword/ram separation, ordinary kills and no-sand recalls, fallen-creature recovery, missed crossings, an empty Dagger, death/Retry/reload, the one-time heart and v8 migration with predecessor state intact. Existing campaign and combat suites also run. Ignored `artifacts/enemy-traversal/` contains recorded inputs, Chromium reports, screenshots and video. Automated reachability is not a human pacing or discoverability measurement, and no gameplay-hours claim is made.

### Sahir, the split crest

Three optional split-crest passages lead from the Cypress court, Archive stair,
and flooded prison cells to Sahir's unfinished drills. Accept at the gold
standard with E. His hooked glaive sights a thrust for 0.95 seconds, then
commits in that direction. Jump clear and strike during his 1.6-second recovery.
The raised gallery and broken muster dais add a high cast with a white crest
and 1.1-second warning; their lower floors shelter the Prince and catch misses.
Normal Freeze, Slow, Dash and movement rewind still work.

His weapon rack identifies the palace drillmaster. Rereadable muster rolls
explain his last vigil. After the court and gallery, the last muster offers a
final rematch or a release at the lowered blue standard. Reading a roll teaches
the release. Both choices permanently end his encounters, leaving either a
resting Sahir or his broken glaive. The reward is this resolution, with no
mandatory upgrade or repeatable combat sand. The earlier palace-history mystery
and its witnesses remain separate.

Duels are opt-in and ordered even if the palace regions are explored in another
order. Later sites remain safe to investigate before earlier drills. The west
exit and fountains stay usable. Farah waits outside these rooms without changing
her story state. Partial fights reset on exit, Retry and Continue. Completed
drills and the final choice save immediately using the existing checkpoint.
Journey schema v10 migrates v1-v9 in the same campaign save slot; it adds only
`rival: { bouts, named, oath, outcome }`. It stores no live opponent or history.
The Hourglass still seals the old palace, so finish optional visits beforehand.

Validation: `npm test` includes two mortal full-campaign rival routes and exact
input replays, seed 42 with all preceding optional systems, interruption through
exit/death/Retry/reload at each duel, out-of-order visits, duplicate acceptance,
both irreversible outcomes, v9 migration, no combat-sand farming, a clean
ordinary jump dodge, high-cast shelter, a missed-dais recovery, and a complete
campaign skipping Sahir. For rendered routes use
`?harness=campaign&immortal=0&autoplay=0&rival=released` or
`rival=defeated&order=sky-first&seed=42&history=1&wing=1&echoes=1&creatures=1`.
Local `artifacts/rival` contains recorded input traces, browser reports,
screenshots and videos. Ordinary Continue keyboard play and compact landscape
controls are checked separately. Blind human discoverability, difficulty and
pacing remain unmeasured; these routes make no gameplay-hours claim.

### Optional movement chambers

The marked door at Cypress court's lower floor leads to three short practice
chambers after Time Dash awakens. The returning step teaches a wall kick onto a
high ledge. Hands above the court joins a rope catch and bar transfer. The patient
crossing combines a solid launch ledge, rope and midair Time Dash. Secure each
upper handprint with Interact to open the next chamber. Secured seals also return
you to the launch mat, so the west doors provide a short way home.

Striped catch mats retry misses immediately without damage. Round retry stones
restore practice sand; normal Rewind can recover a fall before the mat catches
it. Practice sand is borrowed for the chamber visit and restored to the incoming
amount on exit. Local retries and saved seals never change the main fountain
checkpoint. Reload and ordinary Retry return to that checkpoint while preserving
seals and the final landing's one-time life memory. Farah waits outside without
changing her story state. No timer, mandatory milestone or new ability is added.

Journey v11 migrates v1–v10 in the existing save slot. The only added persistent
field is `mastery.solved`, an ordered list of secured room ids. The canonical graph
still lives in `src/campaign/world.ts`; the forty narrative anchors are unchanged.

Development proof: `npm test -- tests/mastery.test.ts` exercises mortal campaigns
in both regional orders, independent input replay, earlier optional systems,
missed handholds/ledges, Rewind, depleted sand, exits, Retry/reload, ordered gates,
assist and one-time rewards. The rendered route is
`?harness=campaign&immortal=0&autoplay=0&mastery=1`; add
`&order=sky-first&seed=42&echoes=1&wing=1&history=1&creatures=1&rival=released`
for the integrated resilience route. Automated routes establish reachability,
not human pacing, difficulty, discoverability or hours of gameplay.

### A palace that remembers

The optional lamp store opens from the Root conduit's near bank after milestone 17. Nima, the lamp keeper, is trapped behind a solid fallen grille. Speak from the lower floor, climb the two oil shelves and press E at the high release, or leave her there. Freeing her raises the grille permanently and leaves a chalk arrow toward the lamp refuge off the Cypress crown. The refuge is empty and unlit before rescue; afterward Nima sits beside a lit lamp and bowls. There is no item reward, payment, deadline or campaign requirement.

A separate decision repairs the refuge's service lift. Climb its upper shelves and seat the fallen drive pin after restoring garden irrigation. Nima need not be rescued. The pin and cage lamp change visibly; until the warden opens the prison locks, the cage remains blocked. After release, the repaired lift connects the refuge directly to the warden's loft in both directions, shortening a return between Prison and the Gardens. Existing archive, cell and garden routes remain available without either decision. The Hourglass descent still seals returns to the old palace.

Journey schema v12 adds only `consequences: { nimaRescued, liftRepaired }`. Versions 1 through 11 migrate in the same save slot with both decisions false, preserving predecessor progress and ending saves. Actions save immediately without moving the main fountain checkpoint; Retry and Continue retain them. Repeated E cannot repeat the rescue or grant resources. Nima is static noncombat scenery with a stationary E interaction, so visits do not spawn enemies or vulnerable companions. Farah's existing chronology is unchanged.

For later stages, these two booleans are reliable payoffs. `liftRepaired && palace.prisonOpen` opens the reciprocal `refuge-lift` doors between `lamp-refuge` at x1150/floor650 and `warden-loft` at x750/floor650. The refuge's west door at x70/floor650 returns to `cypress-crown` at x900/floor650. `nimaRescued` supplies the occupied refuge, lamp and bowls. With Nima present, `history.read.includes("witness")` adds copied names above the beds and a spoken acknowledgement; `rival.outcome === "released"` adds a quiet split crest and acknowledges Sahir's mercy. The defeated outcome has its own brief acknowledgement. These read existing canonical state directly, so discovery or mercy before or after rescue works without another acknowledgement flag. This stage does not change the final sequence.

Development route: `/?harness=campaign&immortal=0&autoplay=0&consequences=1&history=1`. Add `&order=sky-first&seed=42&rival=released&wing=1&echoes=1&mastery=1&creatures=1` for the integrated alternate-order run. Eight focused tests cover both complete mortal routes and independent exact-input replay, actual grille collision/release, rescue and repair across death/Retry/reload, a dry empty refuge first, repair without rescue, rescue without repair, repeated actions, later acknowledgements, v11 migration and ending compatibility. Existing campaigns also finish while ignoring both decisions. Local ignored `artifacts/consequences/` holds recorded inputs, Chromium reports, screenshots and videos, plus normal keyboard rescue, actual Retry, ordinary Continue and landscape touch interaction proof. Automated routes establish reachable scenes and persistent results, not a human duration estimate. Blind discoverability, difficulty and pacing remain unmeasured.

### Beneath the reservoir

The three-knock pipe on the Sluice reservoir floor foreshadows an optional
pressure well on the first visit. E at x580/floor650 explains the cracked hatch
at x740/floor650. The hatch requires drained Baths, the upper-pool sword and
Time Dash. Neither this entrance nor the spring lift replaces any mandatory
Baths, garden or prison connection. All forty story anchors remain unchanged.

The descent has five connected spaces with different jobs:

- **Sounding well:** staggered descending landings, readable flood marks and a
  full west ladder back to the reservoir, even before any puzzle is solved.
- **Flood lock:** record a wait on the striped floor plate, then climb the
  opposite shelves through its grille and secure the upper latch. This uses
  the existing bounded C/X echo system, not an additional replay implementation.
- **Filter race:** jump from the raised launch lip and Time Dash across the
  broken upper channel. A full lower catch floor and west ladder recover misses,
  including empty-sand failures. Return to the lock fountain to refill. The
  far-bank wheel diverts poisoned runoff away from the spring.
- **Bronze keeper:** an environmental guardian, not a combat wave. Admit clean
  water at the lower inlet. Its west approach curtain warns for 1.5 seconds,
  fires for one second, then eases. Climb through that interval and secure the
  west relief. The second phase alternates shelf risers. Secure the east relief,
  then answer at the keeper's cupped hand. Slow and Freeze affect the cycle;
  normal rewind changes the Prince, not the water's history. The west retreat
  and entry fountain stay usable throughout.
- **Spring:** the keeper was protecting workers' drinking water. The repaired
  clay cup resolves its vigil. An ordinary optional heart waits on the high
  bank. The earned service lift links the spring to the Baths rotunda at
  x1120/floor650 in both directions, bypassing the steam route on later visits.

`world.ts` remains the canonical graph. `depthsRooms.ts` owns authored room data;
`depths.ts` owns only the local guardian and controls. Journey v13 adds
`depths: { diverted, seals: 0 | 1 | 2, resolved }`. Versions 1–12 migrate through
the existing slot with the descent untouched, preserving earlier decisions and
ending saves. Secured valves and resolution save immediately without moving
the fountain checkpoint. Live pressure cycles reset on exit, death, Retry or
Continue. Echo tapes clear at room boundaries. Farah waits above the narrow
shaft without changing her canonical story state. The existing heart collection
system prevents duplicate rewards. No earlier optional gift or decision is
required here.

Development proof: `?harness=campaign&immortal=0&depths=1&autoplay=0`, optionally
with `&seed=42&order=sky-first&echoes=1&wing=1&history=1&creatures=1&rival=released&mastery=1&consequences=1`.
`tests/depths.test.ts` covers continuous mortal routes and independent input
replay, early observation/gating, both recovery ladders, pressure damage and
Freeze, each saved relief through death/Retry/Continue, resolution, reciprocal
exit, one-time heart, migration and completion while ignoring the descent.

Rendered play found and corrected a too-short descent landing, an insufficient
Dash launch height, a guardian curtain that initially missed the intended climb,
and an outdoor backdrop that weakened the underground setting. The final route
waits on the safe shelf for the pressure to ease before climbing. Local salt-dark
cistern walls, pressure ribs, depth marks, visible pipe outlines and the bronze
keeper distinguish the region. Recorded routes and screenshots live in ignored
`artifacts/depths` in the owning worktree. Automated routes establish reachability
and persistence; blind human discoverability, difficulty and pacing remain
unmeasured. No playthrough-hours claim is made.

## Finale: the remembered service crown

After the Tower elevator, its broken inner stair sends the Prince and Farah
through three physical upper galleries of places they know. These are part of
Azad before the Hourglass descent, not memories or a second timeline.

- The **Baths rotunda crown** overlooks the drained basin and copper supply
  pipe. Climb the dry overflow shelves, jump then Dash to the wheel, and open
  the Hall grille. A lower floor catches misses; the entry fountain restores
  empty sand. Repairing the refuge drive earlier gives a lift directly to the
  wheel landing. Nima's lit niche acknowledges her rescue and marks the dry
  route. The old keeper's inscription provides the same route if she was missed.
- The **Hall clerestory** revisits light and water routing. The west mirror
  alternates between the lower drain and high receiver, with a visible beam.
  Aim high, climb the shelves, and pin the east receiver to lift the roof
  shutter. The dedication recognizes the buried witnesses if their names were
  discovered, but its diagram is readable without that discovery.
- The **warden's high chain** uses the prison winch over the cells. Climb the
  counterweight shelves, catch the bar while descending, then jump east.
  Missing returns to the lower floor. Releasing Sahir earlier leaves a level
  crossing here; defeating him leaves a distinct crest acknowledgment. Skipping
  the rival leaves the ordinary bar route intact.

All galleries have entry fountains and reciprocal returns. Only the existing
Hourglass descent seals the old palace. Dagger loss, the Tomb sword, Farah's
fall and Dagger recovery, the Grand Rewind, restored Farah, the Vizier and final
Dagger return retain their original forty-anchor order. The ending returns to
title or begins a new journey; Continue on a completed save returns to the
ending. Returning the Dagger clears remaining power effects and movement history.

`world.ts` builds the sole graph through `buildFinale`; `finale.ts` owns its
rooms, controls and gates. Existing per-room `PuzzleState` stores the overflow
latch in `activated`, and the Hall mirror in `values[0]` plus its receiver latch
in `activated`. Permanent actions save without moving the fountain checkpoint.
Retry resets narrative puzzle attempts, preserving these permanent gallery
mechanisms. No save version change is needed: journey v13 and all earlier
migrations retain their slot, rewards and chronology. Old checkpoints at the
Hourglass or later do not need to return through the new rooms. The local
mirror-wing era stays saved and confined to that wing; tapes and power effects
clear on room entry. The finale adds no rewards, ability grants or global
history reversal.

`tests/finale.test.ts` covers two full mortal campaigns and independent exact
input replay, skipped and completed optional paths, both permanent latches
through death/Retry/reload, a wrong receiver, depleted-sand misses, chain recovery,
reciprocal backtracking, local era/echo boundaries, legacy checkpoints before and
after the climax, ending Continue and new journey. The full suite passes 205
tests with one existing conditional replay skip; build and formatting also pass.
Rendered Chromium routes cover both campaigns, earlier callbacks and all three
galleries with no browser errors. A 932 × 430 ordinary page exercises keyboard
lift/wheel, the actual Retry button, reload/Continue and ending/title/new journey.
That direct Retry check caught and fixed a latch reset which a combined
Retry-then-reload test had hidden. Local ignored `artifacts/finale/` retains
reports, compressed inputs, videos, screenshots and review evidence.

This completes the nine additional expansion stages after the four regional
foundations. Blind human discoverability, difficulty and first-playthrough
pacing remain unmeasured. Room counts and automated route times do not establish
a four-to-six-hour playthrough.
