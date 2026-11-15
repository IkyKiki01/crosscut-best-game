// palette.js — owns the tidal-station colour vocabulary shared by scene, scenery, particles and HUD.

/**
 * Single source of truth for every colour the game draws with.
 * Keys are also used as material names by world.js and scenery.js, so the
 * insertion order here is part of the rendering contract.
 * @type {Record<string, string>}
 */
export const PALETTE = {
  canvas: "#6d96a2",
  surface: "#1e3b45",
  hairline: "#2c4a55",
  ink: "#f5f1e7",
  muted: "#8fb0b0",
  accent: "#ffb23d",
  teal: "#38d6cf",
  rust: "#d97850",
  sky: "#7b98a2",
  dark: "#0d2128",
};
