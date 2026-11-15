import { WEAPONS } from "./equipment.js";
import { PALETTE } from "./palette.js";
// DOM presentation only; all timers and values come from the shared state.
export function createHud(state) {
  const byId = (id) => document.getElementById(id);
  const overlay = byId("overlay"),
    play = byId("play"),
    mag = byId("ammo-mag"),
    reserve = byId("ammo-reserve");
  const health = byId("health-value"),
    bar = byId("health-fill"),
    timer = byId("timer"),
    score = byId("score-value");
  const round = byId("round"),
    money = byId("money"),
    phase = byId("phase"),
    enemies = byId("enemies");
  const crosshair = byId("crosshair"),
    hit = byId("hitmarker"),
    flash = byId("damage-flash");
  const banner = byId("banner"),
    bannerTitle = byId("banner-title"),
    bannerCopy = byId("banner-copy"),
    status = byId("weapon-status");
  const radar = byId("radar-map").getContext("2d");
  const objective = byId("objective"),
    armour = byId("armour"),
    feed = byId("feed");
  function render() {
    const w = state.weapon,
      seconds = Math.ceil(state.bomb.status === "planted" ? state.bomb.fuse : state.timer);
    const b = state.bomb;
    armour.textContent = `ARMOUR ${Math.ceil(state.armour)} AP   /   FRAG ×${state.grenadeCount}`;
    objective.textContent =
      b.status === "planted"
        ? `CHARGE ACTIVE / ${b.site} / ${b.fuse.toFixed(1)}s  ${b.defuse > 0 ? "DEFUSING " + Math.floor((b.defuse / 7) * 100) + "%" : ""}`
        : b.plant > 0
          ? `PLANTING ${Math.floor((b.plant / 3) * 100)}% / HOLD E`
          : "SABOTAGE / PLANT AT A OR B · HOLD E";
    feed.textContent = state.messageTime > 0 ? state.message : "";
    // Radar uses persistent canvas and no transient arrays or vectors.
    radar.clearRect(0, 0, 160, 180);
    radar.strokeStyle = PALETTE.muted;
    radar.lineWidth = 1;
    radar.strokeRect(7, 4, 146, 170);
    radar.fillStyle = PALETTE.surface;
    radar.fillRect(73, 38, 14, 45);
    radar.fillRect(73, 98, 14, 42);
    radar.fillRect(16, 52, 50, 42);
    radar.font = "bold 12px monospace";
    radar.fillStyle = PALETTE.teal;
    radar.fillText("A", 24, 30);
    radar.fillStyle = PALETTE.rust;
    radar.fillText("B", 123, 30);
    radar.fillStyle = PALETTE.accent;
    radar.beginPath();
    radar.arc(80 + state.player.position.x * 4.4, 90 + state.player.position.z * 4.4, 4, 0, Math.PI * 2);
    radar.fill();
    radar.strokeStyle = PALETTE.ink;
    radar.beginPath();
    radar.moveTo(80 + state.player.position.x * 4.4, 90 + state.player.position.z * 4.4);
    radar.lineTo(
      80 + state.player.position.x * 4.4 - Math.sin(state.player.yaw) * 12,
      90 + state.player.position.z * 4.4 - Math.cos(state.player.yaw) * 12,
    );
    radar.stroke();
    radar.fillStyle = PALETTE.rust;
    for (let i = 0; i < state.bots.length; i++) {
      const bot = state.bots[i];
      if (bot.health > 0 && bot.mode === "engage")
        radar.fillRect(78 + bot.position.x * 4.4, 88 + bot.position.z * 4.4, 4, 4);
    }

    mag.textContent = w.mag;
    reserve.textContent = `/ ${w.reserve}`;
    byId("ammo").classList.toggle("empty", w.mag === 0);
    health.textContent = Math.ceil(state.health);
    bar.style.width = `${state.health}%`;
    timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    score.textContent = `${state.score.wins} : ${state.score.losses}`;
    round.textContent = `ROUND ${state.round}`;
    money.textContent = `$${state.money.toLocaleString()}`;
    phase.textContent =
      state.phase === "buy"
        ? "PREPARE"
        : state.phase === "live"
          ? state.bomb.status === "planted"
            ? "CHARGE ACTIVE"
            : "SABOTAGE"
          : "ROUND COMPLETE";
    let alive = 0;
    for (let i = 0; i < state.bots.length; i++) if (state.bots[i].health > 0) alive++;
    enemies.textContent = `${alive} HOSTILES`;
    crosshair.style.width = crosshair.style.height = `${22 + w.spread * 650}px`;
    hit.classList.toggle("on", state.hit > 0);
    flash.style.opacity = state.damageFlash * 2;
    status.textContent =
      w.reloadLeft > 0
        ? `RELOADING ${w.reloadLeft.toFixed(1)}s`
        : w.mag === 0
          ? w.reserve
            ? "R · RELOAD"
            : "OUT OF AMMUNITION"
          : WEAPONS[w.id].name.toUpperCase();
    const ended = state.phase === "won" || state.phase === "lost" || state.phase === "match";
    banner.hidden = (!ended && state.phase !== "buy" && state.phase !== "match") || state.buyOpen;
    bannerTitle.textContent = ended
      ? state.phase === "won"
        ? "Round won"
        : state.phase === "match"
          ? "Match complete"
          : "Round lost"
      : "Prepare to breach";
    bannerCopy.textContent = ended
      ? `Next round in ${seconds}s`
      : `Contact in ${seconds}s · B equipment · Enter deploy`;
  }
  return {
    render,
    onPlay(handler) {
      play.addEventListener("click", handler);
    },
    setLocked(locked) {
      overlay.hidden = locked;
      if (!locked) {
        byId("overlay-title").textContent = "Crosscut";
        byId("overlay-copy").textContent =
          "Plant a charge at the tide turbine (A) or capacitor relay (B). Protect it from defenders. Buy equipment between rounds.";
        play.textContent = "Enter operation";
      }
    },
  };
}
