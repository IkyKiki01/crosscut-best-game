// hud.js — owns the DOM HUD, radar, damage bearing, scoreboard and round banner.
import { WEAPONS } from "./equipment.js";
import { PALETTE } from "./palette.js";

const RADAR_WIDTH = 160;
const RADAR_HEIGHT = 180;
const RADAR_SCALE = 4.4;
const RADAR_ORIGIN_X = 80;
const RADAR_ORIGIN_Y = 90;
const RADAR_PLAYER_RADIUS = 4;
const RADAR_HEADING_LENGTH = 12;
const RADAR_BOT_ORIGIN_X = 78;
const RADAR_BOT_ORIGIN_Y = 88;
const RADAR_BOT_SIZE = 4;
const RADAR_BORDER = { x: 7, y: 4, width: 146, height: 170 };
const RADAR_SPINE = [
  { x: 73, y: 38, width: 14, height: 45 },
  { x: 73, y: 98, width: 14, height: 42 },
  { x: 16, y: 52, width: 50, height: 42 },
];
const RADAR_LABEL = { font: "bold 12px monospace", baselineY: 30, aX: 24, bX: 123 };

const CROSSHAIR_BASE = 22;
const CROSSHAIR_SPREAD_SCALE = 650;
const DAMAGE_FLASH_SCALE = 2.6;

const SECONDS_PER_MINUTE = 60;
const PLANT_PERCENT_BASE = 3;
const DEFAULT_DEFUSE_DURATION = 7;
const PERCENT = 100;
const LOW_AMMO_THRESHOLD = 5;

/**
 * Builds the HUD bindings and returns the per-frame painter.
 * @param {object} state shared gameplay state
 * @returns {{render: () => void}} HUD API
 */
