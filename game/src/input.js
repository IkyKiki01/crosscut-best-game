// input.js — owns keyboard, mouse and pointer-lock collection, including the discrete action buffer.

const DISCRETE_CODES = new Set([
  "KeyB",
  "KeyG",
  "KeyX",
  "KeyF",
  "KeyR",
  "Enter",
]);

const MODIFIER_PREFIX = "Control";
const SCOREBOARD_CODE = "Tab";
const JUMP_CODE = "Space";
const ESCAPE_CODE = "Escape";
const PRIMARY_BUTTON = 0;

/**
 * Attaches the input listeners to the window and the pointer-lock element.
 * @param {HTMLCanvasElement} canvas element that owns pointer lock
 * @param {(locked: boolean) => void} onLockChange notified whenever lock state flips
 * @returns {{state: object, requestLock: () => void}} input API
 */
export function createInput(canvas, onLockChange) {
  const keys = new Set();
  const pressed = new Set();
  const state = { keys, pressed, locked: false, firing: false, lookX: 0, lookY: 0 };

  /**
   * True for codes that must be buffered so a fast tap still reaches a tick.
   * @param {string} code KeyboardEvent.code
   * @returns {boolean} whether the code is a discrete action
   */
  function isDiscreteAction(code) {
    return DISCRETE_CODES.has(code) || code.startsWith("Digit");
  }

  /**
   * Applies one key transition to the held and buffered sets.
   * @param {KeyboardEvent} event keyboard event being handled
   * @param {boolean} down true for keydown, false for keyup
   * @returns {void}
   */
  function setKey(event, down) {
    if (down && event.code === ESCAPE_CODE && state.locked) document.exitPointerLock();

    // Preserve discrete actions across ticks; a quick tap must survive its keyup event.
    if (down && !event.repeat && isDiscreteAction(event.code)) pressed.add(event.code);

    if (down) keys.add(event.code);
    else keys.delete(event.code);

    const isModifier = event.code.startsWith(MODIFIER_PREFIX);
    if (
      event.code === SCOREBOARD_CODE ||
      (state.locked && (event.code === JUMP_CODE || isModifier))
    ) {
      event.preventDefault();
    }
  }

  /**
   * Clears every held and buffered input without touching look deltas.
   * @returns {void}
   */
  function clearHeld() {
    keys.clear();
    pressed.clear();
    state.firing = false;
  }

  window.addEventListener("keydown", (event) => setKey(event, true));
  window.addEventListener("keyup", (event) => setKey(event, false));

  window.addEventListener("blur", () => {
    clearHeld();
  });

  window.addEventListener("mousemove", (event) => {
    if (!state.locked) return;
    state.lookX += event.movementX;
    state.lookY += event.movementY;
  });

  window.addEventListener("mousedown", (event) => {
    if (state.locked && event.button === PRIMARY_BUTTON) state.firing = true;
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === PRIMARY_BUTTON) state.firing = false;
  });

  document.addEventListener("pointerlockchange", () => {
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked) {
      clearHeld();
      state.lookX = 0;
      state.lookY = 0;
    }
    onLockChange(state.locked);
  });

  /**
   * Asks the browser for pointer lock on the canvas.
   * @returns {void}
   */
  function requestLock() {
    canvas.requestPointerLock();
  }

  return { state, requestLock };
}
