// objective.js — owns sabotage sites, the plant hold, the charge fuse and defuse progression.
const SITE_NAMES = ["A", "B"];
const SITE_POSITIONS = [
  { x: -11, z: -12 },
  { x: 10, z: -12 },
];

/**
 * Sabotage site anchors on the relay floor.
 * @type {Array<{name: string, x: number, z: number}>}
 */
export const SITES = SITE_POSITIONS.map((position, index) => ({
  name: SITE_NAMES[index],
  x: position.x,
  z: position.z,
}));

const PLANT_RADIUS = 3;
const PLANT_SECONDS = 3;
const PLANT_REWARD = 300;
const PLANT_MAX_SPEED_SQUARED = 0.3;
const INITIAL_FUSE_SECONDS = 40;
const DEFUSE_RADIUS = 1.8;
const DEFUSE_SECONDS = 7;
const KIT_DEFUSE_SECONDS = 3.5;

/**
 * Builds the plant/defuse controller bound to the shared bomb record.
 * @param {object} state shared gameplay state
 * @param {{hit: Function, shot: Function}} audio audio cue provider
 * @returns {{reset: () => void, step: (dt: number, keys: Set<string>) => void}} objective API
 */
export function createObjective(state, audio) {
  /**
   * Restores the bomb to the carried, unplanted state for a fresh round.
   * @returns {void}
   */
  function reset() {
    const bomb = state.bomb;
    bomb.status = "carried";
    bomb.plant = 0;
    bomb.defuse = 0;
    bomb.fuse = INITIAL_FUSE_SECONDS;
    bomb.site = "";
  }

  /**
   * Finds the site whose anchor the player is standing on.
   * @param {{x: number, z: number}} position player floor position
   * @returns {{name: string, x: number, z: number} | null} matching site, if any
   */
  function siteUnderPlayer(position) {
    let found = null;
    for (let siteIndex = 0; siteIndex < SITES.length; siteIndex++) {
      const site = SITES[siteIndex];
      if (Math.hypot(position.x - site.x, position.z - site.z) < PLANT_RADIUS) found = site;
    }
    return found;
  }

  /**
   * Advances the plant hold while the player keeps still inside a site.
   * @param {number} dt fixed timestep in seconds
   * @param {Set<string>} keys currently held keys
   * @returns {void}
   */
  function stepPlant(dt, keys) {
    const bomb = state.bomb;
    const position = state.player.position;
    const site = siteUnderPlayer(position);
    const holding =
      site !== null &&
      keys.has("KeyE") &&
      state.health > 0 &&
      state.player.velocity.lengthSq() < PLANT_MAX_SPEED_SQUARED;

    if (!holding) {
      bomb.plant = 0;
      return;
    }

    bomb.plant += dt;
    if (bomb.plant < PLANT_SECONDS) return;

    bomb.status = "planted";
    bomb.site = site.name;
    bomb.x = position.x;
    bomb.z = position.z;
    state.money += PLANT_REWARD;
    audio.hit();
  }

  /**
   * Picks the first eligible sentinel that can start defusing the charge.
   * @param {object} bomb planted charge record
   * @returns {{defusing: boolean, kit: boolean}} defuse intent and kit availability
   */
  function sentinelDefuseIntent(bomb) {
    let defusing = false;
    let kit = false;
    let selected = false;
    for (let botIndex = 0; botIndex < state.bots.length; botIndex++) {
      const bot = state.bots[botIndex];
      if (selected || bot.health <= 0 || bot.visibleEnemy || bot.blind) continue;
      if (Math.hypot(bot.position.x - bomb.x, bot.position.z - bomb.z) >= DEFUSE_RADIUS) continue;
      if (bot.mode === "engage") continue;
      defusing = true;
      selected = true;
      kit = bot.kit;
      bot.mode = "defuse";
    }
    return { defusing, kit };
  }

  /**
   * Advances the fuse and defuse progress of a planted charge.
   * @param {number} dt fixed timestep in seconds
   * @param {Set<string>} keys currently held keys
   * @returns {void}
   */
  function stepPlanted(dt, keys) {
    const bomb = state.bomb;
    const position = state.player.position;
    bomb.fuse = Math.max(0, bomb.fuse - dt);

    const sentinel = sentinelDefuseIntent(bomb);
    let defusing = sentinel.defusing;
    let kit = sentinel.kit;

    // Field kit can also recover a planted charge with E; defenders buy their own kits.
    const playerOnCharge = Math.hypot(position.x - bomb.x, position.z - bomb.z) < DEFUSE_RADIUS;
    if (state.kit && keys.has("KeyE") && state.health > 0 && playerOnCharge) {
      defusing = true;
      kit = true;
    }

    bomb.defuseDuration = kit ? KIT_DEFUSE_SECONDS : DEFUSE_SECONDS;
    bomb.defuse = defusing ? bomb.defuse + dt : 0;

    if (bomb.defuse >= bomb.defuseDuration) {
      bomb.status = "defused";
    } else if (bomb.fuse === 0) {
      bomb.status = "exploded";
      audio.shot(true);
    }
  }

  /**
   * Advances the objective by one fixed step.
   * @param {number} dt fixed timestep in seconds
   * @param {Set<string>} keys currently held keys
   * @returns {void}
   */
  function step(dt, keys) {
    if (state.phase !== "live") return;
    if (state.bomb.status === "carried") stepPlant(dt, keys);
    else if (state.bomb.status === "planted") stepPlanted(dt, keys);
  }

  return { reset, step };
}
