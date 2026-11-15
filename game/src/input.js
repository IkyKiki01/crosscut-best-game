// Keyboard and mouse, and the pointer lock that turns the mouse into look. Plain browser
// APIs only: the game asks the canvas for pointer lock and reads movementX/Y while it holds it.
export function createInput(canvas, onLockChange) {
  const keys = new Set(),
    pressed = new Set();
  const state = { keys, pressed, locked: false, firing: false, lookX: 0, lookY: 0 };

  function setKey(event, down) {
    if (down && event.code === "Escape" && state.locked) document.exitPointerLock();
    // Preserve discrete actions across ticks; a quick tap must survive its keyup event.
    if (
      down &&
      !event.repeat &&
      (event.code === "KeyB" ||
        event.code === "KeyG" ||
        event.code === "KeyR" ||
        event.code === "Enter" ||
        event.code.startsWith("Digit"))
    )
      pressed.add(event.code);
    if (down) keys.add(event.code);
    else keys.delete(event.code);
    if (state.locked && (event.code === "Space" || event.code.startsWith("Control"))) event.preventDefault();
  }

  window.addEventListener("keydown", (event) => setKey(event, true));
  window.addEventListener("keyup", (event) => setKey(event, false));
  window.addEventListener("blur", () => {
    keys.clear();
    pressed.clear();
    state.firing = false;
  });
  window.addEventListener("mousemove", (event) => {
    if (!state.locked) return;
    state.lookX += event.movementX;
    state.lookY += event.movementY;
  });
  window.addEventListener("mousedown", (event) => {
    if (state.locked && event.button === 0) state.firing = true;
  });
  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) state.firing = false;
  });
  document.addEventListener("pointerlockchange", () => {
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked) {
      keys.clear();
      pressed.clear();
      state.firing = false;
      state.lookX = 0;
      state.lookY = 0;
    }
    onLockChange(state.locked);
  });

  return {
    state,
    requestLock() {
      canvas.requestPointerLock();
    },
  };
}
