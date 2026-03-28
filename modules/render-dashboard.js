import { PEOPLE, DAYS, WEEKLY_CHORES, BIWEEKLY_CHORES, MONTHLY_CHORES } from './constants.js';
import { todayKey, escapeHtml } from './utils.js';
import {
  loadDailyState, saveDailyState,
  loadDashState, saveDashState,
  loadWeeklyState, loadBiweeklyState, loadMonthlyState,
  loadMemberColors
} from './state.js';
import { getTasksForDay } from './planner.js';

function emptyContribution(){
  const byPerson = {};
  PEOPLE.forEach(p => byPerson[p] = 0);
  return byPerson;
}

function calcDailyProgress(){
  const day = todayKey();
  const s = loadDailyState();
  const dayObj = s[day] || { checks:{} };

  const tasks = getTasksForDay(day);

  let total = 0;
  let done = 0;
  const byPerson = emptyContribution();
  const totalByPerson = emptyContribution();

  for (const t of tasks){
    const assignees = Array.isArray(t.assignees) ? t.assignees : [];
    for (const person of assignees){
      if (!PEOPLE.includes(person)) continue;
      total++;
      totalByPerson[person] = (totalByPerson[person] || 0) + 1;

      const key = `${t.id}::${person}`;
      const checked = !!(dayObj.checks && dayObj.checks[key]);
      if (checked){
        done++;
        byPerson[person] = (byPerson[person] || 0) + 1;
      }
    }
  }

  return { done, total, byPerson, totalByPerson };
}

function calcAssignedListProgress(list, loadFn){
  const total = list.length;
  const s = loadFn();
  const byPerson = emptyContribution();
  const totalByPerson = emptyContribution();

  let done = 0;
  list.forEach(item => {
    const checked  = !!(s.checks && s.checks[item]);
    const assigned = (s.assign && s.assign[item]) ? s.assign[item] : "";

    if (assigned && totalByPerson[assigned] !== undefined){
      totalByPerson[assigned] = (totalByPerson[assigned] || 0) + 1;
    }

    if (checked && assigned){
      done++;
      if (byPerson[assigned] !== undefined) byPerson[assigned] = (byPerson[assigned] || 0) + 1;
    }
  });

  return { done, total, byPerson, totalByPerson };
}

function calcWeeklyProgress(){
  return calcAssignedListProgress(WEEKLY_CHORES, loadWeeklyState);
}

function calcBiweeklyProgress(){
  return calcAssignedListProgress(BIWEEKLY_CHORES, loadBiweeklyState);
}

function calcMonthlyProgress(){
  return calcAssignedListProgress(MONTHLY_CHORES, loadMonthlyState);
}

