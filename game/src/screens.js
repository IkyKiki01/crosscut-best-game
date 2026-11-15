// screens.js — owns the title, pause and results overlays plus the navigation
// between them, including pointer-lock release and input clearing.
const TITLE_HEADING = "CROSSCUT";
const TITLE_COPY = "Cut the power. Hold the line.";
const TITLE_BUTTON = "PRESS ENTER TO DEPLOY";
const TITLE_CONTENT =
  '<div class="map-name">TIDAL RELAY 07 / FIRST TO FIVE</div><div class="screen-controls"><div><b>WASD</b> Move</div><div><b>MOUSE</b> Aim / click fire</div><div><b>1–7</b> Buy · B equipment</div><div><b>E</b> Plant / defuse</div><div><b>G</b> Grenade</div><div><b>R</b> Reload</div><div><b>TAB</b> Scores</div><div><b>ESC</b> Pause</div></div>';

const PAUSE_HEADING = "PAUSED";
const PAUSE_COPY = "Hold your position. The operation can wait.";
const PAUSE_BUTTON = "Resume";
const PAUSE_CONTENT = '<div class="map-name">TIDAL RELAY 07 / SIMULATION PAUSED</div>';

const RESULTS_COPY = "Operation complete. The relay remembers.";
const RESULTS_CONTENT_HEADER = '<div class="map-name">TIDAL RELAY 07 / FINAL SCORE</div>';
const RESULTS_BUTTON = "PRESS ENTER TO PLAY AGAIN";
const RESULTS_TITLE_BUTTON = "ESC FOR TITLE";

const PLAYING = "playing";
const TITLE = "title";
const PAUSE = "pause";
const RESULTS = "results";
const WINS_TO_MATCH = 5;

/**
 * Builds the overlay screens and wires the keyboard navigation.
 * @param {object} state shared gameplay state
 * @param {object} rounds round authority, restarted on every new match
 * @param {object} input input controller
 * @param {object} audio audio controller unlocked on deploy
 * @returns {{render: Function, start: Function, title: Function, lockChanged: Function}} screen API
 */
export function createScreens(state, rounds, input, audio) {
  const byId = (id) => document.getElementById(id);
  let shown = "";

  /**
   * Drops any buffered input so a screen change never leaks a held action.
   * @returns {void}
   */
  function clearInput() {
    input.state.keys.clear();
    input.state.pressed.clear();
    input.state.firing = false;
    input.state.lookX = input.state.lookY = 0;
    state.scoreboard = false;
  }

  /**
   * Switches to a screen, releases pointer lock and repaints the overlay.
   * @param {string} screen screen key to activate
   * @returns {void}
   */
  function show(screen) {
    state.screen = screen;
    clearInput();
    if (screen !== PLAYING && document.pointerLockElement) document.exitPointerLock();
    render();
  }

  /**
   * Starts a fresh match and requests pointer lock.
   * @returns {void}
   */
  function start() {
    rounds.restart();
    show(PLAYING);
    audio.unlock();
    input.requestLock();
  }

  /**
   * Returns from pause to play without restarting the match.
   * @returns {void}
   */
  function resume() {
    show(PLAYING);
    input.requestLock();
  }

  /**
   * Abandons the match and returns to the title screen.
   * @returns {void}
   */
  function title() {
    rounds.restart();
    show(TITLE);
  }

  /**
   * Runs the primary action of whichever screen is visible.
   * @returns {void}
   */
  function primary() {
    if (state.screen === PAUSE) resume();
    else start();
  }

  byId("play").onclick = primary;

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.code === "Enter" && state.screen !== PLAYING) {
      event.preventDefault();
      primary();
      clearInput();
    } else if (event.code === "Escape") {
      event.preventDefault();
      if (state.screen === RESULTS) title();
      else if (state.screen === PLAYING) show(PAUSE);
      else if (state.screen === PAUSE) resume();
    }
  });

  /**
   * Rebuilds the action button row for the current screen.
   * @param {Array<[string, Function]>} actions label/action pairs to render
   * @returns {void}
   */
  function renderActions(actions) {
    const container = byId("screen-actions");
    container.replaceChildren();
    for (const [label, action] of actions) {
      const button = document.createElement("button");
      button.textContent = label;
      button.onclick = action;
      container.append(button);
    }
  }

  /**
   * Builds the results body from the recorded match statistics.
   * @returns {string} results markup
   */
  function resultsContent() {
    const accuracy = state.stats.shots
      ? Math.round((state.stats.hits / state.stats.shots) * 100)
      : 0;
    return (
      RESULTS_CONTENT_HEADER +
      `<div class="result-score">${state.score.wins} : ${state.score.losses}</div>` +
      '<div class="result-stats">' +
      `<div><b>${state.score.wins + state.score.losses}</b>ROUNDS</div>` +
      `<div><b>${state.score.kills}</b>KILLS</div>` +
      `<div><b>${Math.round(state.stats.damage)}</b>DAMAGE</div>` +
      `<div><b>${accuracy}%</b>ACCURACY</div>` +
      "</div>"
    );
  }

  /**
   * Repaints the overlay for the current screen, promoting a finished match to
   * the results screen first.
   * @returns {void}
   */
  function render() {
    if (state.phase === "match" && state.screen === PLAYING) show(RESULTS);
    const screen = state.screen;

    byId("overlay").hidden = screen === PLAYING;
    byId("hud").hidden = screen !== PLAYING;
    if (screen !== PLAYING) byId("buy").hidden = true;

    if (screen === shown) return;
    shown = screen;

    const results = screen === RESULTS;
    const pause = screen === PAUSE;

    byId("overlay-title").textContent = results
      ? state.score.wins >= WINS_TO_MATCH
        ? "VICTORY"
        : "DEFEAT"
      : pause
        ? PAUSE_HEADING
        : TITLE_HEADING;
    byId("overlay-copy").textContent = results
      ? RESULTS_COPY
      : pause
        ? PAUSE_COPY
        : TITLE_COPY;
    byId("screen-content").innerHTML = results
      ? resultsContent()
      : pause
        ? PAUSE_CONTENT
        : TITLE_CONTENT;
    byId("play").textContent = results
      ? RESULTS_BUTTON
      : pause
        ? PAUSE_BUTTON
        : TITLE_BUTTON;

    if (pause) renderActions([["Restart", start], ["Title", title]]);
    else if (results) renderActions([[RESULTS_TITLE_BUTTON, title]]);
    else renderActions([]);
  }

  render();

  /**
   * Reacts to pointer-lock loss by pausing or showing results.
   * @param {boolean} locked current pointer-lock state
   * @returns {void}
   */
  function lockChanged(locked) {
    if (!locked && state.screen === PLAYING) {
      show(state.phase === "match" ? RESULTS : PAUSE);
    }
  }

  return { render, start, title, lockChanged };
}
