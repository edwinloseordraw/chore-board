import { jget, jset, saveMemberColors } from './state.js';

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

export function loadThemeState(){
  const s = jget("themeState", { themeId: "neonGlass", mode: "dark" });
  if (!s || typeof s !== "object") return { themeId: "neonGlass", mode: "dark" };
  if (typeof s.themeId !== "string" || !s.themeId) s.themeId = "neonGlass";
  if (s.mode !== "dark" && s.mode !== "light") s.mode = "dark";
  if (!THEMES[s.themeId]) s.themeId = "neonGlass";
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

  const theme = THEMES[tId] || THEMES.neonGlass;
  const vars = theme ? (theme[m] || theme.dark || {}) : {};

  try{
    const root = document.documentElement;
    root.dataset.mode = m;
    root.dataset.theme = tId;

    Object.keys(vars).forEach(k => {
      try{ root.style.setProperty(k, String(vars[k])); } catch {}
    });

    saveThemeState({ themeId: tId, mode: m });
  } catch (e){
    console.warn("applyTheme failed:", e);
  }
}