function pct(done, total){
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function ringFilterOptions(selected){
  const opts = ["All", ...PEOPLE];
  return opts.map(v => `<option value="${escapeHtml(v)}" ${v===selected?"selected":""}>${escapeHtml(v)}</option>`).join("");
}

function applyRingFilter(progressObj, selected){
  if (!progressObj) return { done:0, total:0, byPerson: emptyContribution(), totalByPerson: emptyContribution() };
  if (!selected || selected === "All") return progressObj;

  const personDone  = (progressObj.byPerson && typeof progressObj.byPerson[selected] === "number") ? progressObj.byPerson[selected] : 0;
  const personTotal = (progressObj.totalByPerson && typeof progressObj.totalByPerson[selected] === "number") ? progressObj.totalByPerson[selected] : 0;

  const by = emptyContribution();
  by[selected] = personDone;

  const totBy = emptyContribution();
  totBy[selected] = personTotal;

  return { done: personDone, total: personTotal, byPerson: by, totalByPerson: totBy };
}

function ringSVG(done, total, byPerson){
  const r = 30;
  const cx = 38, cy = 38;
  const c = 2 * Math.PI * r;

  const safeTotal = Math.max(0, Number(total) || 0);
  const safeDone  = Math.max(0, Math.min(safeTotal, Number(done) || 0));
  const p = safeTotal ? (safeDone / safeTotal) : 0;

  const filled = p * c;

  const colors = loadMemberColors();

  const segments = [];
  PEOPLE.forEach(person => {
    const count = byPerson && typeof byPerson[person] === "number" ? byPerson[person] : 0;
    if (count > 0 && safeDone > 0){
      segments.push({
        person,
        count,
        color: colors[person] || "rgba(255,255,255,0.9)"
      });
    }
  });

  let offset = 0;
  const segSvgs = segments.map(seg => {
    const segLen = (seg.count / safeDone) * filled;
    const svg = `
      <circle class="chalkStroke" cx="${cx}" cy="${cy}" r="${r}"
        stroke="${seg.color}" stroke-width="10" fill="none"
        stroke-linecap="round"
        stroke-dasharray="${segLen} ${Math.max(0, c - segLen)}"
        stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})" />
    `;
    offset += segLen;
    return svg;
  }).join("");

  return `
    <svg width="128" height="128" viewBox="0 0 76 76" aria-hidden="true">
      <circle class="chalkTrack" cx="${cx}" cy="${cy}" r="${r}"
        stroke="var(--ringTrack)" stroke-width="10" fill="none" />
      ${segSvgs}
    </svg>
  `;
}

function ringCard(title, ringKey, prog, percent, selected){
  const done = prog ? (prog.done || 0) : 0;
  const total = prog ? (prog.total || 0) : 0;
  const byPerson = prog ? (prog.byPerson || emptyContribution()) : emptyContribution();

  const sub = total ? `${done}/${total} complete` : `0/0`;

  return `
    <div class="ringCard">
      <div class="ringSvgWrap">
        ${ringSVG(done, total, byPerson)}
        <div class="pct">${percent}%</div>
      </div>
      <div class="ringMeta">
        <div class="title">${title}</div>
        <select class="ringFilter" data-ring="${escapeHtml(ringKey)}">
          ${ringFilterOptions(selected)}
        </select>
        <div class="sub">${sub}</div>
      </div>
    </div>
  `;
}

export function renderDashboard(){
  const app = document.getElementById("app");

  const w = calcWeeklyProgress();
  const b = calcBiweeklyProgress();
  const m = calcMonthlyProgress();
  const d = calcDailyProgress();

  const dash = loadDashState();
  const filters = dash.ringFilters || { daily:"All", weekly:"All", biweekly:"All", monthly:"All" };

  const df = applyRingFilter(d, filters.daily);
  const wf = applyRingFilter(w, filters.weekly);
  const bf = applyRingFilter(b, filters.biweekly);
  const mf = applyRingFilter(m, filters.monthly);

  const dpF = pct(df.done, df.total);
  const wpF = pct(wf.done, wf.total);
  const bpF = pct(bf.done, bf.total);
  const mpF = pct(mf.done, mf.total);

  app.innerHTML = `
    <div class="dashGrid">
      <div class="panel">
        <div class="dashHeaderRow">
          <h2>Progress Dashboard</h2>
        </div>
        <div class="hint">Rings track completion for Daily (Hoy), Semanal, Bi-weekly, and Monthly. (Maintenance not included yet.)</div>

        <div class="rings">
          ${ringCard("Daily (Hoy)", "daily",    df, dpF, filters.daily)}
          ${ringCard("Semanal",     "weekly",   wf, wpF, filters.weekly)}
          ${ringCard("Bi-weekly",   "biweekly", bf, bpF, filters.biweekly)}
          ${ringCard("Monthly",     "monthly",  mf, mpF, filters.monthly)}
        </div>
      </div>

      <div class="panel notesBox">
        <h2>Notas</h2>
        <div class="hint">Two fields: general dashboard notes, plus day-specific notes viewer.</div>

        <textarea id="dashNotes" placeholder="Write dashboard notes..."></textarea>

        <div style="height:10px;"></div>

        <div class="hint" id="dayNotesLabel"></div>
        <textarea id="dayNotes" placeholder=""></textarea>
      </div>
    </div>
  `;

  const dashTA = document.getElementById("dashNotes");
  const dayTA = document.getElementById("dayNotes");
  const dayLabel = document.getElementById("dayNotesLabel");

  dashTA.value = dash.dashboardNotes || "";
  dashTA.oninput = () => {
    const cur = loadDashState();
    cur.dashboardNotes = dashTA.value;
    saveDashState(cur);
  };

  const selectedDay = (dash.viewerDay && DAYS.includes(dash.viewerDay)) ? dash.viewerDay : todayKey();
  const ro = !!dash.viewerReadOnly;

  const ds = loadDailyState();
  ds[selectedDay] = ds[selectedDay] || { checks:{}, notes:"" };

  if (dayLabel) dayLabel.textContent = `Notas para ${selectedDay}...`;
  dayTA.value = ds[selectedDay].notes || "";
  dayTA.placeholder = `Notas para ${selectedDay}...`;
  dayTA.readOnly = ro;
  dayTA.style.opacity = ro ? "0.85" : "1";

  dayTA.oninput = () => {
    const curDash = loadDashState();
    const currentSelected = (curDash.viewerDay && DAYS.includes(curDash.viewerDay)) ? curDash.viewerDay : todayKey();

    if (curDash.viewerReadOnly) return;
    if (currentSelected !== todayKey()) return;

    const dss = loadDailyState();
    dss[currentSelected] = dss[currentSelected] || { checks:{}, notes:"" };
    dss[currentSelected].notes = dayTA.value;
    saveDailyState(dss);
  };

  // Reset viewer back to normal defaults
  dash.viewerDay = todayKey();
  dash.viewerReadOnly = false;
  saveDashState(dash);

  document.querySelectorAll(".ringFilter").forEach(sel => {
    sel.onchange = () => {
      const key = sel.getAttribute("data-ring");
      const val = sel.value;
      const cur = loadDashState();
      cur.ringFilters = cur.ringFilters || { daily:"All", weekly:"All", biweekly:"All", monthly:"All" };
      if (key) cur.ringFilters[key] = val;
      saveDashState(cur);
      renderDashboard();
    };
  });
}