export function createHud(state) {
  const byId = (id) => document.getElementById(id);

  const mag = byId("ammo-mag");
  const reserve = byId("ammo-reserve");
  const health = byId("health-value");
  const bar = byId("health-fill");
  const timer = byId("timer");
  const score = byId("score-value");
  const round = byId("round");
  const money = byId("money");
  const phase = byId("phase");
  const enemies = byId("enemies");
  const crosshair = byId("crosshair");
  const hit = byId("hitmarker");
  const flash = byId("damage-flash");
  const banner = byId("banner");
  const bannerTitle = byId("banner-title");
  const bannerCopy = byId("banner-copy");
  const status = byId("weapon-status");
  const radar = byId("radar-map").getContext("2d");
  const objective = byId("objective");
  const armour = byId("armour");
  const feed = byId("feed");

  const board = document.createElement("div");
  const bearing = document.createElement("div");
  board.id = "scoreboard";
  bearing.id = "damage-bearing";
  document.body.append(board, bearing);

  /**
   * Paints the radar: frame, spine, site labels, player and engaged sentinels.
   * @returns {void}
   */
  function renderRadar() {
    radar.clearRect(0, 0, RADAR_WIDTH, RADAR_HEIGHT);
    radar.strokeStyle = PALETTE.muted;
    radar.lineWidth = 1;
    radar.strokeRect(RADAR_BORDER.x, RADAR_BORDER.y, RADAR_BORDER.width, RADAR_BORDER.height);

    radar.fillStyle = PALETTE.surface;
    for (const block of RADAR_SPINE) {
      radar.fillRect(block.x, block.y, block.width, block.height);
    }

    radar.font = RADAR_LABEL.font;
    radar.fillStyle = PALETTE.teal;
    radar.fillText("A", RADAR_LABEL.aX, RADAR_LABEL.baselineY);
    radar.fillStyle = PALETTE.rust;
    radar.fillText("B", RADAR_LABEL.bX, RADAR_LABEL.baselineY);

    const playerX = RADAR_ORIGIN_X + state.player.position.x * RADAR_SCALE;
    const playerZ = RADAR_ORIGIN_Y + state.player.position.z * RADAR_SCALE;

    radar.fillStyle = PALETTE.accent;
    radar.beginPath();
    radar.arc(playerX, playerZ, RADAR_PLAYER_RADIUS, 0, Math.PI * 2);
    radar.fill();

    radar.strokeStyle = PALETTE.ink;
    radar.beginPath();
    radar.moveTo(playerX, playerZ);
    radar.lineTo(
      playerX - Math.sin(state.player.yaw) * RADAR_HEADING_LENGTH,
      playerZ - Math.cos(state.player.yaw) * RADAR_HEADING_LENGTH,
    );
    radar.stroke();

    radar.fillStyle = PALETTE.rust;
    for (let botIndex = 0; botIndex < state.bots.length; botIndex++) {
      const bot = state.bots[botIndex];
      if (bot.health > 0 && bot.mode === "engage") {
        radar.fillRect(
          RADAR_BOT_ORIGIN_X + bot.position.x * RADAR_SCALE,
          RADAR_BOT_ORIGIN_Y + bot.position.z * RADAR_SCALE,
          RADAR_BOT_SIZE,
          RADAR_BOT_SIZE,
        );
      }
    }
  }

  /**
   * Rewrites the tab-held scoreboard panel.
   * @returns {void}
   */
  function renderScoreboard() {
    board.hidden = state.screen !== "playing" || !state.scoreboard;
    if (!state.scoreboard) return;
    board.innerHTML =
      `<h2>OPERATION / ROUND ${state.round}</h2>` +
      `<p>RAIDERS ${state.score.wins} : ${state.score.losses} SENTINELS</p>` +
      `<p>YOU · ${state.score.kills} KILLS · $${state.money}</p><hr>` +
      state.bots
        .map(
          (bot, botIndex) =>
            `<p>SENTINEL ${botIndex + 1} · ${bot.health > 0 ? "ALIVE" : "DOWN"} · ${bot.buy} · ${bot.weapon} · $${bot.money} · ${bot.role}</p>`,
        )
        .join("");
  }

  /**
   * Rewrites the objective line for the current bomb state.
   * @returns {void}
   */
  function renderObjective() {
    const bomb = state.bomb;
    if (bomb.status === "planted") {
      const defusingPercent =
        bomb.defuse > 0
          ? "DEFUSING " +
            Math.floor((bomb.defuse / (bomb.defuseDuration || DEFAULT_DEFUSE_DURATION)) * PERCENT) +
            "%"
          : "";
      objective.textContent = `CHARGE ACTIVE / ${bomb.site} / ${bomb.fuse.toFixed(1)}s  ${defusingPercent}`;
    } else if (bomb.plant > 0) {
      objective.textContent = `PLANTING ${Math.floor((bomb.plant / PLANT_PERCENT_BASE) * PERCENT)}% / HOLD E`;
    } else {
      objective.textContent = "SABOTAGE / PLANT AT A OR B · HOLD E";
    }
  }

  /**
   * Rewrites the ammo, health, clock, score and economy readouts.
   * @param {number} seconds whole seconds left on the active clock
   * @returns {void}
   */
  function renderVitals(seconds) {
    const weaponState = state.weapon;
    mag.textContent = weaponState.mag;
    reserve.textContent = `/ ${weaponState.reserve}`;
    byId("ammo").classList.toggle("empty", weaponState.mag === 0);

    health.textContent = Math.ceil(state.health);
    bar.style.width = `${state.health}%`;

    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
    const remainder = String(seconds % SECONDS_PER_MINUTE).padStart(2, "0");
    timer.textContent = `${minutes}:${remainder}`;
    score.textContent = `${state.score.wins} : ${state.score.losses}`;
    round.textContent = `ROUND ${state.round}`;
    money.textContent = `$${state.money.toLocaleString()}`;

    if (state.phase === "buy") phase.textContent = "PREPARE";
    else if (state.phase === "live") {
      phase.textContent = state.bomb.status === "planted" ? "CHARGE ACTIVE" : "SABOTAGE";
    } else phase.textContent = "ROUND COMPLETE";

    let alive = 0;
    for (let botIndex = 0; botIndex < state.bots.length; botIndex++) {
      if (state.bots[botIndex].health > 0) alive++;
    }
    enemies.textContent = `${alive} HOSTILES`;
  }

  /**
   * Rewrites the crosshair spread, hit marker, damage flash and weapon label.
   * @returns {void}
   */
  function renderWeaponStatus() {
    const weaponState = state.weapon;
    const size = `${CROSSHAIR_BASE + weaponState.spread * CROSSHAIR_SPREAD_SCALE}px`;
    crosshair.style.width = size;
    crosshair.style.height = size;
    hit.classList.toggle("on", state.hit > 0);
    flash.style.opacity = state.damageFlash * DAMAGE_FLASH_SCALE;

    if (weaponState.reloadLeft > 0) {
      status.textContent = `RELOADING ${weaponState.reloadLeft.toFixed(1)}s`;
    } else if (weaponState.mag === 0) {
      status.textContent = weaponState.reserve ? "R · RELOAD" : "OUT OF AMMUNITION";
    } else if (weaponState.mag <= LOW_AMMO_THRESHOLD) {
      status.textContent = "LOW AMMO / R RELOAD";
    } else {
      status.textContent = WEAPONS[weaponState.id].name.toUpperCase();
    }
  }

  /**
   * Rewrites the round banner visibility, heading and copy.
   * @param {number} seconds whole seconds left on the active clock
   * @returns {void}
   */
  function renderBanner(seconds) {
    const ended =
      state.phase === "won" || state.phase === "lost" || state.phase === "match";
    banner.hidden =
      (!ended && state.phase !== "buy" && state.phase !== "match") || state.buyOpen;

    if (ended) {
      if (state.phase === "won") bannerTitle.textContent = "Round won";
      else if (state.phase === "match") bannerTitle.textContent = "Match complete";
      else bannerTitle.textContent = "Round lost";
      bannerCopy.textContent = `Next round in ${seconds}s`;
    } else {
      bannerTitle.textContent = "Prepare to breach";
      bannerCopy.textContent = `Contact in ${seconds}s · B equipment · Enter deploy`;
    }
  }

  /**
   * Repaints the entire HUD from the current state.
   * @returns {void}
   */
  function render() {
    const seconds = Math.ceil(
      state.bomb.status === "planted" ? state.bomb.fuse : state.timer,
    );

    armour.textContent = `AP ${Math.ceil(state.armour)} / G FRAG ${state.grenadeCount} / X SMOKE ${state.smokeCount} / F FLASH ${state.flashCount}${state.kit ? " / KIT" : ""}`;
    bearing.hidden = state.screen !== "playing" || state.damageFlash <= 0;
    bearing.style.transform = `translate(-50%,-50%) rotate(${state.damageAngle}rad)`;

    renderScoreboard();
    renderObjective();
    feed.textContent = state.messageTime > 0 ? state.message : "";

    // Radar uses a persistent canvas and no transient arrays or vectors.
    renderRadar();
    renderVitals(seconds);
    renderWeaponStatus();
    renderBanner(seconds);
  }

  return { render };
}
