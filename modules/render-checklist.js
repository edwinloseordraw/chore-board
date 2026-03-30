import { PEOPLE, BIWEEKLY_CHORES, MONTHLY_CHORES } from './constants.js';
import { escapeHtml } from './utils.js';
import {
  loadBiweeklyState, saveBiweeklyState,
  loadMonthlyState, saveMonthlyState
} from './state.js';

function buildAssignSelect() {
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
  return sel;
}

export function renderChecklistPage(kind){
  const app = document.getElementById("app");
  const isBi = kind === "biweekly";
  const title = isBi ? "Bi-weekly" : "Monthly";
  const list = isBi ? BIWEEKLY_CHORES : MONTHLY_CHORES;

  app.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <div class="left">
          <h2 style="margin:0;">${title}</h2>
          <div class="hint" style="margin:0;">Check items as you complete them. Use the reset button to clear this section only.</div>
        </div>
        <div class="right">
          <button class="danger" id="btnReset">${title} Reset</button>
        </div>
      </div>
      <div class="listGrid" id="listGrid"></div>
    </section>
  `;

  const grid = document.getElementById("listGrid");
  grid.innerHTML = "";

  if (list.length === 0){
    const empty = document.createElement("div");
    empty.className = "panel";
    empty.style.background = "transparent";
    empty.style.borderStyle = "dashed";
    empty.style.color = "rgba(245,245,245,0.7)";
    empty.textContent = "No items yet. We'll add them next phase.";
    grid.appendChild(empty);
  } else {
    const state = isBi ? loadBiweeklyState() : loadMonthlyState();
    state.checks = state.checks || {};
    state.assign = state.assign || {};

    list.forEach(item => {
      const row = document.createElement("div");
      row.className = "listItem";
      if (!!state.checks[item]) row.classList.add("pressed");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = `${kind}__${item}`;
      cb.checked = !!state.checks[item];
      cb.onchange = () => {
        const s = isBi ? loadBiweeklyState() : loadMonthlyState();
        s.checks = s.checks || {};
        s.checks[item] = cb.checked;
        isBi ? saveBiweeklyState(s) : saveMonthlyState(s);
        row.classList.toggle("pressed", cb.checked);
      };

      const name = document.createElement("label");
      name.className = "name";
      name.htmlFor = cb.id;
      name.style.cursor = "pointer";
      name.textContent = item;

      const sel = buildAssignSelect();
      sel.value = state.assign[item] || "";
      sel.onchange = () => {
        const s = isBi ? loadBiweeklyState() : loadMonthlyState();
        s.assign = s.assign || {};
        s.assign[item] = sel.value;
        if (isBi) saveBiweeklyState(s);
        else saveMonthlyState(s);
      };

      row.appendChild(cb);
      row.appendChild(name);
      row.appendChild(sel);

      grid.appendChild(row);
    });
  }

  document.getElementById("btnReset").onclick = () => {
    if (!confirm(`Reset ${title} checklist? This clears only this section's checks and assignments.`)) return;
    if (isBi) saveBiweeklyState({ checks:{}, assign:{} });
    else saveMonthlyState({ checks:{}, assign:{} });
    renderChecklistPage(kind);
  };
}
