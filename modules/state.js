import { PEOPLE, DAYS } from './constants.js';

export function jget(k, fallback){
  try{ return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); }
  catch{ return fallback; }
}

export function jset(k, v){
  try{
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e){
    console.error("localStorage write failed for", k, e);
  }
}

export function defaultMemberColors(){
  return {
    Dad:  "#4caf50",
    Mom:  "#ffb300",
    Ethan:"#42a5f5",
    Celo: "#ab47bc"
  };
}

export function loadMemberColors(){
  const d = defaultMemberColors();
  const s = jget("memberColors", d);
  PEOPLE.forEach(p => { if (!s[p]) s[p] = d[p] || "#ffffff"; });
  return s;
}

export function saveMemberColors(s){ jset("memberColors", s); }

export function defaultMemberPhotos(){
  const o = {};
  PEOPLE.forEach(p => o[p] = "");
  return o;
}

export function loadMemberPhotos(){
  const d = defaultMemberPhotos();
  const s = jget("memberPhotos", d);
  PEOPLE.forEach(p => { if (typeof s[p] !== "string") s[p] = ""; });
  return s;
}

export function saveMemberPhotos(s){ jset("memberPhotos", s); }

export function loadWeeklyPlanState(){
  return jget("weeklyPlanState", { weekSeed:"", days:{}, meta:{} });
}

export function saveWeeklyPlanState(s){
  if (!s || typeof s !== "object") s = { weekSeed:"", days:{}, meta:{} };
  if (typeof s.weekSeed !== "string") s.weekSeed = "";
  if (!s.days || typeof s.days !== "object") s.days = {};
  if (!s.meta || typeof s.meta !== "object") s.meta = {};
  jset("weeklyPlanState", s);
}

export function clearWeeklyPlanState(){
  localStorage.removeItem("weeklyPlanState");
}

export function loadDailyState(){ return jget("dailyState", {}); }
export function saveDailyState(s){ jset("dailyState", s); }

export function loadWeeklyState(){ return jget("weeklyState", { checks:{}, assign:{} }); }
export function saveWeeklyState(s){ jset("weeklyState", s); }

export function loadBiweeklyState(){ return jget("biweeklyState", { checks:{}, assign:{} }); }
export function saveBiweeklyState(s){ jset("biweeklyState", s); }

export function loadMonthlyState(){ return jget("monthlyState", { checks:{}, assign:{} }); }
export function saveMonthlyState(s){ jset("monthlyState", s); }

export function loadMaintState(){ return jget("maintState", { entries:[] }); }
export function saveMaintState(s){ jset("maintState", s); }

export function loadDashState(){
  const s = jget("dashState", {
    dashboardNotes: "",
    viewerDay: "",
    viewerReadOnly: false,
    ringFilters: {
      daily: "All",
      weekly: "All",
      biweekly: "All",
      monthly: "All"
    }
  });

  // Migration from older dashState.notesByDay (Phase 7) if present
  if (s && typeof s === "object" && s.notesByDay && typeof s.notesByDay === "object"){
    const lines = [];
    const order = DAYS;
    order.forEach(k => {
      const v = (typeof s.notesByDay[k] === "string") ? s.notesByDay[k].trim() : "";
      if (v) lines.push(`${k}: ${v}`);
    });
    if (!s.dashboardNotes && lines.length){
      s.dashboardNotes = lines.join("\n\n");
    }
    delete s.notesByDay;
  }

  if (!s || typeof s !== "object"){
    return { dashboardNotes: "", viewerDay: "", viewerReadOnly: false, ringFilters: { daily:"All", weekly:"All", biweekly:"All", monthly:"All" } };
  }

  if (typeof s.dashboardNotes !== "string") s.dashboardNotes = "";
  if (typeof s.viewerDay !== "string") s.viewerDay = "";
  if (typeof s.viewerReadOnly !== "boolean") s.viewerReadOnly = false;

  if (!s.ringFilters || typeof s.ringFilters !== "object"){
    s.ringFilters = { daily:"All", weekly:"All", biweekly:"All", monthly:"All" };
  }
  ["daily","weekly","biweekly","monthly"].forEach(k => {
    if (!s.ringFilters[k] || typeof s.ringFilters[k] !== "string") s.ringFilters[k] = "All";
    const v = s.ringFilters[k];
    if (v !== "All" && !PEOPLE.includes(v)) s.ringFilters[k] = "All";
  });

  return s;
}

export function saveDashState(s){ jset("dashState", s); }

export function loadGroceriesState(){
  return jget("groceriesState", { items: [] });
}
export function saveGroceriesState(s){ jset("groceriesState", s); }

export function resetDailyAndWeeklyChoreState(){
  const daily = loadDailyState() || {};
  Object.keys(daily).forEach(dayKey => {
    daily[dayKey] = daily[dayKey] || {};
    daily[dayKey].checks = {};
  });
  saveDailyState(daily);

  const weekly = loadWeeklyState() || { checks:{}, assign:{} };
  weekly.checks = {};
  weekly.assign = {};
  saveWeeklyState(weekly);
}

export function buildBackupPayload(){
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      dailyState:     loadDailyState(),
      weeklyState:    loadWeeklyState(),
      biweeklyState:  loadBiweeklyState(),
      monthlyState:   loadMonthlyState(),
      maintState:     loadMaintState(),
      dashState:      loadDashState(),
      groceriesState: loadGroceriesState(),
      memberColors:   loadMemberColors(),
      memberPhotos:   loadMemberPhotos(),
      themeState:     jget("themeState", {}),
      weeklyPlanState: loadWeeklyPlanState()
    }
  };
}

export function downloadBackupFile(payload){
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const filename = `chore-board-backup-${yyyy}${mm}${dd}-${hh}${mi}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function restoreBackupPayload(payload){
  if (!payload || typeof payload !== "object") {
    throw new Error("Backup file is not a valid object.");
  }
  if (!payload.data || typeof payload.data !== "object") {
    throw new Error("Backup file is missing data.");
  }

  const data = payload.data;
  const allowedKeys = [
    "dailyState","weeklyState","biweeklyState","monthlyState",
    "maintState","dashState","groceriesState","memberColors",
    "memberPhotos","themeState","weeklyPlanState"
  ];

  allowedKeys.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      localStorage.setItem(key, JSON.stringify(data[key]));
    }
  });
}
