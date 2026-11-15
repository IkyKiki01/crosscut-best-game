// palette.js — owns the tidal-station colour vocabulary shared by the scene,
// the scenery dressing, the particle systems and the DOM HUD.

/**
 * Single source of truth for every colour the game draws with.
 * Keys are also used as material names by world.js and scenery.js, so the
 * insertion order here is part of the rendering contract.
 * @type {Record<string, string>}
 */
export const PALETTE = {
  canvas: "#789ca7",
  surface: "#264851",
  hairline: "#385761",
  ink: "#dfdfcc",
  muted: "#7b9c9c",
  accent: "#ffb84b",
  teal: "#42c5bf",
  rust: "#c9704c",
  sky: "#9db8be",
  dark: "#142c34",
};
