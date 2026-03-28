import { DAYS } from './modules/constants.js';
import { todayKey } from './modules/utils.js';
import { loadThemeState, applyTheme } from './modules/theme.js';
import { route, goto, renderTopNav, addContextResetButton } from './modules/render-nav.js';
import { renderDashboard } from './modules/render-dashboard.js';
import { renderDay } from './modules/render-day.js';
import { renderAdmin } from './modules/render-admin.js';
import { renderMaintenance } from './modules/render-maintenance.js';
import { renderChecklistPage } from './modules/render-checklist.js';
import { renderCeloSchool } from './modules/render-celo.js';

window.__CHOREBOARD_LOADED__ = true;

function renderApp(){
  renderTopNav();
  const r = route();
  addContextResetButton(r);

  if (r === "dashboard")    return renderDashboard();
  if (r === "biweekly")     return renderChecklistPage("biweekly");
  if (r === "monthly")      return renderChecklistPage("monthly");
  if (r === "maintenance")  return renderMaintenance();
  if (r === "admin")        return renderAdmin();
  if (r === "celos-school") return renderCeloSchool();
  if (DAYS.includes(r))     return renderDay(r);
  if (r === "hoy")          return renderDay(todayKey());

  return goto("dashboard");
}

window.__renderApp = renderApp;

try {
  const ts0 = loadThemeState();
  applyTheme(ts0.themeId, ts0.mode);
} catch {}

// Set initial hash without triggering hashchange (avoids double render on cold start)
if (!location.hash) {
  history.replaceState(null, "", location.pathname + location.search + "#/dashboard");
}

window.addEventListener("hashchange", renderApp);
renderApp();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}
