# CROSSCUT build report

Completed a static, offline tactical FPS using the pinned three.js module. The original tidal relay map has two colour-coded bomb sites, a connected mid route, cover, a stepped ramp and a rear observation catwalk. All artwork is styled geometry and generated canvas signage.

Gameplay includes 120 Hz fixed simulation with interpolated rendering; accelerated movement, crouching, jumping and collision; rifle, SMG, pistol and shotgun; finite magazines and reserves; reloads, moving spread, recoil, armour and head-sphere/body-capsule hits; pooled fragmentation grenades; patrol/hold/engage/rotate/defuse bots with sight cones, cover checks, hearing and reaction delay; planting, timed defusing and detonation; buy phases, money rewards, round restarts and first-to-five match completion. The HUD includes radar, health, armour, ammunition, score, timer, money, equipment, kill feed and charge status. Audio uses synthesized oscillators and a generated noise buffer.

Controls: mouse look/fire, WASD movement, Shift quiet walk, Ctrl crouch, Space jump, R reload, G frag, hold E to plant, B equipment, 1–7 requisition, Enter deploy early, Escape pause.

## Files and line counts

Source files are intentionally separated by job; no gameplay module exceeds 250 lines. The pinned vendor files and dossier helper were left untouched.

| File | Lines |
|---|---:|
| `game/index.html` | 549 |
| `game/icon.svg` | 4 |
| `game/src/actors.js` | 86 |
| `game/src/audio.js` | 54 |
| `game/src/bots.js` | 225 |
| `game/src/equipment.js` | 93 |
| `game/src/grenades.js` | 103 |
| `game/src/hitboxes.js` | 38 |
| `game/src/hud.js` | 133 |
| `game/src/input.js` | 62 |
| `game/src/main.js` | 85 |
| `game/src/navigation.js` | 62 |
| `game/src/objective.js` | 52 |
| `game/src/palette.js` | 13 |
| `game/src/player.js` | 142 |
| `game/src/rounds.js` | 56 |
| `game/src/scenery.js` | 114 |
| `game/src/simulation.js` | 45 |
| `game/src/state.js` | 56 |
| `game/src/weapon.js` | 165 |
| `game/src/world.js` | 98 |
| `main.ts` | 22 |
| `serve.ts` | 63 |
| `.checks/browser.mjs` | 28 |
| `.checks/capture.mjs` | 30 |
| `.checks/systems.js` | 44 |
| `.checks/audit.py` | 38 |
| `.checks/simulation.mjs` | 2 |
| `shots.json` | 6 |

## Browser console and checks

Command: `node serve.ts`, then `node .checks/browser.mjs` and `node .checks/capture.mjs`. Checks use the installed Chromium executable, with software ANGLE selected explicitly. The simulation assertions execute in the browser against the same modules as the game.

```text
PASS: static ES modules, WebGL render, pointer lock
PASS: buy menu purchase, live round, movement, crouch, firing, reload
PASS: grenade throw and Escape pause
PASS: collision, acceleration/friction, crouch, finite ammo, spread, headshots, armour, cover, all bot routes, hearing, return fire, grenade damage, plant, graph rotation, defuse, explosion, death, timeout, match end
Console: clean (0 errors, 0 warnings)
PASS: round duties rotate; four actual WebGL renders captured
Browser console: clean (0 errors, 0 warnings)
```

## Artifact validation

```text
PASS: one local import map; 37 resolved imports; no network dependencies or symlinks; 28 files/directories; 2,207,526 bytes
PASS: every source module is at most 250 lines
PASS: screenshots/1-relay.jpg: 1280×720, 100,223 bytes
PASS: screenshots/2-contact.jpg: 1280×720, 112,441 bytes
PASS: screenshots/3-requisition.jpg: 1280×720, 102,351 bytes
PASS: screenshots/4-charge.jpg: 1280×720, 73,198 bytes
```

Screenshots are real WebGL renders. The contact capture resolves actual hits and bot return fire; the charge capture invokes the plant system. Capture tooling stages positions and pauses simulation to make each screenshot readable.

## Packaging

Executed `MAKEFUN_OUTPUT_DIR=out node main.ts` using Node **v22.23.5**. The command completed successfully and wrote `out/dossier.json` (schema, cover, images and source text), with exactly four packaged screenshots. `main.ts` uses the Node standard library and the existing pinned local dossier helper.
