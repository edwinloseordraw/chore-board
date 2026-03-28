import { jget, jset, loadMemberColors, saveMemberColors } from './state.js';

// Canonical theme definitions (CSS variable maps per theme + mode)
export const THEMES = {
  neonGlass: {
    dark: {
      "--panel": "#111",
      "--ringTrack": "rgba(255,255,255,0.12)"
    },
    light: {
      "--panel": "#ffffff",
      "--ringTrack": "rgba(0,0,0,0.12)"
    }
  },
  paperClean: {
    dark: {
      "--panel": "#111",
      "--ringTrack": "rgba(255,255,255,0.12)"
    },
    light: {
      "--panel": "#ffffff",
      "--ringTrack": "rgba(0,0,0,0.12)"
    }
  }
};

// Per-theme member color presets (empty — only paperClean allows editing)
export const THEME_MEMBER_COLORS = {};

export function loadThemeState(){
  const s = jget("themeState", { themeId: "neonGlass", mode: "dark" });
  if (!s || typeof s !== "object") return { themeId: "neonGlass", mode: "dark" };
  if (typeof s.themeId !== "string" || !s.themeId) s.themeId = "neonGlass";
  if (s.mode !== "dark" && s.mode !== "light") s.mode = "dark";
  if (!THEMES || !THEMES[s.themeId]) s.themeId = "neonGlass";
  return s;
}

export function saveThemeState(s){
  if (!s || typeof s !== "object") s = { themeId: "neonGlass", mode: "dark" };
  if (typeof s.themeId !== "string" || !s.themeId) s.themeId = "neonGlass";
  if (s.mode !== "dark" && s.mode !== "light") s.mode = "dark";
  jset("themeState", s);
}

export function applyTheme(themeId, mode){
  const ts = loadThemeState();
  const tId = (typeof themeId === "string" && themeId) ? themeId : ts.themeId;
  const m = (mode === "light" || mode === "dark") ? mode : ts.mode;

  const theme = (THEMES && THEMES[tId]) ? THEMES[tId] : (THEMES && THEMES.neonGlass ? THEMES.neonGlass : null);
  const vars = theme ? (theme[m] || theme.dark || {}) : {};

  try{
    const root = document.documentElement;
    root.dataset.mode = m;
    root.dataset.theme = tId;

    Object.keys(vars).forEach(k => {
      try{ root.style.setProperty(k, String(vars[k])); } catch {}
    });

    saveThemeState({ themeId: tId, mode: m });

    // If this theme locks member colors, snap to presets.
    // Only paperClean allows editing.
    try{
      if (tId !== "paperClean" && typeof THEME_MEMBER_COLORS === "object" && THEME_MEMBER_COLORS[tId]){
        saveMemberColors({ ...THEME_MEMBER_COLORS[tId] });
      }
    } catch {}

  } catch (e){
    console.warn("applyTheme failed:", e);
  }
}
