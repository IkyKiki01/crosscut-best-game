# CROSSCUT visual overhaul

The renderer now uses the vendored EffectComposer with RenderPass → GTAOPass → UnrealBloomPass → SMAAPass → OutputPass. ACES exposure is 1.05; bloom uses threshold 0.85, strength 0.35 and radius 0.6. AO uses eight samples at half resolution while final rendering remains full resolution. The fixed 120 Hz simulation module is unchanged.

All authored texture assets are canvas-generated at startup: stained concrete, linear concrete normals, chipped painted metal, wood planks, hazard stripes, smoke, muzzle glow and wayfinding. Colour maps use sRGB and tiled surface maps use repeat wrapping. Existing palette colours remain the basis for the scene.

Warm directional sunlight casts cached shadows across static map surfaces; a cool hemisphere fill, cyan A-site and amber B-site lights, gradient sky, matched exponential fog and subtle dust establish the lighting. Architectural trim, exterior industrial silhouettes and floor and wall signage give the lanes more depth. Moving sentinels use attached contact shadows instead of stale cached sun shadows.

The rifle now has a handguard, cylindrical muzzle, rail teeth, open reflex sight, charging handle, grip, magazine detail, gloved hands and sleeves. Movement bob, idle sway, recoil and magazine removal/reseating follow existing weapon state. Hitscan results drive tracers, surface sparks/dust and blood particles. The existing hit marker remains authoritative. A detailed planted charge includes cells, straps, antenna, light and a fuse display. The requisition menu shows every purchase in two columns over a blurred live scene.

Two compatibility adjustments are intentional. Three.js 0.187 removes PCFSoftShadowMap and internally converts it to PCFShadowMap; main.js selects that supported filtered replacement explicitly for r187, avoiding the deprecation warning while preserving the pinned Three.js files. GTAOPass excludes sprites and transparent VFX from its normal buffer so smoke, tracers and muzzle glow cannot create opaque AO silhouettes. Nothing is downloaded.

Capture tooling stages camera and actor positions, pauses simulation, invokes actual shots and grenade/objective systems, and records real WebGL output at 1280×720. The firefight capture asserts a real hit. JPEG files stay below 256 KiB. Browser automation waits for observed simulation outcomes instead of assuming software rendering can finish movement in 500 milliseconds.

Validation commands: `node .checks/browser.mjs`, `node .checks/capture.mjs`, `python3 .checks/audit.py`, `MAKEFUN_OUTPUT_DIR=out node main.ts`, and `git diff --check`.

```text
PASS: static ES modules, WebGL render, pointer lock
PASS: buy menu purchase, live round, movement, crouch, firing, reload
PASS: grenade throw and Escape pause
PASS: collision, movement, ammo, headshots, armour, cover, all routes, hearing, return fire, frag, plant, retake, defuse, explosion, round/match end; smoke inventory/LOS/expiry/orders, flash target loss/recovery, eco/force/full budgets, safe defuse and 3.5s kit
Console: clean (0 errors, 0 warnings)
PASS: round duties rotate; four actual WebGL renders captured
Browser console: clean (0 errors, 0 warnings)
PASS: one local import map; 58 resolved imports; no network dependencies or symlinks
PASS: every source module is at most 250 lines
```

The game contains 125 files/directories and approximately 2.72 MB of files, below the 993-entry / 48 MiB limits. Packaging and whitespace checks pass. All four screenshots are 1280×720 and below 256 KiB each.
