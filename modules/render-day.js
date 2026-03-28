import { PEOPLE, DAYS, WEEKLY_CHORES, BIWEEKLY_CHORES, MONTHLY_CHORES } from './constants.js';
import { todayKey, formatMMDDYYYY, dateForDayKey, escapeHtml } from './utils.js';
import {
  loadDailyState, saveDailyState,
  loadWeeklyState, saveWeeklyState,
  loadBiweeklyState, saveBiweeklyState,
  loadMonthlyState, saveMonthlyState,
  loadMemberColors, loadMemberPhotos,
  resetDailyAndWeeklyChoreState
} from './state.js';
import { getTasksForDay } from './planner.js';

/* =========================
   DAY VIEW
========================= */

export function renderDay(dayKey){
  const app = document.getElementById("app");

  const dayState = loadDailyState();
  dayState[dayKey] = dayState[dayKey] || { checks:{}, notes:"" };

  const dayDate = formatMMDDYYYY(dateForDayKey(dayKey));
  const currentNote = (dayState[dayKey] && typeof dayState[dayKey].notes === "string")
    ? dayState[dayKey].notes.trim()
    : "";
  const pickupReminder = dayKey === "lunes"
    ? "Trash and recycling pick up tomorrow."
    : dayKey === "jueves"
      ? "Trash pick up tomorrow."
      : "";

  app.innerHTML = `
    <section class="panel" aria-label="Day header">
      <div class="dayHeaderBar">
        <h2 class="dayTitle" style="margin:0;">${dayKey}</h2>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="dayDate">${dayDate}</div>
          ${dayKey === "domingo" ? '<button class="danger" id="btnWeeklyDayReset" type="button">Reset</button>' : ''}
        </div>
      </div>
      ${pickupReminder ? `<div style="margin-top:8px; font-size:15px; font-weight:600; opacity:0.92;">${pickupReminder}</div>` : ""}
    </section>

    ${currentNote ? `
      <section class="panel" aria-label="Day note">
        <div style="font-weight:700; margin-bottom:6px;">${dayKey} note</div>
        <div class="hint" style="margin-top:0;">Added from Dashboard/Admin</div>
        <div style="margin-top:8px; font-size:18px; line-height:1.45;">${escapeHtml(currentNote)}</div>
      </section>
    ` : ""}

    <div class="columns" id="columns"></div>

    <section class="panel" aria-label="Weekly chores">
      <h3 style="font-size:22px; letter-spacing:0.5px;">Semanal</h3>
      <div class="hint">Asignar y rotar manualmente. Se mantiene igual en todos los días.</div>
      <div class="weeklyGrid" id="weeklyGrid"></div>
    </section>
    <section class="panel" aria-label="Bi-weekly chores">
      <h3 style="font-size:22px; letter-spacing:0.5px;">Quincenal</h3>
      <div class="hint">Asignar y rotar manualmente. Se mantiene igual en todos los días.</div>
      <div class="listGrid" id="biweeklyGrid"></div>
    </section>
    <section class="panel" aria-label="Monthly chores">
      <h3 style="font-size:22px; letter-spacing:0.5px;">Mensual</h3>
      <div class="hint">Asignar y rotar manualmente. Se mantiene igual en todos los días.</div>
      <div class="listGrid" id="monthlyGrid"></div>
    </section>
  `;

  renderDailyColumns(dayKey);
  renderWeekly();
  renderBiweeklyInline();
  renderMonthlyInline();

  if (dayKey === "domingo") {
    const resetBtn = document.getElementById("btnWeeklyDayReset");
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (!confirm("Reset daily checkboxes, weekly checkboxes, and weekly assignments?")) return;
        resetDailyAndWeeklyChoreState();
        renderDay(dayKey);
      };
    }
  }
}

/* =========================
   DAILY COLUMNS
========================= */

