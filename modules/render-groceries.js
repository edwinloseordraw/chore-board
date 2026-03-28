import { escapeHtml, makeId, normItemText } from './utils.js';
import { loadGroceriesState, saveGroceriesState } from './state.js';

export function renderGroceriesPanel(){
  const listEl = document.getElementById("groceryList");
  const inputEl = document.getElementById("groceryText");
  const addBtn = document.getElementById("groceryAdd");
  const resetBtn = document.getElementById("groceryReset");

  // Panel may not exist yet (only created by renderTopNav)
  if (!listEl || !inputEl || !addBtn || !resetBtn) return;

  const state = loadGroceriesState();
  state.items = Array.isArray(state.items) ? state.items : [];

  function redraw(){
    const s = loadGroceriesState();
    const items = Array.isArray(s.items) ? s.items : [];

    if (!items.length){
      listEl.innerHTML = `<div class="hint" style="margin-top:6px;">List is empty. For once, everyone is innocent.</div>`;
      return;
    }

    listEl.innerHTML = items.map(it => {
      const txt = escapeHtml(it.text || "");
      const qty = Number(it.qty || 1);
      const qtyChip = (qty > 1) ? `<span class="groceryQty">x${qty}</span>` : "";
      return `
        <div class="groceryRow">
          <div class="groceryMeta">
            <div class="groceryItem">${txt}</div>
            <div class="grocerySub">
              ${qtyChip}
            </div>
          </div>
          <button class="remove" type="button" data-gid="${escapeHtml(it.id || "")}" aria-label="Remove">✕</button>
        </div>
      `;
    }).join("");

    listEl.querySelectorAll("[data-gid]").forEach(btn => {
      btn.onclick = () => {
        const id = (btn.getAttribute("data-gid") || "").trim();
        if (!id) return;
        const cur = loadGroceriesState();
        cur.items = (cur.items || []).filter(x => x.id !== id);
        saveGroceriesState(cur);
        redraw();
      };
    });
  }

  function addItem(){
    const text = (inputEl.value || "").trim();
    if (!text) return;

    const cur = loadGroceriesState();
    cur.items = Array.isArray(cur.items) ? cur.items : [];

    const n = normItemText(text);
    const existingIdx = cur.items.findIndex(x => normItemText(x.text) === n);

    if (existingIdx >= 0){
      const existing = cur.items[existingIdx];
      existing.qty = Number(existing.qty || 1) + 1;
      cur.items.splice(existingIdx, 1);
      cur.items.unshift(existing);
    } else {
      cur.items.unshift({ id: makeId(), text, qty: 1, createdAt: Date.now() });
    }

    saveGroceriesState(cur);
    inputEl.value = "";
    redraw();
  }

  // Wire once (idempotent)
  addBtn.onclick = addItem;
  inputEl.onkeydown = (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      addItem();
    }
  };

  resetBtn.onclick = () => {
    if (!confirm("Reset groceries list?")) return;
    localStorage.removeItem("groceriesState");
    redraw();
  };

  saveGroceriesState(state);
  redraw();
}
