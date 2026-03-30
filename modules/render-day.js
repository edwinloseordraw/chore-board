import { PEOPLE, WEEKLY_CHORES, BIWEEKLY_CHORES, MONTHLY_CHORES } from './constants.js';
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

  renderDailyColumns(dayKey, dayState);
  renderListSection("weeklyGrid",   WEEKLY_CHORES,   loadWeeklyState,   saveWeeklyState,   { rowClass:"weeklyItem", labelClass:"label", selectClass:"",            prefix:"weekly"   });
  renderListSection("biweeklyGrid", BIWEEKLY_CHORES, loadBiweeklyState, saveBiweeklyState, { rowClass:"listItem",   labelClass:"name",  selectClass:"assignSelect", prefix:"biweekly" });
  renderListSection("monthlyGrid",  MONTHLY_CHORES,  loadMonthlyState,  saveMonthlyState,  { rowClass:"listItem",   labelClass:"name",  selectClass:"assignSelect", prefix:"monthly"  });

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

function buildAssignSelect(className) {
  const sel = document.createElement("select");
  if (className) sel.className = className;
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
  return sel;
}

function renderListSection(gridId, list, loadFn, saveFn, { rowClass, labelClass, selectClass, prefix }) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = "";

  const state = loadFn();
  state.checks = state.checks || {};
  state.assign = state.assign || {};

  list.forEach(item => {
    const row = document.createElement("div");
    row.className = rowClass;
    if (state.checks[item]) row.classList.add("pressed");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = `${prefix}__${item}`;
    cb.checked = !!state.checks[item];
    cb.onchange = () => {
      const s = loadFn();
      s.checks = s.checks || {};
      s.checks[item] = cb.checked;
      saveFn(s);
      row.classList.toggle("pressed", cb.checked);
    };

    const lab = document.createElement("label");
    lab.className = labelClass;
    lab.htmlFor = cb.id;
    lab.style.cursor = "pointer";
    lab.textContent = item;

    const sel = buildAssignSelect(selectClass);
    sel.value = state.assign[item] || "";
    sel.onchange = () => {
      const s = loadFn();
      s.assign = s.assign || {};
      s.assign[item] = sel.value;
      saveFn(s);
    };

    row.appendChild(cb);
    row.appendChild(lab);
    row.appendChild(sel);
    grid.appendChild(row);
  });
}

function renderDailyColumns(dayKey, state){
  const columns = document.getElementById("columns");
  columns.innerHTML = "";

  const colors = loadMemberColors();
  const photos = loadMemberPhotos();

  PEOPLE.forEach(person => {
    const col = document.createElement("div");
    col.className = "column";

    const pc = colors[person] || "#ffffff";
    col.style.border = `2px solid ${pc}`;
    col.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.06), 0 14px 28px rgba(0,0,0,0.28)`;

    const header = document.createElement("div");
    header.className = "memberHeader";
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.alignItems = "center";
    header.style.gap = "8px";

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

      const wrap = document.createElement("label");
      wrap.className = "choreLabel";
      if (cb.checked) wrap.classList.add("pressed");
      wrap.htmlFor = cb.id;

      cb.onchange = () => {
        const s = loadDailyState();
        s[dayKey] = s[dayKey] || { checks:{}, notes:"" };
        const key = `${t.id}::${person}`;
        s[dayKey].checks[key] = cb.checked;
        saveDailyState(s);
        wrap.classList.toggle("pressed", cb.checked);
      };

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