function renderDailyColumns(dayKey){
  const columns = document.getElementById("columns");
  columns.innerHTML = "";

  const state = loadDailyState();
  state[dayKey] = state[dayKey] || { checks:{}, notes:"" };

  PEOPLE.forEach(person => {
    const col = document.createElement("div");
    col.className = "column";

    const colors = loadMemberColors();
    const pc = colors[person] || "#ffffff";

    col.style.border = `2px solid ${pc}`;
    col.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.06), 0 14px 28px rgba(0,0,0,0.28)`;

    const header = document.createElement("div");
    header.className = "memberHeader";
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.alignItems = "center";
    header.style.gap = "8px";

    const photos = loadMemberPhotos();
    const url = (photos && typeof photos[person] === "string") ? photos[person] : "";

    let avatar;
    if (url){
      avatar = document.createElement("div");
      avatar.className = "avatarCircle";
      avatar.style.width = "72px";
      avatar.style.height = "72px";

      const img = document.createElement("img");
      img.alt = `${person} avatar`;
      img.src = url;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      avatar.appendChild(img);
    } else {
      avatar = document.createElement("div");
      avatar.className = "avatarFallback";
      avatar.style.width = "72px";
      avatar.style.height = "72px";
      avatar.style.display = "flex";
      avatar.style.alignItems = "center";
      avatar.style.justifyContent = "center";
      avatar.textContent = (person || "").slice(0,2).toUpperCase();
    }

    const h = document.createElement("h2");
    h.textContent = person;
    h.style.color = pc;
    h.style.margin = "0";
    h.style.fontSize = "18px";
    h.style.textAlign = "center";

    header.appendChild(avatar);
    header.appendChild(h);
    col.appendChild(header);

    let tasks = getTasksForDay(dayKey).filter(t => (t.assignees || []).includes(person));

    // Force reminder to bottom for Dad
    if (person === "Dad") {
      tasks = tasks.sort((a, b) => {
        const aSlug = String((a.id || "")).split("::")[1] || "";
        const bSlug = String((b.id || "")).split("::")[1] || "";

        const aIsReminder = aSlug === "checkAgenda";
        const bIsReminder = bSlug === "checkAgenda";

        if (aIsReminder && !bIsReminder) return 1;
        if (!aIsReminder && bIsReminder) return -1;
        return 0;
      });
    }

    tasks.forEach(t => {
      const row = document.createElement("div");
      row.className = "chore";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      try{ cb.style.accentColor = pc; }catch(e){}
      cb.id = `${t.id}__${person}`;
      cb.checked = !!state[dayKey].checks[`${t.id}::${person}`];
      cb.onchange = () => {
        const s = loadDailyState();
        s[dayKey] = s[dayKey] || { checks:{}, notes:"" };
        const key = `${t.id}::${person}`;
        s[dayKey].checks[key] = cb.checked;
        saveDailyState(s);
        renderDailyColumns(dayKey);
      };

      const wrap = document.createElement("label");
      wrap.className = "choreLabel";
      if (cb.checked) wrap.classList.add("pressed");
      wrap.htmlFor = cb.id;

      const text = document.createElement("span");

      if ((t.assignees || []).length === 2) {
        const other = (t.assignees || []).find(p => p !== person) || "";
        const base = (t.text || "").trim();
        text.textContent = other ? `${base} (with ${other})` : base;
      } else {
        text.textContent = (t.text || "").trim();
      }

      wrap.appendChild(cb);
      wrap.appendChild(text);
      row.appendChild(wrap);
      col.appendChild(row);
    });

    columns.appendChild(col);
  });
}

/* =========================
   WEEKLY CHORES (inline)
========================= */

function renderWeekly(){
  const grid = document.getElementById("weeklyGrid");
  grid.innerHTML = "";

  const w = loadWeeklyState();
  w.checks = w.checks || {};
  w.assign = w.assign || {};

  WEEKLY_CHORES.forEach(chore => {
    const row = document.createElement("div");
    row.className = "weeklyItem";
    if (!!w.checks[chore]) row.classList.add("pressed");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!w.checks[chore];
    cb.onchange = () => {
      const ws = loadWeeklyState();
      ws.checks = ws.checks || {};
      ws.checks[chore] = cb.checked;
      saveWeeklyState(ws);
      renderWeekly();
    };

    cb.id = `weekly__${chore}`;
    const wlab = document.createElement("label");
    wlab.className = "label";
    wlab.htmlFor = cb.id;
    wlab.textContent = chore;

    const sel = document.createElement("select");
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Asignar…";
    sel.appendChild(blank);

    PEOPLE.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    });

    sel.value = w.assign[chore] || "";
    sel.onchange = () => {
      const ws = loadWeeklyState();
      ws.assign = ws.assign || {};
      ws.assign[chore] = sel.value;
      saveWeeklyState(ws);
    };

    row.appendChild(cb);
    row.appendChild(wlab);
    row.appendChild(sel);
    grid.appendChild(row);
  });

  saveWeeklyState(w);
}

/* =========================
   BIWEEKLY CHORES (inline)
========================= */

function renderBiweeklyInline(){
  const grid = document.getElementById("biweeklyGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const s = loadBiweeklyState();
  s.checks = s.checks || {};
  s.assign = s.assign || {};

  BIWEEKLY_CHORES.forEach(item => {
    const row = document.createElement("div");
    row.className = "listItem";
    if (!!s.checks[item]) row.classList.add("pressed");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `biweekly__${item}`;
    cb.checked = !!s.checks[item];
    cb.onchange = () => {
      const cur = loadBiweeklyState();
      cur.checks = cur.checks || {};
      cur.checks[item] = cb.checked;
      saveBiweeklyState(cur);
      renderBiweeklyInline();
    };

    const lab = document.createElement("label");
    lab.className = "name";
    lab.htmlFor = cb.id;
    lab.style.cursor = "pointer";
    lab.textContent = item;

    const sel = document.createElement("select");
    sel.className = "assignSelect";

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Asignar…";
    sel.appendChild(blank);

    PEOPLE.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    });

    sel.value = s.assign[item] || "";
    sel.onchange = () => {
      const cur = loadBiweeklyState();
      cur.assign = cur.assign || {};
      cur.assign[item] = sel.value;
      saveBiweeklyState(cur);
    };

    row.appendChild(cb);
    row.appendChild(lab);
    row.appendChild(sel);
    grid.appendChild(row);
  });

  saveBiweeklyState(s);
}

/* =========================
   MONTHLY CHORES (inline)
========================= */

function renderMonthlyInline(){
  const grid = document.getElementById("monthlyGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const s = loadMonthlyState();
  s.checks = s.checks || {};
  s.assign = s.assign || {};

  MONTHLY_CHORES.forEach(item => {
    const row = document.createElement("div");
    row.className = "listItem";
    if (!!s.checks[item]) row.classList.add("pressed");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `monthly__${item}`;
    cb.checked = !!s.checks[item];
    cb.onchange = () => {
      const cur = loadMonthlyState();
      cur.checks = cur.checks || {};
      cur.checks[item] = cb.checked;
      saveMonthlyState(cur);
      renderMonthlyInline();
    };

    const lab = document.createElement("label");
    lab.className = "name";
    lab.htmlFor = cb.id;
    lab.style.cursor = "pointer";
    lab.textContent = item;

    const sel = document.createElement("select");
    sel.className = "assignSelect";

    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Asignar…";
    sel.appendChild(blank);

    PEOPLE.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    });

    sel.value = s.assign[item] || "";
    sel.onchange = () => {
      const cur = loadMonthlyState();
      cur.assign = cur.assign || {};
      cur.assign[item] = sel.value;
      saveMonthlyState(cur);
    };

    row.appendChild(cb);
    row.appendChild(lab);
    row.appendChild(sel);
    grid.appendChild(row);
  });

  saveMonthlyState(s);
}
