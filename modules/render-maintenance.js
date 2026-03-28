import { PEOPLE } from './constants.js';
import { escapeHtml, isoToday, makeId } from './utils.js';
import { loadMaintState, saveMaintState } from './state.js';

export function renderMaintenance(){
  const app = document.getElementById("app");
  const s = loadMaintState();
  s.entries = s.entries || [];

  // Migrate legacy entries (no id) so delete works reliably
  let changed = false;
  s.entries = s.entries.map(e => {
    if (!e || typeof e !== "object") return e;
    if (!e.id) {
      changed = true;
      return { ...e, id: makeId() };
    }
    return e;
  });
  if (changed) saveMaintState(s);

  // Sort newest first
  const entries = [...s.entries].sort((a, b) => {
    const da = (a.date || "");
    const db = (b.date || "");
    if (da === db) return 0;
    return da < db ? 1 : -1;
  });

  const peopleOpts = PEOPLE.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

  const suggestions = [
    "Change AC filter",
    "AC Flush",
    "Pool Filter clean/change"
  ];

  const suggestionOptions = suggestions
    .map(t => `<option value="${escapeHtml(t)}"></option>`)
    .join("");

  app.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <div class="left">
          <h2 style="margin:0;">House Maintenance</h2>
          <div class="hint" style="margin:0;">Log entries with task, completed by, and date. Stored locally on this device.</div>
        </div>
        <div class="right">
          <button class="danger" id="btnResetMaint">Maintenance Reset</button>
        </div>
      </div>

      <div class="panel" style="margin-top:12px;">
        <div class="hint" style="margin-top:0;">Add a new entry</div>

        <div class="maintForm">
          <div class="field">
            <label>Task</label>
            <input id="maintTask" list="maintTaskSuggestions" placeholder="Type a task (or pick a suggestion)..." />
            <datalist id="maintTaskSuggestions">
              ${suggestionOptions}
            </datalist>
          </div>

          <div class="field">
            <label>Completed by</label>
            <select id="maintBy">
              <option value="">Select…</option>
              ${peopleOpts}
            </select>
          </div>

          <div class="field">
            <label>Date</label>
            <input id="maintDate" type="date" />
          </div>

          <div class="field actions">
            <label>&nbsp;</label>
            <button id="btnAddMaint">Add entry</button>
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:12px;">
        <div class="toolbar" style="margin-bottom:8px;">
          <div class="left">
            <div class="hint" style="margin:0;">History</div>
          </div>
          <div class="right">
            <div class="hint" style="margin:0;">${entries.length} entr${entries.length === 1 ? "y" : "ies"}</div>
          </div>
        </div>

        <div id="maintEmpty" class="panel" style="display:${entries.length ? "none" : "block"};background:transparent;border-style:dashed;color:rgba(245,245,245,0.7);">
          No maintenance entries yet. Which is either amazing or terrifying.
        </div>

        <div class="maintList" id="maintList"></div>
      </div>
    </section>
  `;

  // Default date to today
  const dateEl = document.getElementById("maintDate");
  dateEl.value = isoToday();

  // Render list
  const list = document.getElementById("maintList");
  list.innerHTML = entries.map(e => {
    const task = escapeHtml(e.task || "");
    const by = escapeHtml(e.by || "");
    const date = escapeHtml(e.date || "");

    return `
      <div class="maintRow">
        <div class="maintMeta">
          <div class="maintTask">${task || "(No task)"}</div>
          <div class="maintSub">${by || "(No person)"} • ${date || "(No date)"}</div>
        </div>
        <div class="maintActions">
          <button class="ghost" data-id="${escapeHtml(e.id || "")}" title="Delete entry">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  // Delete handlers
  list.querySelectorAll("[data-id]").forEach(btn => {
    btn.onclick = () => {
      const id = (btn.getAttribute("data-id") || "").trim();
      if (!id) return;

      if (!confirm("Delete this maintenance entry?")) return;

      const current = loadMaintState();
      current.entries = (current.entries || []).filter(e => e.id !== id);
      saveMaintState(current);
      renderMaintenance();
    };
  });

  // Add entry
  document.getElementById("btnAddMaint").onclick = () => {
    const task = (document.getElementById("maintTask").value || "").trim();
    const by = (document.getElementById("maintBy").value || "").trim();
    const date = (document.getElementById("maintDate").value || "").trim();

    if (!task) { alert("Task is required."); return; }
    if (!by) { alert("Completed by is required."); return; }
    if (!date) { alert("Date is required."); return; }

    const current = loadMaintState();
    current.entries = current.entries || [];
    current.entries.push({ id: makeId(), task, by, date });
    saveMaintState(current);

    renderMaintenance();
  };

  // Reset
  document.getElementById("btnResetMaint").onclick = () => {
    if (!confirm("Reset maintenance log?")) return;
    localStorage.removeItem("maintState");
    renderMaintenance();
  };
}
