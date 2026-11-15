// Presentation owns navigation; simulation only advances while playing and locked.
export function createScreens(state, rounds, input, audio) {
  const el = id => document.getElementById(id);
  let shown = '';
  function clearInput() {
    input.state.keys.clear();
    input.state.pressed.clear();
    input.state.firing = false;
    input.state.lookX = input.state.lookY = 0;
    state.scoreboard = false;
  }
  function show(screen) {
    state.screen = screen;
    clearInput();
    if (screen !== 'playing' && document.pointerLockElement) document.exitPointerLock();
    render();
  }
  function start() {
    rounds.restart();
    show('playing');
    audio.unlock();
    input.requestLock();
  }
  function resume() {
    show('playing');
    input.requestLock();
  }
  function title() {
    rounds.restart();
    show('title');
  }
  function primary() {
    if (state.screen === 'pause') resume();
    else start();
  }
  el('play').onclick = primary;
  window.addEventListener('keydown', event => {
    if (event.repeat) return;
    if (event.code === 'Enter' && state.screen !== 'playing') {
      event.preventDefault();
      primary();
      clearInput();
    } else if (event.code === 'Escape') {
      event.preventDefault();
      if (state.screen === 'results') title();
      else if (state.screen === 'playing') show('pause');
      else if (state.screen === 'pause') resume();
    }
  });
  function render() {
    if (state.phase === 'match' && state.screen === 'playing') show('results');
    const screen = state.screen;
    el('overlay').hidden = screen === 'playing';
    el('hud').hidden = screen !== 'playing';
    if (screen !== 'playing') el('buy').hidden = true;
    if (screen === shown) return;
    shown = screen;
    const results = screen === 'results', pause = screen === 'pause';
    el('overlay-title').textContent = results ? (state.score.wins >= 5 ? 'VICTORY' : 'DEFEAT') : pause ? 'PAUSED' : 'CROSSCUT';
    el('overlay-copy').textContent = results ? 'Operation complete. The relay remembers.' : pause ? 'Hold your position. The operation can wait.' : 'Cut the power. Hold the line.';
    el('screen-content').innerHTML = results
      ? `<div class="map-name">TIDAL RELAY 07 / FINAL SCORE</div><div class="result-score">${state.score.wins} : ${state.score.losses}</div><div class="result-stats"><div><b>${state.score.wins + state.score.losses}</b>ROUNDS</div><div><b>${state.score.kills}</b>KILLS</div><div><b>${Math.round(state.stats.damage)}</b>DAMAGE</div><div><b>${state.stats.shots ? Math.round(state.stats.hits / state.stats.shots * 100) : 0}%</b>ACCURACY</div></div>`
      : pause ? '<div class="map-name">TIDAL RELAY 07 / SIMULATION PAUSED</div>'
      : '<div class="map-name">TIDAL RELAY 07 / FIRST TO FIVE</div><div class="screen-controls"><div><b>WASD</b> Move</div><div><b>MOUSE</b> Aim / click fire</div><div><b>1–7</b> Buy · B equipment</div><div><b>E</b> Plant / defuse</div><div><b>G</b> Grenade</div><div><b>R</b> Reload</div><div><b>TAB</b> Scores</div><div><b>ESC</b> Pause</div></div>';
    el('play').textContent = results ? 'PRESS ENTER TO PLAY AGAIN' : pause ? 'Resume' : 'PRESS ENTER TO DEPLOY';
    const actions = el('screen-actions');
    actions.replaceChildren();
    for (const [label, action] of pause ? [['Restart', start], ['Title', title]] : results ? [['ESC FOR TITLE', title]] : []) {
      const button = document.createElement('button');
      button.textContent = label;
      button.onclick = action;
      actions.append(button);
    }
  }
  render();
  return { render, start, title, lockChanged(locked) {
    if (!locked && state.screen === 'playing') show(state.phase === 'match' ? 'results' : 'pause');
  } };
}
