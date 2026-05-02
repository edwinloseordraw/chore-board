import { jget, jset } from './state.js';

export const THEMES = {
  midnight: {
    label: "Midnight",
    preview: { bg: "#0a1628", accent: "#00c8f0", panel: "#0d1a34" }
  },
  neonPulse: {
    label: "Neon Pulse",
    preview: { bg: "#09090f", accent: "#ff0880", panel: "#0f0d1a" }
  },
  nebula: {
    label: "Nebula",
    preview: { bg: "#130b2e", accent: "#c044ff", panel: "#160d2e" }
  },
  coral: {
    label: "Coral",
    preview: { bg: "#ece4da", accent: "#e8573c", panel: "#ffffff" }
  }
};

const VALID_IDS = Object.keys(THEMES);
const DEFAULT = "midnight";

export function loadThemeState(){
  const s = jget("themeState", { themeId: DEFAULT });
  if (!s || typeof s !== "object") return { themeId: DEFAULT };
  if (!VALID_IDS.includes(s.themeId)) s.themeId = DEFAULT;
  return s;
}

export function saveThemeState(s){
  if (!s || typeof s !== "object") s = { themeId: DEFAULT };
  if (!VALID_IDS.includes(s.themeId)) s.themeId = DEFAULT;
  jset("themeState", s);
}

export function applyTheme(themeId){
  const tId = VALID_IDS.includes(themeId) ? themeId : DEFAULT;
  try {
    document.documentElement.dataset.theme = tId;
    saveThemeState({ themeId: tId });
  } catch (e) {
    console.warn("applyTheme failed:", e);
  }
}
