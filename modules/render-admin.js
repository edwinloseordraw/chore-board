import { PEOPLE, DAYS, WEEKLY_TARGETS } from './constants.js';
import { escapeHtml } from './utils.js';
import {
  loadMemberColors, saveMemberColors, defaultMemberColors,
  loadMemberPhotos, saveMemberPhotos,
  loadDailyState, saveDailyState,
  loadWeeklyPlanState, saveWeeklyPlanState,
  buildBackupPayload, downloadBackupFile, restoreBackupPayload
} from './state.js';
import {
  buildCurrentWeekAudit, buildSuggestedAdjustments,
  buildCurrentWeekRepetitionAudit, slugLabel,
  generateBalancedWeeklyPlan, buildPlanSummary, weekSeedString
} from './planner.js';
import { THEMES, THEME_MEMBER_COLORS, loadThemeState } from './theme.js';

/* =========================
   REBUILD WEEK PREVIEW MODAL
========================= */

export function showRebuildPreviewModal(summary, newPlan){
  const old = document.getElementById("rebuildPreviewOverlay");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "rebuildPreviewOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.65)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "16px";

  const modal = document.createElement("div");
  modal.style.width = "min(980px, 95vw)";
  modal.style.maxHeight = "90vh";
  modal.style.overflow = "auto";
  modal.style.background = "var(--panel, #111)";
  modal.style.border = "1px solid rgba(255,255,255,0.12)";
  modal.style.borderRadius = "14px";
  modal.style.padding = "16px";

  const header = document.createElement("div");
  header.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
    <div>
      <div style="font-size:18px;font-weight:700;">Rebuild Week Preview</div>
      <div style="opacity:.8;margin-top:4px;">Preview the changes before applying. This affects DAILY chores only.</div>
    </div>
    <div style="text-align:right;opacity:.8;font-size:12px;">Week: ${escapeHtml(newPlan.weekSeed || "")}</div>
  </div>`;
  modal.appendChild(header);

  const sum = document.createElement("div");
  sum.style.marginTop = "14px";
  sum.style.padding = "12px";
  sum.style.border = "1px solid rgba(255,255,255,0.10)";
  sum.style.borderRadius = "12px";

  const rows = Object.keys(WEEKLY_TARGETS).map(p => {
    const t = WEEKLY_TARGETS[p];
    const v = summary.totals[p] || 0;
    const ok = summary.inRange[p];
    return `<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;">
      <div style="font-weight:600;">${p}</div>
      <div>${v} pts <span style="opacity:.75;">(target ${t.min}-${t.max})</span> ${ok ? "✅" : "⚠️"}</div>
    </div>`;
  }).join("");

  sum.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">Summary</div>
    ${rows}
    <div style="margin-top:8px;opacity:.85;">Chores changed: <strong>${summary.changed}</strong></div>`;
  modal.appendChild(sum);

  const preview = document.createElement("div");
  preview.style.marginTop = "14px";
  preview.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">Full Week Preview</div>`;

  const daysWrap = document.createElement("div");
  daysWrap.style.display = "grid";
  daysWrap.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
  daysWrap.style.gap = "10px";

  DAYS.forEach(dayKey => {
    const card = document.createElement("div");
    card.style.padding = "10px";
    card.style.border = "1px solid rgba(255,255,255,0.10)";
    card.style.borderRadius = "12px";
    const list = (newPlan.days && newPlan.days[dayKey]) ? newPlan.days[dayKey] : [];
    const items = list.map(t => {
      const id = String((t && t.id) || "");
      const slug = id.includes("::") ? id.split("::")[1] : "";
      const who = String((t && t.primary) || "");
      const label = (t && t.text) ? t.text : (slug || "");
      return `<div style="display:flex;justify-content:space-between;gap:10px;padding:2px 0;">
        <div style="opacity:.9;">${escapeHtml(label)}</div>
        <div style="font-weight:600;">${escapeHtml(who)}</div>
      </div>`;
    }).join("");
    card.innerHTML = `<div style="font-weight:700;margin-bottom:6px;">${escapeHtml(dayKey.toUpperCase())}</div>${items || "<div style='opacity:.7;'>No chores</div>"}`;
    daysWrap.appendChild(card);
  });

  preview.appendChild(daysWrap);
  modal.appendChild(preview);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "10px";
  actions.style.marginTop = "16px";

  const btnCancel = document.createElement("button");
  btnCancel.className = "ghostBtn";
  btnCancel.type = "button";
  btnCancel.textContent = "Cancel";
  btnCancel.onclick = () => overlay.remove();

  const btnApply = document.createElement("button");
  btnApply.className = "danger";
  btnApply.type = "button";
  btnApply.textContent = "Apply";
  btnApply.onclick = () => {
    if (!confirm("Apply this rebuilt week plan? This will replace the current week's DAILY chore assignments.")) return;
    saveWeeklyPlanState(newPlan);
    overlay.remove();
    window.__renderApp();
  };

  actions.appendChild(btnCancel);
  actions.appendChild(btnApply);
  modal.appendChild(actions);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/* =========================
   ADMIN RENDER
========================= */

export function renderAdmin(){
  const app = document.getElementById("app");
  const colors = loadMemberColors();

  app.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <div class="left">
          <h2 style="margin:0;">Admin</h2>
          <div class="hint" style="margin:0;">Pick a theme + mode for the whole app, then (optionally) set member colors.</div>
        </div>
        <div class="right">
          <input id="importBackupFile" type="file" accept="application/json,.json" style="display:none;" />
          <button class="ghostBtn" id="btnImportBackup" type="button">Import Backup</button>
          <button class="ghostBtn" id="btnExportBackup" type="button">Export Backup</button>
          <button class="danger" id="btnRebalanceWeek">Rebalance Week</button>
          <button class="danger" id="btnResetColors">Reset Colors</button>
        </div>
      </div>
<div style="height:10px;"></div>

      <div class="adminGrid" id="adminGrid"></div>

      <div class="hint" style="margin-top:10px;">Tip: Think of member colors as each person's "signature" in the rings.</div>

      <div style="height:10px;"></div>

      <h3 style="margin:0;">Weekly Balance Audit</h3>
      <div class="hint" style="margin-top:4px;">Shows the current fixed weekly cadence load compared with each target range.</div>
      <div class="panel" style="margin-top:10px; padding:12px;" id="weeklyAuditBox"></div>

      <h3 style="margin:0;">Weekly Repetition Audit</h3>
      <div class="hint" style="margin-top:4px;">Flags chores or pairings that repeat too heavily across the week.</div>
      <div class="panel" style="margin-top:10px; padding:12px;" id="weeklyRepetitionBox"></div>

      <div style="height:14px;"></div>

      <h3 style="margin:0;">Suggested Adjustments</h3>
      <div class="hint" style="margin-top:4px;">Suggested solo-chore moves based on current load deltas. These do not apply automatically.</div>
      <div class="panel" style="margin-top:10px; padding:12px;" id="suggestedAdjustmentsBox"></div>

      <div style="height:14px;"></div>

      <h3 style="margin:0;">Daily Notes (pre-write for the week)</h3>
      <div class="hint" style="margin-top:4px;">Enter notes ahead of time. These are the same day notes you can still edit on the Dashboard when that day arrives.</div>
      <div class="adminNotesGrid" id="adminNotesGrid"></div>
    </section>
  `;

  const grid = document.getElementById("adminGrid");
  if (!grid) {
    console.error("Admin render failed: #adminGrid not found");
    return;
  }
  grid.innerHTML = "";

  const safeThemeState = (typeof loadThemeState === "function")
    ? (loadThemeState() || { themeId: "paperClean", mode: "dark" })
    : { themeId: "paperClean", mode: "dark" };

  const themePresets = (typeof THEME_MEMBER_COLORS !== "undefined" && THEME_MEMBER_COLORS)
    ? THEME_MEMBER_COLORS
    : null;

  const colorsLocked = false;

  PEOPLE.forEach(person => {
    const row = document.createElement("div");
    row.className = "adminRow";

    const left = document.createElement("div");
    left.className = "adminName";

    const dot = document.createElement("div");
    dot.style.width = "14px";
    dot.style.height = "14px";
    dot.style.borderRadius = "999px";
    dot.style.background = colors[person];
    dot.style.border = "1px solid rgba(255,255,255,0.25)";

    const name = document.createElement("div");
    name.textContent = person;

    left.appendChild(dot);
    left.appendChild(name);

    const picker = document.createElement("input");
    picker.type = "color";
    picker.className = "colorInput";
    picker.value = (colors && colors[person]) ? colors[person] : "#ffffff";
    picker.disabled = colorsLocked;
    picker.title = colorsLocked ? "Locked by theme" : "Edit member color";
    picker.style.opacity = colorsLocked ? "0.55" : "1";
    picker.style.pointerEvents = colorsLocked ? "none" : "auto";
    picker.oninput = () => {
      if (colorsLocked) return;
      const c = loadMemberColors();
      c[person] = picker.value;
      saveMemberColors(c);
      dot.style.background = picker.value;
    };

    row.appendChild(left);
    row.appendChild(picker);
    grid.appendChild(row);
  });

  // Weekly Balance Audit
  const auditBox = document.getElementById("weeklyAuditBox");
  if (auditBox) {
    try {
      const audit = buildCurrentWeekAudit();
      const rowsHtml = audit.rows.map(r => {
        const status = r.inRange ? "✅ In range" : "⚠️ Out of range";
        const deltaPrefix = r.delta > 0 ? "+" : "";
        return `
          <div style="display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="font-weight:700;">${escapeHtml(r.person)}</div>
            <div style="text-align:right;">
              <div>${r.load} pts <span style="opacity:.75;">(target ${r.target.min}-${r.target.max})</span></div>
              <div style="font-size:12px; opacity:.82;">${status} · delta vs midpoint ${deltaPrefix}${r.delta}</div>
            </div>
          </div>
        `;
      }).join("");

      auditBox.innerHTML = `
        <div style="font-weight:700; margin-bottom:8px;">Current week</div>
        <div style="font-size:12px; opacity:.82; margin-bottom:8px;">Week seed: ${escapeHtml(audit.plan.weekSeed || "")}</div>
        ${rowsHtml}
        <div style="margin-top:10px; font-weight:700;">${audit.allInRange ? "✅ Weekly cadence is inside all target ranges" : "⚠️ Weekly cadence needs tuning"}</div>
      `;
    } catch (e) {
      console.error("Weekly audit render failed:", e);
      auditBox.innerHTML = `<div style="opacity:.85;">Unable to compute weekly audit.</div>`;
    }
  }

  // Suggested Adjustments
  const suggestionsBox = document.getElementById("suggestedAdjustmentsBox");
  if (suggestionsBox) {
    try {
      const result = buildSuggestedAdjustments();
      if (!result.suggestions.length) {
        suggestionsBox.innerHTML = `<div style="padding:6px 0;">✅ No obvious solo-chore adjustment suggestions right now.</div>`;
      } else {
        suggestionsBox.innerHTML = result.suggestions.map(item => `
          <div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
            Move <strong>${escapeHtml(item.text)}</strong> on <strong>${escapeHtml(item.dayKey)}</strong>
            from <strong>${escapeHtml(item.from)}</strong> to <strong>${escapeHtml(item.to)}</strong>
            <div style="font-size:12px; opacity:.8; margin-top:4px;">
              ${escapeHtml(item.from)} delta ${item.fromDelta > 0 ? "+" : ""}${item.fromDelta} ·
              ${escapeHtml(item.to)} delta ${item.toDelta > 0 ? "+" : ""}${item.toDelta}
            </div>
          </div>
        `).join("");
      }
    } catch (e) {
      console.error("Suggested adjustments render failed:", e);
      suggestionsBox.innerHTML = `<div style="opacity:.85;">Unable to compute suggested adjustments.</div>`;
    }
  }

  // Repetition Audit
  const repetitionBox = document.getElementById("weeklyRepetitionBox");
  if (repetitionBox) {
    try {
      const rep = buildCurrentWeekRepetitionAudit();

      const streakHtml = rep.streakFindings.length
        ? rep.streakFindings.map(item => `
            <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
              <strong>${escapeHtml(item.person)}</strong> has <strong>${escapeHtml(slugLabel(item.slug))}</strong>
              ${item.total} times this week, including a longest streak of ${item.maxRun} days.
            </div>
          `).join("")
        : `<div style="padding:6px 0;">✅ No 3+ day chore streaks detected.</div>`;

      const pairHtml = rep.repeatedPairs.length
        ? rep.repeatedPairs.map(item => {
            const parts = item.key.split("::");
            const slug = parts[0] || "";
            const pair = parts[1] || "";
            return `
              <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                Pair chore <strong>${escapeHtml(slugLabel(slug))}</strong> repeats with <strong>${escapeHtml(pair.replace(/\+/g, " + "))}</strong>
                ${item.count} times this week.
              </div>
            `;
          }).join("")
        : `<div style="padding:6px 0;">✅ No pair chores repeat 3+ times with the same pair.</div>`;

      repetitionBox.innerHTML = `
        <div style="font-weight:700; margin-bottom:8px;">Current week repetition check</div>
        <div style="font-size:12px; opacity:.82; margin-bottom:10px;">Week seed: ${escapeHtml(rep.plan.weekSeed || "")}</div>
        <div style="font-weight:700; margin-bottom:6px;">Chore streaks</div>
        ${streakHtml}
        <div style="height:10px;"></div>
        <div style="font-weight:700; margin-bottom:6px;">Pair repetition</div>
        ${pairHtml}
        <div style="margin-top:10px; font-weight:700;">${rep.hasIssues ? "⚠️ Repetition tuning recommended" : "✅ Repetition looks healthy"}</div>
      `;
    } catch (e) {
      console.error("Weekly repetition audit render failed:", e);
      repetitionBox.innerHTML = `<div style="opacity:.85;">Unable to compute repetition audit.</div>`;
    }
  }

  // Member avatar uploads
  const photos = loadMemberPhotos();

  const avatarTitle = document.createElement("h3");
  avatarTitle.style.margin = "14px 0 0 0";
  avatarTitle.textContent = "Member Avatars";
  app.querySelector(".panel").appendChild(avatarTitle);

  const avatarHint = document.createElement("div");
  avatarHint.className = "hint";
  avatarHint.style.marginTop = "4px";
  avatarHint.textContent = "Upload a photo for each member. Stored on this device (localStorage).";
  app.querySelector(".panel").appendChild(avatarHint);

  PEOPLE.forEach(person => {
    const row = document.createElement("div");
    row.className = "adminAvatarRow";

    const left = document.createElement("div");
    left.className = "adminAvatarLeft";

    const name = document.createElement("div");
    name.className = "adminAvatarName";
    name.textContent = person;

    const previewWrap = document.createElement("div");
    const url = (photos && typeof photos[person] === "string") ? photos[person] : "";

    if (url){
      previewWrap.className = "avatarCircle";
      const img = document.createElement("img");
      img.alt = `${person} avatar`;
      img.src = url;
      previewWrap.appendChild(img);
    } else {
      previewWrap.className = "avatarFallback";
      previewWrap.textContent = (person || "").slice(0,2).toUpperCase();
    }

    left.appendChild(previewWrap);
    left.appendChild(name);

    const right = document.createElement("div");
    right.className = "adminAvatarRight";

    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.className = "fileInput";

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "ghostBtn";
    clear.textContent = "Clear";

    file.onchange = () => {
      const f = file.files && file.files[0];
      if (!f) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const size = 160;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");

          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          const cur = loadMemberPhotos();
          cur[person] = dataUrl;
          saveMemberPhotos(cur);
          renderAdmin();
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(f);
    };

    clear.onclick = () => {
      const cur = loadMemberPhotos();
      cur[person] = "";
      saveMemberPhotos(cur);
      renderAdmin();
    };

    right.appendChild(file);
    right.appendChild(clear);

    row.appendChild(left);
    row.appendChild(right);

    app.querySelector(".panel").appendChild(row);
  });

  // Pre-write day notes for the week
  const notesGrid = document.getElementById("adminNotesGrid");
  if (notesGrid){
    notesGrid.innerHTML = "";

    const ds = loadDailyState();

    DAYS.forEach(dayKey => {
      ds[dayKey] = ds[dayKey] || { checks:{}, notes:"" };

      const card = document.createElement("div");
      card.className = "adminNoteCard";

      const title = document.createElement("div");
      title.className = "adminNoteTitle";
      title.textContent = `Notas para ${dayKey}...`;

      const ta = document.createElement("textarea");
      ta.placeholder = `Notas para ${dayKey}...`;
      ta.value = (typeof ds[dayKey].notes === "string") ? ds[dayKey].notes : "";

      ta.oninput = () => {
        const cur = loadDailyState();
        cur[dayKey] = cur[dayKey] || { checks:{}, notes:"" };
        cur[dayKey].notes = ta.value;
        saveDailyState(cur);
      };

      card.appendChild(title);
      card.appendChild(ta);
      notesGrid.appendChild(card);
    });

    saveDailyState(ds);
  }

  // Import backup
  const importInput = document.getElementById("importBackupFile");
  const importBtn = document.getElementById("btnImportBackup");
  if (importBtn && importInput){
    importBtn.onclick = () => {
      importInput.value = "";
      importInput.click();
    };

    importInput.onchange = async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      if (!confirm("Import this backup and replace current local app state?")) return;

      try{
        const text = await file.text();
        const payload = JSON.parse(text);
        restoreBackupPayload(payload);
        alert("Backup imported successfully. The app will now reload.");
        location.reload();
      } catch (e){
        console.error("Import backup failed:", e);
        alert("Import backup failed. Check console for details.");
      }
    };
  }

  // Export backup
  const exportBtn = document.getElementById("btnExportBackup");
  if (exportBtn){
    exportBtn.onclick = () => {
      try{
        const payload = buildBackupPayload();
        downloadBackupFile(payload);
      } catch (e){
        console.error("Export backup failed:", e);
        alert("Export backup failed. Check console for details.");
      }
    };
  }

  // Rebalance Week
  const rebBtn = document.getElementById("btnRebalanceWeek");
  if (rebBtn){
    rebBtn.onclick = () => {
      try{
        const curSeed = weekSeedString();
        const oldPlan = loadWeeklyPlanState();
        const newPlan = generateBalancedWeeklyPlan(curSeed, Date.now());

        const summary = buildPlanSummary(oldPlan, newPlan);
        showRebuildPreviewModal(summary, newPlan);
      } catch (e){
        console.error("Rebalance Week preview failed:", e);
        alert("Rebalance failed. Check console for details.");
      }
    };
  }

  // Reset colors
  document.getElementById("btnResetColors").onclick = () => {
    if (!confirm("Reset member colors to defaults?")) return;
    saveMemberColors(defaultMemberColors());
    renderAdmin();
  };
}
