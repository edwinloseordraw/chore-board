import { DAYS } from './constants.js';
import { todayKey, prevDayKey, nextDayKey } from './utils.js';
import { loadDailyState, loadDashState, saveDashState } from './state.js';
import { renderGroceriesPanel } from './render-groceries.js';

export function route(){
  const raw = (location.hash || "")
    .replace(/^#/, "")
    .replace(/^\/+/, "")
    .trim();
  return raw || "dashboard";
}

export function goto(path){
  location.hash = "#/" + path;
}

export function weeklyReset(){
  if (!confirm("Weekly Reset: clear daily checkboxes + daily notes + weekly chores assignments/checks?")) return;
  localStorage.removeItem("dailyState");
  localStorage.removeItem("weeklyState");
  window.__renderApp();
}

export function renderTopNav(){
  const nav = document.getElementById("topNav");
  nav.innerHTML = "";

  const r = route();

  const isDayRoute = DAYS.includes(r) || r === "hoy";
  const today = todayKey();
  const currentDayKey = (r === "hoy") ? today : r;

  // --- Hamburger (top left) ---
  const menuWrap = document.createElement("div");
  menuWrap.className = "menuWrap";

  const ham = document.createElement("button");
  ham.className = "hamburgerBtn";
  ham.type = "button";
  ham.setAttribute("aria-label", "Menu");
  ham.textContent = "☰";
  menuWrap.appendChild(ham);

  nav.appendChild(menuWrap);

  // Persistent Hoy button
  const hoyTopBtn = document.createElement("button");
  hoyTopBtn.className = "navBtn";
  hoyTopBtn.type = "button";
  hoyTopBtn.textContent = "Hoy";
  hoyTopBtn.addEventListener("click", () => { goto("hoy"); });
  nav.appendChild(hoyTopBtn);

  // Day cycling buttons on daily views
  if (isDayRoute){
    const ayerBtn = document.createElement("button");
    ayerBtn.className = "navBtn";
    ayerBtn.type = "button";
    ayerBtn.textContent = "Ayer";
    ayerBtn.addEventListener("click", () => { goto(prevDayKey(currentDayKey)); });
    nav.appendChild(ayerBtn);

    const mananaBtn = document.createElement("button");
    mananaBtn.className = "navBtn";
    mananaBtn.type = "button";
    mananaBtn.textContent = "Mañana";
    mananaBtn.addEventListener("click", () => { goto(nextDayKey(currentDayKey)); });
    nav.appendChild(mananaBtn);
  }

  // Small page label
  const label = document.createElement("div");
  label.style.marginLeft = "6px";
  label.style.fontSize = "13px";
  label.style.opacity = "0.8";
  label.style.whiteSpace = "nowrap";
  let lbl = "";
  if (r === "dashboard") lbl = "Dashboard";
  else if (r === "biweekly") lbl = "Bi-weekly";
  else if (r === "monthly") lbl = "Monthly";
  else if (r === "maintenance") lbl = "Maintenance";
  else if (r === "admin") lbl = "Admin";
  else if (r === "celos-school") lbl = "Celo's School";
  else if (r === "hoy") lbl = `Hoy • ${today}`;
  else if (DAYS.includes(r)) lbl = (r === today) ? `Hoy • ${today}` : r;
  label.textContent = lbl;
  nav.appendChild(label);

  const spacer = document.createElement("div");
  spacer.className = "spacer";
  nav.appendChild(spacer);

  // Groceries button
  const groceryBtn = document.createElement("button");
  groceryBtn.className = "groceryBtn";
  groceryBtn.type = "button";
  groceryBtn.setAttribute("aria-label", "Groceries");
  groceryBtn.textContent = "🛒";
  nav.appendChild(groceryBtn);

  // --- Side panel + overlay (created once) ---
  let overlay = document.getElementById("sideOverlay");
  let panel = document.getElementById("sidePanel");

  if (!overlay){
    overlay = document.createElement("div");
    overlay.id = "sideOverlay";
    overlay.className = "sideOverlay";
    document.body.appendChild(overlay);
  }

  if (!panel){
    panel = document.createElement("aside");
    panel.id = "sidePanel";
    panel.className = "sidePanel";
    panel.setAttribute("aria-label", "App navigation");
    panel.innerHTML = `
      <div class="sideHeader">
        <div class="sideTitle">Navigation</div>
        <button class="sideClose" type="button" id="sideCloseBtn" aria-label="Close menu">✕</button>
      </div>
      <nav class="sideNav" id="sideNav"></nav>
    `;
    document.body.appendChild(panel);
  }

  const sideNav = panel.querySelector("#sideNav");

  function closeSide(){
    overlay.classList.remove("open");
    panel.classList.remove("open");
  }

  function openSide(){
    overlay.classList.add("open");
    panel.classList.add("open");
  }

  const navItems = [
    { text: "Hoy",           path: "hoy",          active: r === "hoy" || DAYS.includes(r) },
    { text: "Dashboard",     path: "dashboard",     active: r === "dashboard" },
    { text: "Celo's School", path: "celos-school",  active: r === "celos-school" },
    { text: "Bi-weekly",     path: "biweekly",      active: r === "biweekly" },
    { text: "Monthly",       path: "monthly",       active: r === "monthly" },
    { text: "Maintenance",   path: "maintenance",   active: r === "maintenance" },
    { text: "Admin",         path: "admin",         active: r === "admin" },
  ];

  if (sideNav.children.length === 0) {
    navItems.forEach(({ text, path }) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sideBtn";
      b.dataset.path = path;
      b.textContent = text;
      b.onclick = () => { closeSide(); goto(path); };
      sideNav.appendChild(b);
    });
  }

  navItems.forEach(({ path, active }) => {
    const b = sideNav.querySelector(`[data-path="${path}"]`);
    if (b) b.classList.toggle("active", active);
  });

  ham.onclick = (e) => { e.stopPropagation(); openSide(); };

  const closeBtn = panel.querySelector("#sideCloseBtn");
  if (closeBtn) closeBtn.onclick = closeSide;

  overlay.onclick = closeSide;

  // --- Notes overlay (created once) ---
  let nOverlay = document.getElementById("notesOverlay");
  let nPanel = document.getElementById("notesPanel");

  if (!nOverlay){
    nOverlay = document.createElement("div");
    nOverlay.id = "notesOverlay";
    nOverlay.className = "notesOverlay";
    document.body.appendChild(nOverlay);
  }

  if (!nPanel){
    nPanel = document.createElement("div");
    nPanel.id = "notesPanel";
    nPanel.className = "notesPanel";
    nPanel.setAttribute("aria-label", "Day notes");
    nPanel.innerHTML = `
      <div class="notesHeader">
        <div class="notesTitle" id="notesPanelTitle">Notas</div>
        <button class="notesClose" type="button" id="notesCloseBtn" aria-label="Close notes">✕</button>
      </div>
      <div class="notesBody">
        <div class="hint" id="notesPanelHint">Read-only</div>
        <textarea id="notesPanelText" readonly placeholder="No notes yet..."></textarea>
      </div>
    `;
    document.body.appendChild(nPanel);
  }

  function closeNotes(){
    nOverlay.classList.remove("open");
    nPanel.classList.remove("open");
  }

  function openNotesForDay(dayKey){
    const ds = loadDailyState();
    const note = (ds[dayKey] && typeof ds[dayKey].notes === "string") ? ds[dayKey].notes : "";

    const titleEl = document.getElementById("notesPanelTitle");
    const hintEl = document.getElementById("notesPanelHint");
    const taEl = document.getElementById("notesPanelText");

    if (titleEl) titleEl.textContent = `Notas para ${dayKey}`;
    if (hintEl) hintEl.textContent = "Read-only (edit on Dashboard)";
    if (taEl){
      taEl.value = note || "";
      taEl.placeholder = `Notas para ${dayKey}...`;
    }

    nOverlay.classList.add("open");
    nPanel.classList.add("open");
  }

  window.__openNotesForDay = openNotesForDay;

  const notesCloseBtn = document.getElementById("notesCloseBtn");
  if (notesCloseBtn) notesCloseBtn.onclick = closeNotes;
  nOverlay.onclick = closeNotes;

  // --- Groceries overlay (created once) ---
  let gOverlay = document.getElementById("groceryOverlay");
  let gPanel = document.getElementById("groceryPanel");

  if (!gOverlay){
    gOverlay = document.createElement("div");
    gOverlay.id = "groceryOverlay";
    gOverlay.className = "groceryOverlay";
    document.body.appendChild(gOverlay);
  }

  if (!gPanel){
    gPanel = document.createElement("div");
    gPanel.id = "groceryPanel";
    gPanel.className = "groceryPanel";
    gPanel.setAttribute("aria-label", "Groceries");
    gPanel.innerHTML = `
      <div class="groceryHeader">
        <div class="groceryTitle">Groceries</div>
        <button class="groceryClose" type="button" id="groceryCloseBtn" aria-label="Close groceries">✕</button>
      </div>
      <div class="groceryBody">
        <div class="hint" style="margin-top:0;">Add items as you notice them running low. One tap beats arguing later.</div>

        <div class="groceryForm">
          <input id="groceryText" placeholder="Add item…" />
          <button id="groceryAdd" type="button">Add</button>
        </div>

        <div class="groceryActions">
          <button class="groceryReset" id="groceryReset" type="button">Reset list</button>
        </div>

        <div class="groceryList" id="groceryList"></div>
      </div>
    `;
    document.body.appendChild(gPanel);
  }

  function closeGroceries(){
    gOverlay.classList.remove("open");
    gPanel.classList.remove("open");
  }

  function openGroceries(){
    renderGroceriesPanel();
    gOverlay.classList.add("open");
    gPanel.classList.add("open");

    const input = document.getElementById("groceryText");
    if (input) setTimeout(() => input.focus(), 0);
  }

  window.__openGroceries = openGroceries;

  const gClose = document.getElementById("groceryCloseBtn");
  if (gClose) gClose.onclick = closeGroceries;
  gOverlay.onclick = closeGroceries;

  groceryBtn.onclick = (e) => { e.stopPropagation(); openGroceries(); };

  if (!document._choreEscHandler) {
    document._choreEscHandler = (ev) => {
      if (ev.key !== "Escape") return;
      const sideOverlayEl = document.getElementById("sideOverlay");
      const sidePanelEl   = document.getElementById("sidePanel");
      const notesOverlayEl = document.getElementById("notesOverlay");
      const notesPanelEl   = document.getElementById("notesPanel");
      if (sideOverlayEl) sideOverlayEl.classList.remove("open");
      if (sidePanelEl)   sidePanelEl.classList.remove("open");
      if (notesOverlayEl) notesOverlayEl.classList.remove("open");
      if (notesPanelEl)   notesPanelEl.classList.remove("open");
    };
    document.addEventListener("keydown", document._choreEscHandler);
  }
}

export function addContextResetButton(r){
  const nav = document.getElementById("topNav");
  const existing = document.getElementById("ctxReset");
  if (existing) existing.remove();

  if (DAYS.includes(r)){
    // View notes shortcut
    const notesBtn = document.createElement("button");
    notesBtn.id = "ctxViewNotes";
    notesBtn.className = "navBtn";
    notesBtn.textContent = "View notes";
    notesBtn.onclick = () => {
      if (r === todayKey()){
        const openFn = window.__openNotesForDay;
        if (typeof openFn === "function"){
          openFn(r);
          return;
        }
      }

      // Jump to dashboard and show read-only notes there
      const dash = loadDashState();
      dash.viewerDay = r;
      dash.viewerReadOnly = true;
      saveDashState(dash);
      goto("dashboard");
    };
    nav.appendChild(notesBtn);

    const btn = document.createElement("button");
    btn.id = "ctxReset";
    btn.className = "navBtn danger";
    btn.textContent = "Weekly Reset";
    btn.onclick = weeklyReset;
    nav.appendChild(btn);
  }
}
