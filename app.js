/**
 * Chore Board — entry point
 *
 * All logic lives in modules/. This file imports them, wires up routing,
 * applies the saved theme, and kicks off the first render.
 */

import { DAYS } from './modules/constants.js';
import { todayKey } from './modules/utils.js';
import { loadDashState, saveDashState } from './modules/state.js';
import { loadThemeState, applyTheme } from './modules/theme.js';
import { route, goto, renderTopNav, addContextResetButton } from './modules/render-nav.js';
import { renderDashboard } from './modules/render-dashboard.js';
import { renderDay } from './modules/render-day.js';
import { renderAdmin } from './modules/render-admin.js';
import { renderMaintenance } from './modules/render-maintenance.js';
import { renderChecklistPage } from './modules/render-checklist.js';
import { renderCeloSchool } from './modules/render-celo.js';

console.log("[ChoreBoard] app.js loaded");
window.__CHOREBOARD_LOADED__ = true;
window.__firebaseSyncSchedulePush = function(){ /* local-only stub */ };

/* =========================
   MAIN ROUTER
========================= */

function renderApp(){
  renderTopNav();
  const r = route();
  console.log("HASH:", location.hash, "ROUTE:", r);

  addContextResetButton(r);

  if (r === "dashboard"){
    const dash = loadDashState();
    if (!dash.viewerDay) dash.viewerDay = todayKey();
    if (dash.viewerReadOnly !== true) dash.viewerReadOnly = false;
    saveDashState(dash);
    return renderDashboard();
  }
  if (r === "biweekly")     return renderChecklistPage("biweekly");
  if (r === "monthly")      return renderChecklistPage("monthly");
  if (r === "maintenance")  return renderMaintenance();
  if (r === "admin")        return renderAdmin();
  if (r === "celos-school") return renderCeloSchool();
  if (DAYS.includes(r))     return renderDay(r);
  if (r === "hoy")          return renderDay(todayKey());

  // Unknown route → home
  return goto("dashboard");
}

// Expose for modules that need to trigger a full re-render
window.__renderApp = renderApp;

/* =========================
   INIT
========================= */

// Apply saved theme before first render
try {
  const ts0 = loadThemeState();
  applyTheme(ts0.themeId, ts0.mode);
} catch {}

window.addEventListener("hashchange", renderApp);

if (!location.hash) {
  goto("dashboard");
}
renderApp();

/* =========================
   SERVICE WORKER
========================= */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}
