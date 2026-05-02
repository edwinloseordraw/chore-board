import { DAYS, PARENTS, KIDS } from './constants.js';

export function pad2(n){ return String(n).padStart(2,"0"); }

export function todayKey(){
  const map = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
  return map[new Date().getDay()];
}

export function prevDayKey(dayKey){
  const idx = DAYS.indexOf(dayKey);
  if (idx === -1) return "domingo";
  return DAYS[(idx - 1 + DAYS.length) % DAYS.length];
}

export function nextDayKey(dayKey){
  const idx = DAYS.indexOf(dayKey);
  if (idx === -1) return "lunes";
  return DAYS[(idx + 1) % DAYS.length];
}

// Returns a Date for the given dayKey in the current week (Monday→Sunday).
export function dateForDayKey(dayKey){
  const idx = DAYS.indexOf(dayKey);
  const now = new Date();
  const dow = now.getDay(); // 0=Sun..6=Sat

  const daysSinceMonday = (dow + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  const monday = new Date(now);
  monday.setHours(0,0,0,0);
  monday.setDate(monday.getDate() - daysSinceMonday);

  const d = new Date(monday);
  d.setDate(monday.getDate() + (idx >= 0 ? idx : 0));
  return d;
}

export function formatMMDDYYYY(d){
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export function isParent(p){ return PARENTS.includes(p); }
export function isKid(p){ return KIDS.includes(p); }

// Small deterministic hash — good enough for shuffling chores
export function hashSeed(str){
  let h = 2166136261;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG
export function seededRandFactory(seed){
  let t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(arr, seed){
  const a = arr.slice();
  const rand = seededRandFactory(seed);
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function escapeHtml(str){
  return (str || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

export function isoToday(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function makeId(){
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function normItemText(t){
  return (t || "").toLowerCase().replace(/\s+/g, " ").trim();
}
