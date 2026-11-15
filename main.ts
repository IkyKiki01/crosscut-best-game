// Entry: main.ts — packages the entry for the judge.
// Produces out/game/ (static game), out/screenshots/ (browser renders) and out/dossier.json.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const sourceDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameSrc = join(sourceDir, 'game');
const gameDst = join(outputDir, 'game');
const screenshotsSrc = join(sourceDir, 'screenshots');
const screenshotsDst = join(outputDir, 'screenshots');
const dossierPath = join(outputDir, 'dossier.json');

function stageStaticFiles() {
  mkdirSync(gameDst, { recursive: true });
  cpSync(gameSrc, gameDst, { recursive: true });
  mkdirSync(screenshotsDst, { recursive: true });
  if (existsSync(screenshotsSrc)) cpSync(screenshotsSrc, screenshotsDst, { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all: game/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
function writeDossier() {
  writeFileSync(
    dossierPath,
    buildDossier(outputDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648 }),
  );
}

stageStaticFiles();
writeDossier();
