# CROSSCUT quality pass

The tactical pass adds three pooled grenade types: G fragmentation, X smoke (14 seconds of sight denial), and F flash (a forward cone that blinds bots for 3 seconds). Smoke intersects the bot's actual sight segment; holders stop and rushers push slowly. Flash clears target visibility and forces reaction delay on reacquisition. Smoke uses generated radial canvas textures and pooled puffs.

Bot budgets persist between rounds. Eco/force/full cycles are gated by available money; buys change weapon silhouette, firing cadence, armour and kit ownership. Six patrol routes provide two approaches per site and mid control. Planted charges trigger a brief retreat, graph-based rotation, angle holding and a single nearby defuser. Visible enemies interrupt defusing. A $400 kit halves the seven-second defuse duration to 3.5 seconds; the field kit also permits charge recovery with E. The HUD shows fuse seconds and defuse progress.

The three connected lanes now include a corrugated container, low blast wall, two accessible elevated site positions and catwalk rails. A single sun uses supported filtered PCF shadows; matching sky/fog and two differently coloured warm site lamps give depth and site identity. Canvas signs and floor labels mark sites and lanes.

Presentation adds weapon-labelled kill messages, directional incoming-damage arcs, low-ammo prompts, Tab scoreboard with bot buys/budgets/roles, quiet walking with smaller hearing radius, metal/concrete footstep sounds and a magazine/hand reload animation. Existing round-win banners remain connected to authoritative round results.

Responsibilities are separated into weapon definitions, purchases, viewmodel geometry, weapon handling, bot tactics and visibility queries. Every gameplay module starts with an ownership comment. Fixed simulation stays separate from rendering. Grenades and smoke are pooled; spatial queries reuse scratch vectors. Vendor files are untouched.

## Source line counts

| File | Lines |
|---|---:|
| `game/index.html` | 554 |
| `game/src/actors.js` | 88 |
| `game/src/audio.js` | 57 |
| `game/src/bots.js` | 230 |
| `game/src/buy.js` | 46 |
| `game/src/equipment.js` | 55 |
| `game/src/grenades.js` | 134 |
| `game/src/hitboxes.js` | 39 |
| `game/src/hud.js` | 141 |
| `game/src/input.js` | 62 |
| `game/src/main.js` | 85 |
| `game/src/navigation.js` | 65 |
| `game/src/objective.js` | 59 |
| `game/src/palette.js` | 13 |
| `game/src/player.js` | 143 |
| `game/src/rounds.js` | 57 |
| `game/src/scenery.js` | 125 |
| `game/src/simulation.js` | 46 |
| `game/src/state.js` | 61 |
| `game/src/tactics.js` | 34 |
| `game/src/viewmodel.js` | 52 |
| `game/src/visibility.js` | 18 |
| `game/src/weapon.js` | 116 |
| `game/src/world.js` | 108 |

Gameplay JavaScript: **1,834 lines across 23 modules**. Largest module: **230 lines** (cap 250). HTML: **554 lines**. HTML plus gameplay JavaScript: **2,388 lines**.

## Final check output

Commands: `node serve.ts`, `node .checks/browser.mjs`, `node .checks/capture.mjs`, `python .checks/audit.py`, `MAKEFUN_OUTPUT_DIR=out node main.ts`, `git diff --check`.

```text
PASS: static ES modules, WebGL render, pointer lock
PASS: buy menu purchase, live round, movement, crouch, firing, reload
PASS: grenade throw and Escape pause
PASS: collision, movement, ammo, headshots, armour, cover, all routes, hearing, return fire, frag, plant, retake, defuse, explosion, round/match end; smoke inventory/LOS/expiry/orders, flash target loss/recovery, eco/force/full budgets, safe defuse and 3.5s kit
Console: clean (0 errors, 0 warnings)
PASS: round duties rotate; four actual WebGL renders captured
Browser console: clean (0 errors, 0 warnings)
PASS: one local import map; 43 resolved imports; no network dependencies or symlinks; 32 files/directories; 2,218,141 bytes
PASS: every source module is at most 250 lines
PASS: screenshots/1-relay.jpg: 1280×720, 110,766 bytes
PASS: screenshots/2-contact.jpg: 1280×720, 114,614 bytes
PASS: screenshots/3-requisition.jpg: 1280×720, 129,537 bytes
PASS: screenshots/4-charge.jpg: 1280×720, 87,503 bytes
```

Browser checks also purchase a kit and hold Tab to verify the scoreboard. All four screenshots were retaken from actual WebGL renders of the final source. Capture tooling stages positions and pauses simulation for readability; the firefight resolves real shots/return fire and the smoke capture invokes grenade detonation and planting systems. No remote requests are needed by the game.

The initial unsupported PCFSoftShadowMap warning was fixed by using the pinned library's supported PCFShadowMap with filter radius 3. Final browser and capture checks have no warnings or errors. Packaging completed successfully and rebuilt `out/dossier.json` with exactly four images. `git diff --check` completed with no output.
