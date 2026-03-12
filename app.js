console.log("[ChoreBoard] app.js loaded");
window.__CHOREBOARD_LOADED__ = true;
window.__firebaseSyncSchedulePush = function(){ /* local-only */ };
/* LOCAL-ONLY BUILD
   - Firebase/Firestore removed
   - State stored locally (localStorage / existing photo storage)
*/

/* =========================
   THEME SYSTEM (Admin)
   - 5 preconfigured themes
   - each theme has Dark + Light mode
   - applies across the entire app via CSS variables
========================= */

// Theme state is persisted locally.
// NOTE: This file must only declare loadThemeState/saveThemeState ONCE.  

/* ---- Theme Safety Fallback ----
   Prevents crashes if the theme system fails to load before Admin renders.
   If real theme definitions load later, they will override this stub.
--------------------------------- */
if (typeof THEMES === "undefined") {
  var THEMES = {
    paperClean: {
      id: "paperClean",
      name: "Paper Clean",
      dark: {},
      light: {}
    }
  };
}

if (typeof loadThemeState !== "function") {
  function loadThemeState(){
    try {
      const s = JSON.parse(localStorage.getItem("themeState") || "{}");
      return {
        themeId: s.themeId || "paperClean",
        mode: s.mode || "dark"
      };
    } catch(e){
      return { themeId: "paperClean", mode: "dark" };
    }
  }
}

if (typeof saveThemeState !== "function") {
  function saveThemeState(s){
    try {
      localStorage.setItem("themeState", JSON.stringify(s || { themeId:"paperClean", mode:"dark" }));
    } catch(e){
      console.warn("Theme state save failed", e);
    }
  }
}
/* =========================
   ROUTES + CONSTANTS
========================= */

const DAYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
const PEOPLE = ["Dad","Mom","Ethan","Celo"];

function todayKey(){
  const map = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
  return map[new Date().getDay()];
}

function prevDayKey(dayKey){
  const idx = DAYS.indexOf(dayKey);
  if (idx === -1) return "domingo";
  return DAYS[(idx - 1 + DAYS.length) % DAYS.length];
}

function nextDayKey(dayKey){
  const idx = DAYS.indexOf(dayKey);
  if (idx === -1) return "lunes";
  return DAYS[(idx + 1) % DAYS.length];
}

function pad2(n){ return String(n).padStart(2,"0"); }

// Returns a Date for the given dayKey in the CURRENT week (Monday->Sunday).
// Week is anchored to the user's local time.
function dateForDayKey(dayKey){
  const idx = DAYS.indexOf(dayKey);
  const now = new Date();
  const dow = now.getDay(); // 0=Sun..6=Sat

  // Start of week = Monday
  const daysSinceMonday = (dow + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  const monday = new Date(now);
  monday.setHours(0,0,0,0);
  monday.setDate(monday.getDate() - daysSinceMonday);

  const d = new Date(monday);
  d.setDate(monday.getDate() + (idx >= 0 ? idx : 0));
  return d;
}

function formatMMDDYYYY(d){
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

/* =========================
   DATA (still placeholders)
   - We'll replace DAILY_CHORES & WEEKLY_CHORES with your real lists later.
   - Bi-weekly/monthly/maintenance lists stay mostly empty until Phase 5-7.
========================= */

// Daily chores are scheduled per day (lunes → domingo).
// Tasks are shared objects so 2-person chores have ONE completion state.
// `primary` is who is accountable (used for Verification mapping).
function makeTask(dayKey, slug, text, assignees, primary){
  return {
    id: `${dayKey}::${slug}`,
    text,
    assignees,      // array of PEOPLE involved (shows in both columns)
    primary         // accountable person (used for Verification)
  };
}

// Instead of hard-coding who does what every day, we build a weekly-rotating roster.
// Goals:
//  - Everyone gets variety across the week.
//  - 2-person chores pick ANY 2 members (no fixed pairing groups).
//  - Rotation is deterministic per-week (stable), so it doesn't reshuffle every refresh.

// Core daily chores (rotate fairly)
const ROTATING_PAIR_CHORES = [
  { slug: "vacuum",   text: "Vacuum" },
  { slug: "dishes",   text: "Wash dishes" },
  { slug: "trash",    text: "Take out trash" },
  { slug: "feedDogs", text: "Feed dogs" }
];

// Solo chores. These rotate across ALL people unless restricted.
// If you want to add/remove chores later, do it here.
const ROTATING_SOLO_CHORES = [
  { slug: "counters",    text: "Wipe kitchen counters",   when: "all" },
  { slug: "dining",      text: "Wipe dining table",       when: "all" },
  { slug: "mop",         text: "Mop",                     when: "all" },
  { slug: "dust",        text: "Dust",                    when: "all" },
  { slug: "cabinets",    text: "Wipe down cabinets",      when: "all" },
  { slug: "dogPoop",     text: "Dog poop",                when: "all" }
];

// Chores that should stay with a specific person (personal reminders)
const FIXED_SOLO_CHORES = [
  // Celo-only weekday reminders (Mon–Fri)
  { slug: "prepBackpack", text: "Reminder: Prep backpack for tomorrow", person: "Celo", when: "weekdays" },
  { slug: "appleWatch",   text: "Reminder: Where's your Apple Watch?",  person: "Celo", when: "weekdays" },
  { slug: "read20", text: "Read for 20 min", person: "Celo", when: "monfri" },

  { slug: "brushHarvey", text: "Brush Harvey", person: "Dad", when: "monwed" },
  { slug: "brushHarvey", text: "Brush Harvey", person: "Ethan", when: "fri" },

  { slug: "checkAgenda", text: "Reminder: Check and sign Celo's agenda and folders", person: "Dad", when: "weekdays" }
];

// Fixed weekly cadence for DAILY chores.
// This is intentionally stable week-to-week:
// - balanced against the current weight system
// - true two-person assignments for pair chores
// - avoids 3+ day repetition patterns
const FIXED_WEEKLY_CADENCE = {
  lunes: {
    pair: {
      vacuum:   ["Ethan", "Celo"],
      dishes:   ["Dad", "Mom"],
      trash:    ["Dad", "Ethan"],
      feedDogs: ["Mom", "Celo"]
    },
    solo: {
      counters: "Dad",
      dining:   "Mom",
      mop:      "Mom",
      dust:     "Ethan",
      cabinets: "Ethan",
      dogPoop:  "Ethan"
    },
    walk: "Mom",
    fynnTreat: "Dad"
  },
  martes: {
    pair: {
      vacuum:   ["Dad", "Mom"],
      dishes:   ["Ethan", "Celo"],
      trash:    ["Dad", "Celo"],
      feedDogs: ["Mom", "Ethan"]
    },
    solo: {
      counters: "Dad",
      dining:   "Ethan",
      mop:      "Mom",
      dust:     "Dad",
      cabinets: "Mom",
      dogPoop:  "Celo"
    },
    walk: "Dad",
    fynnTreat: "Ethan"
  },
  miercoles: {
    pair: {
      vacuum:   ["Dad", "Ethan"],
      dishes:   ["Mom", "Celo"],
      trash:    ["Dad", "Mom"],
      feedDogs: ["Ethan", "Celo"]
    },
    solo: {
      counters: "Mom",
      dining:   "Ethan",
      mop:      "Mom",
      dust:     "Ethan",
      cabinets: "Dad",
      dogPoop:  "Ethan"
    },
    walk: "Mom",
    fynnTreat: "Dad"
  },
  jueves: {
    pair: {
      vacuum:   ["Mom", "Celo"],
      dishes:   ["Dad", "Ethan"],
      trash:    ["Mom", "Ethan"],
      feedDogs: ["Dad", "Celo"]
    },
    solo: {
      counters: "Ethan",
      dining:   "Dad",
      mop:      "Mom",
      dust:     "Mom",
      cabinets: "Ethan",
      dogPoop:  "Dad"
    },
    walk: "Dad",
    fynnTreat: "Celo"
  },
  viernes: {
    pair: {
      vacuum:   ["Dad", "Mom"],
      dishes:   ["Dad", "Ethan"],
      trash:    ["Mom", "Celo"],
      feedDogs: ["Mom", "Ethan"]
    },
    solo: {
      counters: "Mom",
      dining:   "Celo",
      mop:      "Dad",
      dust:     "Celo",
      cabinets: "Dad",
      dogPoop:  "Dad"
    },
    walk: "Mom",
    fynnTreat: "Ethan"
  },
  sabado: {
    pair: {
      vacuum:   ["Mom", "Ethan"],
      dishes:   ["Dad", "Celo"],
      trash:    ["Dad", "Mom"],
      feedDogs: ["Ethan", "Celo"]
    },
    solo: {
      counters: "Ethan",
      dining:   "Mom",
      mop:      "Celo",
      dust:     "Mom",
      cabinets: "Celo",
      dogPoop:  "Dad"
    },
    walk: "Dad",
    fynnTreat: "Ethan"
  },
  domingo: {
    pair: {
      vacuum:   ["Dad", "Mom"],
      dishes:   ["Ethan", "Celo"],
      trash:    ["Dad", "Ethan"],
      feedDogs: ["Mom", "Celo"]
    },
    solo: {
      counters: "Dad",
      dining:   "Mom",
      mop:      "Ethan",
      dust:     "Celo",
      cabinets: "Ethan",
      dogPoop:  "Dad"
    },
    walk: "Mom",
    fynnTreat: "Ethan"
  }
};

function isWeekday(dayKey){
  return dayKey !== "sabado" && dayKey !== "domingo";
}

// Deterministic per-week seed (Monday of the current week) so it stays stable.

function weekSeedString(){
  const monday = dateForDayKey("lunes");
  // YYYY-MM-DD
  const y = monday.getFullYear();
  const m = pad2(monday.getMonth() + 1);
  const d = pad2(monday.getDate());
  return `${y}-${m}-${d}`;
}

// =========================
// Proper Weekly Balancer (Chunk 2)
// - Generates a full weekly plan (Mon-anchored) with weighted workload targets
// - Respects member-exclusive chores (untouchable)
// - Deterministic per week via weekSeed
// =========================

const WEEKLY_TARGETS = {
  Dad:   { min:20, max:24 },
  Mom:   { min:18, max:22 },
  Ethan: { min:14, max:18 },
  Celo:  { min: 8, max:12 }
};

function targetMid(person){
  const t = WEEKLY_TARGETS[person];
  if (!t) return 0;
  return (t.min + t.max) / 2;
}

// Rebased weights so the FULL WEEK lands near the target system.
// Approximate weekly total with fixed chores included: ~67 points.
// This matches the combined target range far better than the old 180+ scale.
function defaultChoreWeights(){
  return {
    vacuum: 1.25,
    dishes: 1.25,
    trash: 0.75,
    feedDogs: 0.75,

    counters: 0.5,
    dining: 0.5,
    mop: 1.0,
    dust: 0.75,
    cabinets: 0.5,
    dogPoop: 0.75,

    walk: 0.75,
    fynnTreat: 0.25,

    // member-exclusive fixed chores
    read20: 0.5,
    brushHarvey: 0.5,

    // reminders (do not count)
    prepBackpack: 0,
    appleWatch: 0
  };
}

function isExclusiveFixedChoreSlug(slug){
  return slug === "prepBackpack" || slug === "appleWatch" || slug === "read20" || slug === "brushHarvey";
}

function isReminderSlug(slug){
  return slug === "prepBackpack" || slug === "appleWatch";
}

function shouldIncludeFixedChoreOnDay(fixed, dayKey){
  if (!fixed || !fixed.when) return false;

  if (fixed.when === "weekdays"){
    // School nights: Sunday through Thursday
    return (dayKey === "domingo" || dayKey === "lunes" || dayKey === "martes" || dayKey === "miercoles" || dayKey === "jueves");
  }
  if (fixed.when === "monwed") return (dayKey === "lunes" || dayKey === "miercoles");
  if (fixed.when === "fri") return (dayKey === "viernes");
  if (fixed.when === "monfri") return (dayKey === "lunes" || dayKey === "martes" || dayKey === "miercoles" || dayKey === "jueves" || dayKey === "viernes");

  return false;
}

function initLoads(){
  const loads = {};
  PEOPLE.forEach(p => loads[p] = 0);
  return loads;
}

function initDayLoads(){
  const loads = {};
  PEOPLE.forEach(p => loads[p] = 0);
  return loads;
}

function addLoad(loads, person, amount){
  if (!loads || loads[person] === undefined) return;
  loads[person] += Number(amount) || 0;
}

function scoreAfterAssign(loads, dayLoads, person, add){
  const t = WEEKLY_TARGETS[person];
  if (!t) return 1e9;

  const weight = Number(add) || 0;
  const nextWeek = (loads[person] || 0) + weight;
  const nextDay = (dayLoads[person] || 0) + weight;

  const weeklyMid = targetMid(person);
  const dailyMid = weeklyMid / 7;

  const overMax = Math.max(0, nextWeek - t.max);
  const weekDist = Math.abs(nextWeek - weeklyMid);

  // Soft daily cap helps prevent one person from getting stacked on the same day.
  const dailySoftCap = dailyMid + 0.75;
  const dailyOver = Math.max(0, nextDay - dailySoftCap);
  const dailyDist = Math.abs(nextDay - dailyMid);

  // Reward people who are still below their target midpoint.
  const remainingCapacity = Math.max(0, weeklyMid - nextWeek);

  return (
    (overMax * 100) +
    (dailyOver * 30) +
    (weekDist * 5) +
    (dailyDist * 4) +
    (nextDay * 2) -
    (remainingCapacity * 2)
  );
}

function pickBestSoloAssignee(loads, dayLoads, weight, rand, allowedPeople){
  const pool = Array.isArray(allowedPeople) && allowedPeople.length ? allowedPeople.slice() : PEOPLE.slice();

  let best = null;
  let bestScore = Infinity;

  pool.forEach(p => {
    const sc = scoreAfterAssign(loads, dayLoads, p, weight);
    if (sc < bestScore){
      bestScore = sc;
      best = p;
    } else if (sc === bestScore && rand && rand() < 0.5){
      best = p;
    }
  });

  return best || pool[0] || PEOPLE[0];
}

function pickBestPairAssignees(loads, dayLoads, weight, rand, allowedPeople){
  const pool = Array.isArray(allowedPeople) && allowedPeople.length ? allowedPeople.slice() : PEOPLE.slice();
  const pairWeight = (Number(weight) || 0) / 2;

  let bestPair = null;
  let bestScore = Infinity;

  for (let i = 0; i < pool.length; i++){
    for (let j = i + 1; j < pool.length; j++){
      const a = pool[i];
      const b = pool[j];
      const sc = scoreAfterAssign(loads, dayLoads, a, pairWeight) + scoreAfterAssign(loads, dayLoads, b, pairWeight);

      if (sc < bestScore){
        bestScore = sc;
        bestPair = [a, b];
      } else if (sc === bestScore && rand && rand() < 0.5){
        bestPair = [a, b];
      }
    }
  }

  if (bestPair) return bestPair;

  const a = pool[0] || PEOPLE[0];
  const b = pool.find(p => p !== a) || PEOPLE.find(p => p !== a) || a;
  return [a, b];
}

function generateBalancedWeeklyPlan(weekSeed, salt){
  const seedStr = weekSeed || weekSeedString();
  const saltStr = (salt !== undefined && salt !== null) ? String(salt) : "";
  const weights = defaultChoreWeights();
  const days = {};

  DAYS.forEach(dayKey => {
    const cadence = FIXED_WEEKLY_CADENCE[dayKey] || { pair:{}, solo:{}, walk:"", fynnTreat:"" };
    const tasks = [];

    // Pair chores: true two-person assignments from the fixed cadence
    ROTATING_PAIR_CHORES.forEach(c => {
      const pair = cadence.pair && Array.isArray(cadence.pair[c.slug]) ? cadence.pair[c.slug].slice(0, 2) : [];
      const a = pair[0];
      const b = pair[1];
      if (!PEOPLE.includes(a) || !PEOPLE.includes(b) || a === b) return;

      // Primary = second assignee for a stable accountability marker
      tasks.push(makeTask(dayKey, c.slug, c.text, [a, b], b));
    });

    // Solo chores from the fixed cadence
    ROTATING_SOLO_CHORES.forEach(c => {
      const assignee = cadence.solo ? cadence.solo[c.slug] : "";
      if (!PEOPLE.includes(assignee)) return;
      tasks.push(makeTask(dayKey, c.slug, c.text, [assignee], assignee));
    });

    // Walk from cadence (kept explicit so the whole week is fixed)
    if (PEOPLE.includes(cadence.walk)) {
      tasks.push(makeTask(dayKey, "walk", "Walk with Celo", [cadence.walk], cadence.walk));
    }

    // Fynn treat from cadence
    if (PEOPLE.includes(cadence.fynnTreat)) {
      tasks.push(makeTask(dayKey, "fynnTreat", "Give Fynn his teeth treat", [cadence.fynnTreat], cadence.fynnTreat));
    }

    // Fixed member-exclusive chores
    FIXED_SOLO_CHORES.forEach(c => {
      if (!PEOPLE.includes(c.person)) return;
      if (!shouldIncludeFixedChoreOnDay(c, dayKey)) return;
      tasks.push(makeTask(dayKey, c.slug, c.text, [c.person], c.person));
    });

    // Keep only the two reminder chores at the bottom
    const reminders = [];
    const nonReminders = [];
    tasks.forEach(t => {
      const slug = String(t?.id || "").split("::")[1] || "";
      if (isReminderSlug(slug)) reminders.push(t);
      else nonReminders.push(t);
    });

    days[dayKey] = nonReminders.concat(reminders);
  });

  const plan = { weekSeed: seedStr, days };
  const totals = computePlanMemberTotals(plan);

  plan.meta = {
    rebalanceSalt: saltStr,
    loads: totals,
    targets: WEEKLY_TARGETS,
    weights
  };

  return plan;
}

function hashSeed(str){
  // small, deterministic hash (good enough for shuffling chores)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandFactory(seed){
  // mulberry32
  let t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed){
  const a = arr.slice();
  const rand = seededRandFactory(seed);
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rotateArray(arr, offset){
  const a = arr.slice();
  const n = a.length;
  const o = ((offset % n) + n) % n;
  return a.slice(o).concat(a.slice(0, o));
}

function allowedPairsForWeek(seed){
  // Legacy name kept for minimal disruption.
  // We no longer enforce fixed pairing groups.
  // Instead, return a deterministic per-week shuffled people list used for pairing variety.
  return seededShuffle(PEOPLE, seed + 101);
}

function buildDailyBaseTasks_legacy(dayKey){
  const dayIdx = DAYS.indexOf(dayKey);
  const seed = hashSeed("chores::" + weekSeedString());

  // Shuffle people per-week and rotate per-day so assignments vary day-to-day.
  const weeklyPeopleOrder = seededShuffle(PEOPLE, seed + 7);
  const todayOrder = rotateArray(weeklyPeopleOrder, dayIdx);

  // 2-person chores: pick ANY 2 members (deterministic), no fixed pairing groups.
  const weeklyPairPool = allowedPairsForWeek(seed);
  const pairRand = seededRandFactory(seed + 1000 + (dayIdx * 97));

  function pickTwoDistinct(){
    const a = weeklyPairPool[Math.floor(pairRand() * weeklyPairPool.length)];
    let b = weeklyPairPool[Math.floor(pairRand() * weeklyPairPool.length)];
    if (weeklyPairPool.length > 1){
      while (b === a){
        b = weeklyPairPool[Math.floor(pairRand() * weeklyPairPool.length)];
      }
    }
    return [a, b];
  }

  const tasks = [];

  // --- Pair chores ---
  ROTATING_PAIR_CHORES.forEach((c, i) => {
    const pair = pickTwoDistinct();
    // Primary is the 2nd person for a tiny bit of accountability variety.
    tasks.push(makeTask(dayKey, c.slug, c.text, pair.slice(), pair[1]));
  });

  // --- Solo chores ---
  // Assign solo chores in a round-robin through todayOrder.
  // This is simple and fair: each person gets different chores across the week.
  ROTATING_SOLO_CHORES.forEach((c, i) => {
    const person = todayOrder[i % todayOrder.length];
    tasks.push(makeTask(dayKey, c.slug, c.text, [person], person));
  });

  // --- Fixed chores (personal reminders) ---
  FIXED_SOLO_CHORES.forEach(c => {
    // School nights: Sunday through Thursday
    if (c.when === "weekdays"){
      if (!(dayKey === "domingo" || dayKey === "lunes" || dayKey === "martes" || dayKey === "miercoles" || dayKey === "jueves")) return;
    }
    if (c.when === "monwed"){
      // Brush Harvey (Dad): Monday + Wednesday
      if (!(dayKey === "lunes" || dayKey === "miercoles")) return;
    }
    if (c.when === "fri"){
      // Brush Harvey (Ethan): Friday only
      if (dayKey !== "viernes") return;
    }
    if (c.when === "monfri"){
      // Monday through Friday only
      if (!(dayKey === "lunes" || dayKey === "martes" || dayKey === "miercoles" || dayKey === "jueves" || dayKey === "viernes")) return;
    }
    if (!PEOPLE.includes(c.person)) return;
    tasks.push(makeTask(dayKey, c.slug, c.text, [c.person], c.person));
  });

  // Keep Celo reminder chores at the bottom of the list whenever they appear.
  // (Only these two reminders move; everything else stays in the same relative order.)
  const REMINDER_SLUGS_BOTTOM = new Set(["prepBackpack", "appleWatch"]);
  const reminders = [];
  const others = [];
  tasks.forEach(t => {
    const slug = String(t?.id || "").split("::")[1] || "";
    if (REMINDER_SLUGS_BOTTOM.has(slug)) reminders.push(t);
    else others.push(t);
  });
  tasks.length = 0;
  others.forEach(t => tasks.push(t));
  reminders.forEach(t => tasks.push(t));

  // --- Manual day-specific tweaks (keep Ethan from having light days) ---
  function forceSoloTo(slug, person, newText){
    const t = tasks.find(x => String(x?.id || "") === `${dayKey}::${slug}`);
    if (!t) return;
    t.assignees = [person];
    t.primary = person;
    if (newText) t.text = newText;
  }

  function forcePairTo(slug, personA, personB){
    const t = tasks.find(x => String(x?.id || "") === `${dayKey}::${slug}`);
    if (!t) return;
    if (!personA || !personB || personA === personB) return;
    t.assignees = [personA, personB];
    t.primary = personB;
  }

  if (dayKey === "lunes"){
    // Move Wipe kitchen counters to Ethan
    forceSoloTo("counters", "Ethan");
    // Move Wipe dining table to Ethan
    forceSoloTo("dining", "Ethan");
  }

  if (dayKey === "lunes"){
    // Wash dishes should be Mom + Ethan
    forcePairTo("dishes", "Mom", "Ethan");
  }

  if (dayKey === "martes"){
    // Move Cabinets (renamed) to Mom
    forceSoloTo("cabinets", "Mom", "Wipe down cabinets");
    // Move Wipe kitchen counters to Mom
    forceSoloTo("counters", "Mom");
  }

  if (dayKey === "miercoles"){
    // Protect Mom: move Dog poop to Dad
    forceSoloTo("dogPoop", "Dad");
  }

  if (dayKey === "jueves"){
    // Move Dog poop to Ethan
    forceSoloTo("dogPoop", "Ethan");

    // Vacuum should be Mom + Ethan
    forcePairTo("vacuum", "Mom", "Ethan");

    // Take out trash should be Celo + Ethan
    forcePairTo("trash", "Celo", "Ethan");
  }

  if (dayKey === "viernes"){
    // Move Wipe dining table to Ethan
    forceSoloTo("dining", "Ethan");
    // Wash dishes should be Mom + Dad
    forcePairTo("dishes", "Mom", "Dad");
  }

  if (dayKey === "domingo"){
    // Protect Mom: move Dog poop to Dad
    forceSoloTo("dogPoop", "Dad");
  }

  // Give Fynn his teeth treat (rotates by day)
  const treatRotation = ["Dad","Mom","Ethan","Celo","Dad","Mom","Ethan"];
  const treatIdx = DAYS.indexOf(dayKey);
  const treatPerson = treatRotation[treatIdx] || "Dad";
  tasks.push(makeTask(dayKey, "fynnTreat", "Give Fynn his teeth treat", [treatPerson], treatPerson));

  return tasks;
}

// =========================
// Weekly plan cache bridge (Chunk 3)
// - buildDailyBaseTasks() now reads from cached weekly plan
// - Safe fallback: legacy daily builder if cache is missing/corrupt
// =========================

function ensureWeeklyPlanForCurrentWeek(){
  const curSeed = weekSeedString();
  const s = loadWeeklyPlanState();

  const valid = !!(s && typeof s === "object" && typeof s.weekSeed === "string" && s.weekSeed === curSeed && s.days && typeof s.days === "object");
  if (valid) return s;

  const plan = generateBalancedWeeklyPlan(curSeed);
  saveWeeklyPlanState(plan);
  return plan;
}

function cloneTasksArray(arr){
  // Avoid accidental in-memory mutation leaking into cached plan.
  if (!Array.isArray(arr)) return [];
  return arr.map(t => {
    const o = (t && typeof t === "object") ? { ...t } : t;
    if (o && o.assignees && Array.isArray(o.assignees)) o.assignees = o.assignees.slice();
    return o;
  });
}

function buildDailyBaseTasks(dayKey){
  try{
    const plan = ensureWeeklyPlanForCurrentWeek();
    const dayTasks = plan && plan.days ? plan.days[dayKey] : null;
    if (Array.isArray(dayTasks) && dayTasks.length){
      return cloneTasksArray(dayTasks);
    }
  } catch (e){
    console.warn("Weekly plan read failed; attempting regenerate.", e);
  }

  // No legacy fallback: regenerate a fresh plan and use it (or fail loudly with empty list).
  try{
    const curSeed = weekSeedString();
    const plan2 = generateBalancedWeeklyPlan(curSeed);
    saveWeeklyPlanState(plan2);
    const dayTasks2 = plan2 && plan2.days ? plan2.days[dayKey] : null;
    if (Array.isArray(dayTasks2)){
      return cloneTasksArray(dayTasks2);
    }
  } catch (e2){
    console.error("Weekly plan generation failed.", e2);
    alert("Weekly plan generation failed. Open the console for details.");
  }

  return [];
}
// -------------------------
// Phase 8.3 + 8.4 helpers

// -------------------------
// Phase 8.3 + 8.4 helpers
// -------------------------
const PARENTS = ["Dad", "Mom"];
const KIDS = ["Ethan", "Celo"];

function isParent(p){ return PARENTS.includes(p); }
function isKid(p){ return KIDS.includes(p); }

// Phase 8.4: Walk alternates every other day. Mom starts on lunes.
function walkAssigneeForDay(dayKey){
  const idx = DAYS.indexOf(dayKey);
  // lunes (idx 0) => Mom, martes (1) => Dad, etc.
  return (idx % 2 === 0) ? "Mom" : "Dad";
}

function buildWalkTask(dayKey){
  const who = walkAssigneeForDay(dayKey);
  return makeTask(dayKey, "walk", "Walk with Celo", [who], who);
}

// Two-person chores safeguard: keep exactly two distinct assignees.
// No fixed pairing groups anymore.
function normalizeTwoPersonTask(task){
  if (!task || !Array.isArray(task.assignees)) return task;
  if (task.assignees.length !== 2) return task;

  const a = task.assignees[0];
  const b = task.assignees[1];
  if (a && b && a !== b) return task;

  // Repair duplicates/nulls deterministically.
  const seed = hashSeed("pairfix::" + (task.id || ""));
  const pool = seededShuffle(PEOPLE, seed);
  const fixedA = pool[0];
  const fixedB = pool[1] || pool[0];
  return { ...task, assignees: [fixedA, fixedB], primary: fixedB };
}

function getTasksForDay(dayKey){
  // Build a rotating roster (stable per-week, varied per-day).
  const base = buildDailyBaseTasks(dayKey);

  // Phase 8.4: ensure walk alternates every other day and is injected once.
  const withoutWalk = base.filter(t => {
    const id = (t && t.id) ? t.id : "";
    return !id.endsWith("::walk");
  });

  withoutWalk.push(buildWalkTask(dayKey));

  // Safeguard 2-person chores (must remain 2 distinct people).
  return withoutWalk.map(t => normalizeTwoPersonTask(t));
}
const WEEKLY_CHORES = [
  "Sweep backyard",
  "Wipe inside fridge",
  "Clean inside microwave",
  "Clean trash can (inside & out)",
  "Shake out entry mats",
  "Dust ceiling fans & vents",
  "Clean toilets",
  "Wipe down bathroom",
  "Clean showers",
  "Doors & windows"
];

// Phase 5/6 scaffolding
const BIWEEKLY_CHORES = [
  "Sweep the outside area",
  "Wipe cabinet fronts & handles",
  "Clean pet bedding (if applicable)",
  "Wipe window sills & tracks",
  "Wipe walls & doors",
  "Clean windows (inside)"
];

const MONTHLY_CHORES = ["Clean baseboards",
  "Clean light switches & door handles",
  "Deep clean bathrooms (grout, tub edges, behind toilet)",
  "Clean behind large appliances (fridge, stove if movable)",
  "Wash blankets & throws",
  "Wash mattress protectors",
  "Clean oven (light or self-clean)",
  "Clean front door",
  "Spot clean patio or porch"];    // Phase 6

/* =========================
   STORAGE HELPERS
========================= */

// Member avatars (Admin page) - stored as data URLs in localStorage
function defaultMemberPhotos(){
  const o = {};
  PEOPLE.forEach(p => o[p] = "");
  return o;
}
function loadMemberPhotos(){
  const d = defaultMemberPhotos();
  const s = jget("memberPhotos", d);
  PEOPLE.forEach(p => { if (typeof s[p] !== "string") s[p] = ""; });
  return s;
}
function saveMemberPhotos(s){ jset("memberPhotos", s); }

function jget(k, fallback){
  try{ return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); }
  catch{ return fallback; }
}
function jset(k, v){
  try{
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e){
    console.error("localStorage write failed for", k, e);
  }
}

// Weekly plan cache (Proper Weekly Balancer)
// Stored locally so the weekly roster is stable across refreshes and only regenerates on a new week.
function loadWeeklyPlanState(){
  return jget("weeklyPlanState", { weekSeed:"", days:{}, meta:{} });
}
function saveWeeklyPlanState(s){
  // Ensure minimal shape
  if (!s || typeof s !== "object") s = { weekSeed:"", days:{}, meta:{} };
  if (typeof s.weekSeed !== "string") s.weekSeed = "";
  if (!s.days || typeof s.days !== "object") s.days = {};
  if (!s.meta || typeof s.meta !== "object") s.meta = {};
  jset("weeklyPlanState", s);
}

function clearWeeklyPlanState(){
  localStorage.removeItem("weeklyPlanState");
}

function resetDailyAndWeeklyChoreState(){
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


// ===== Rebuild Week Preview (required) =====
function computePlanMemberTotals(plan){
  const weights = defaultChoreWeights();
  const totals = { Dad:0, Mom:0, Ethan:0, Celo:0 };
  if (!plan || !plan.days) return totals;

  Object.keys(plan.days).forEach(dayKey => {
    const items = plan.days[dayKey] || [];
    items.forEach(t => {
      if (!t || typeof t !== "object") return;
      const id = String(t.id || "");
      const slug = id.includes("::") ? id.split("::")[1] : "";
      const w = Number(weights[slug] ?? 0) || 0;
      const assignees = Array.isArray(t.assignees) ? t.assignees.filter(p => PEOPLE.includes(p)) : [];

      if (assignees.length === 2){
        const split = w / 2;
        assignees.forEach(person => {
          totals[person] = (totals[person] || 0) + split;
        });
        return;
      }

      const person = String(t.primary || assignees[0] || "");
      if (!PEOPLE.includes(person)) return;
      totals[person] = (totals[person] || 0) + w;
    });
  });

  return totals;
}

function countPlanChanges(oldPlan, newPlan){
  let changed = 0;
  const days = new Set([...(Object.keys((oldPlan && oldPlan.days) || {})), ...(Object.keys((newPlan && newPlan.days) || {}))]);
  days.forEach(dayKey => {
    const a = (oldPlan && oldPlan.days && oldPlan.days[dayKey]) ? oldPlan.days[dayKey] : [];
    const b = (newPlan && newPlan.days && newPlan.days[dayKey]) ? newPlan.days[dayKey] : [];

    // Map by slug -> normalized assignee signature
    const mapA = new Map(a.map(t => {
      const id = String((t && t.id) || "");
      const slug = id.includes("::") ? id.split("::")[1] : id;
      const assignees = Array.isArray(t && t.assignees) ? t.assignees.slice().sort().join("|") : "";
      const primary = String((t && t.primary) || "");
      return [slug, `${assignees}::${primary}`];
    }));
    const mapB = new Map(b.map(t => {
      const id = String((t && t.id) || "");
      const slug = id.includes("::") ? id.split("::")[1] : id;
      const assignees = Array.isArray(t && t.assignees) ? t.assignees.slice().sort().join("|") : "";
      const primary = String((t && t.primary) || "");
      return [slug, `${assignees}::${primary}`];
    }));

    const slugs = new Set([...mapA.keys(), ...mapB.keys()]);
    slugs.forEach(slug => {
      if ((mapA.get(slug) || "") !== (mapB.get(slug) || "")) changed++;
    });
  });
  return changed;
}

function buildPlanSummary(oldPlan, newPlan){
  const totals = computePlanMemberTotals(newPlan);
  const inRange = {};
  Object.keys(WEEKLY_TARGETS).forEach(p => {
    const t = WEEKLY_TARGETS[p];
    const v = totals[p] || 0;
    inRange[p] = (v >= t.min && v <= t.max);
  });
  const changed = countPlanChanges(oldPlan || {days:{}}, newPlan || {days:{}});
  return { totals, inRange, changed };
}

function showRebuildPreviewModal(summary, newPlan){
  // Remove existing
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
    if (!confirm("Apply this rebuilt week plan? This will replace the current week’s DAILY chore assignments.")) return;
    saveWeeklyPlanState(newPlan);
    overlay.remove();
    renderApp();
  };

  actions.appendChild(btnCancel);
  actions.appendChild(btnApply);
  modal.appendChild(actions);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}


/* =========================
   FIRESTORE SYNC (cross-device)
   - localStorage remains the cache
   - Firestore is the shared source of truth
   - pull-first, then allow pushes
========================= */

// Keys we want synced across devices
window.SYNC_KEYS = new Set([
  "dailyState",
  "weeklyState",
  "biweeklyState",
  "monthlyState",
  "maintState",
  "dashState",
  "groceriesState",
  "memberColors",
  "memberPhotos",
  "themeState"
]);

// Sync runtime state (kept global so both scripts can see it)
window.__FS_SYNC = window.__FS_SYNC || {
  ready: false,
  applyingRemote: false,
  lastRemoteUpdatedAt: 0,
  lastLocalUpdatedAt: 0
};

function __getLocalItemParsed(key, fallback){
  try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch{ return fallback; }
}

function __buildLocalSyncBlob(){
  return {
    dailyState: __getLocalItemParsed("dailyState", {}),
    weeklyState: __getLocalItemParsed("weeklyState", { checks:{}, assign:{} }),
    biweeklyState: __getLocalItemParsed("biweeklyState", { checks:{}, assign:{} }),
    monthlyState: __getLocalItemParsed("monthlyState", { checks:{}, assign:{} }),
    maintState: __getLocalItemParsed("maintState", { entries:[] }),
    dashState: __getLocalItemParsed("dashState", {
      dashboardNotes: "",
      viewerDay: "",
      viewerReadOnly: false,
      ringFilters: { daily:"All", weekly:"All", biweekly:"All", monthly:"All" }
    }),
    groceriesState: __getLocalItemParsed("groceriesState", { items:[] }),
    memberColors: __getLocalItemParsed("memberColors", defaultMemberColors()),
    memberPhotos: __getLocalItemParsed("memberPhotos", defaultMemberPhotos()),
    themeState: __getLocalItemParsed("themeState", { themeId:"neonGlass", mode:"dark" }),
    updatedAt: Date.now()
  };
}

function __applyRemoteSyncBlob(remote){
  if (!remote || typeof remote !== "object") return;

  // Guard: never let a blank/empty remote wipe local by accident.
  // If remote has no updatedAt and no known keys, ignore it.
  const hasKnownKey = Array.from(window.SYNC_KEYS).some(k => Object.prototype.hasOwnProperty.call(remote, k));
  if (!hasKnownKey) return;

  window.__FS_SYNC.applyingRemote = true;
  try{
    Array.from(window.SYNC_KEYS).forEach(k => {
      if (Object.prototype.hasOwnProperty.call(remote, k)){
        localStorage.setItem(k, JSON.stringify(remote[k]));
      }
    });
  } finally {
    window.__FS_SYNC.applyingRemote = false;
  }

  // After applying remote state, refresh UI safely
  try{ renderApp(); } catch {}
}

// Member colors (Admin page)
function defaultMemberColors(){
  return {
    Dad:  "#4caf50",
    Mom:  "#ffb300",
    Ethan:"#42a5f5",
    Celo: "#ab47bc"
  };
}

// Theme member color presets are defined above in THEME_MEMBER_COLORS.
function loadMemberColors(){
  const d = defaultMemberColors();
  const s = jget("memberColors", d);
  // ensure all keys exist
  PEOPLE.forEach(p => { if (!s[p]) s[p] = d[p] || "#ffffff"; });
  return s;
}
function saveMemberColors(s){ jset("memberColors", s); }

// Daily state (per day)
function loadDailyState(){ return jget("dailyState", {}); }
function saveDailyState(s){ jset("dailyState", s); }

// Weekly shared state
function loadWeeklyState(){ return jget("weeklyState", { checks:{}, assign:{} }); }
function saveWeeklyState(s){ jset("weeklyState", s); }

// Biweekly shared state (Phase 5)
function loadBiweeklyState(){ return jget("biweeklyState", { checks:{}, assign:{} }); }
function saveBiweeklyState(s){ jset("biweeklyState", s); }

// Monthly shared state (Phase 6)
function loadMonthlyState(){ return jget("monthlyState", { checks:{}, assign:{} }); }
function saveMonthlyState(s){ jset("monthlyState", s); }

// Maintenance log (Phase 7)
function loadMaintState(){ return jget("maintState", { entries:[] }); }
function saveMaintState(s){ jset("maintState", s); }

// Dashboard notes (no PIN) + dashboard day-notes viewer
function loadDashState(){
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
    const order = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
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


function saveDashState(s){ jset("dashState", s); }

// Groceries (persistent across all pages)
function loadGroceriesState(){
  return jget("groceriesState", { items: [] });
}
function saveGroceriesState(s){ jset("groceriesState", s); }

function normItemText(t){
  return (t || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/* =========================
   NAV + ROUTING
========================= */

function route(){
  // Normalize: supports "#/dashboard", "#dashboard", "#//dashboard", etc.
  const raw = (location.hash || "")
    .replace(/^#/, "")     // remove leading "#"
    .replace(/^\/+/, "")   // remove one or more leading "/"
    .trim();

  return raw || "dashboard";
}

function goto(path){
  location.hash = "#/" + path;
}

function renderTopNav(){
  const nav = document.getElementById("topNav");
  nav.innerHTML = "";

  const r = route();

  // If we're on a day page (or the special "hoy" route), enable day-to-day cycling.
  const isDayRoute = DAYS.includes(r) || r === "hoy";
  const today = todayKey();
  const currentDayKey = (r === "hoy") ? today : r;
  const isTodayView = (r === "hoy") || (DAYS.includes(r) && r === today);

  // --- Hamburger on the TOP LEFT (central navigation) ---
  const menuWrap = document.createElement("div");
  menuWrap.className = "menuWrap";

  const ham = document.createElement("button");
  ham.className = "hamburgerBtn";
  ham.type = "button";
  ham.setAttribute("aria-label", "Menu");
  ham.textContent = "☰";
  menuWrap.appendChild(ham);

  nav.appendChild(menuWrap);

  // Persistent Hoy button (always visible)
  const hoyTopBtn = document.createElement("button");
  hoyTopBtn.className = "navBtn";
  hoyTopBtn.type = "button";
  hoyTopBtn.textContent = "Hoy";
  hoyTopBtn.addEventListener("click", () => {
    goto("hoy");
  });
  nav.appendChild(hoyTopBtn);

  // Day cycling buttons (Ayer / Mañana) shown on daily views
  if (isDayRoute){
    const ayerBtn = document.createElement("button");
    ayerBtn.className = "navBtn";
    ayerBtn.type = "button";
    ayerBtn.textContent = "Ayer";
    ayerBtn.addEventListener("click", () => {
      const prev = prevDayKey(currentDayKey);
      goto(prev);
    });
    nav.appendChild(ayerBtn);

    const mananaBtn = document.createElement("button");
    mananaBtn.className = "navBtn";
    mananaBtn.type = "button";
    mananaBtn.textContent = "Mañana";
    mananaBtn.addEventListener("click", () => {
      const next = nextDayKey(currentDayKey);
      goto(next);
    });
    nav.appendChild(mananaBtn);
  }

  // Optional: small page label (kept subtle)
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

  // Spacer (keeps header layout stable)
  const spacer = document.createElement("div");
  spacer.className = "spacer";
  nav.appendChild(spacer);

  // Groceries button (persistent)
  const groceryBtn = document.createElement("button");
  groceryBtn.className = "groceryBtn";
  groceryBtn.type = "button";
  groceryBtn.setAttribute("aria-label", "Groceries");
  groceryBtn.textContent = "🛒";
  nav.appendChild(groceryBtn);

  // Weekly reset button remains contextual on day pages
  // (addContextResetButton handles insertion before the menuWrap in old layout;
  // here we just let it append near the right edge)

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
  if (sideNav) sideNav.innerHTML = "";

  function closeSide(){
    overlay.classList.remove("open");
    panel.classList.remove("open");
  }

  function openSide(){
    overlay.classList.add("open");
    panel.classList.add("open");
  }

  function navBtn(text, path, isActive){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sideBtn" + (isActive ? " active" : "");
    b.textContent = text;
    b.onclick = () => {
      closeSide();
      goto(path);
    };
    return b;
  }

  // Hoy (simple)
  sideNav.appendChild(navBtn("Hoy", "hoy", (r === "hoy" || DAYS.includes(r))));

  // Dashboard
  sideNav.appendChild(navBtn("Dashboard", "dashboard", r === "dashboard"));

  // Celo's School calendar
  sideNav.appendChild(navBtn("Celo's School", "celos-school", r === "celos-school"));

  // Other primary routes
  sideNav.appendChild(navBtn("Bi-weekly", "biweekly", r === "biweekly"));
  sideNav.appendChild(navBtn("Monthly", "monthly", r === "monthly"));
  sideNav.appendChild(navBtn("Maintenance", "maintenance", r === "maintenance"));
  sideNav.appendChild(navBtn("Admin", "admin", r === "admin"));

  // Wire open/close behavior
  ham.onclick = (e) => {
    e.stopPropagation();
    openSide();
  };

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
    // Ensure UI is up to date
    renderGroceriesPanel();
    gOverlay.classList.add("open");
    gPanel.classList.add("open");

    // focus input for fast entry
    const input = document.getElementById("groceryText");
    if (input) setTimeout(() => input.focus(), 0);
  }

  window.__openGroceries = openGroceries;

  const gClose = document.getElementById("groceryCloseBtn");
  if (gClose) gClose.onclick = closeGroceries;
  gOverlay.onclick = closeGroceries;

  // Wire header button
  groceryBtn.onclick = (e) => {
    e.stopPropagation();
    openGroceries();
  };

  // Escape closes both side menu and notes overlay
  document.onkeydown = (ev) => {
    if (ev.key === "Escape"){
      closeSide();
      closeNotes();
    }
  };
}

window.addEventListener("hashchange", renderApp);

/* =========================
   RING CALCULATIONS
========================= */

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

  // Daily progress is tracked per-person per-assignment.
  // Two-person chores are NOT shared anymore.
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

/**
 * Shared progress calc for list+assignment sections (Semanal/Bi-weekly/Monthly).
 * A chore counts as done ONLY when:
 *  - assigned to someone AND
 *  - checked complete
 * Contribution credit goes to the assigned person.
 */
function calcAssignedListProgress(list, loadFn){
  const total = list.length;
  const s = loadFn();
  const byPerson = emptyContribution();
  const totalByPerson = emptyContribution();

  let done = 0;
  list.forEach(item => {
    const checked  = !!(s.checks && s.checks[item]);
    const assigned = (s.assign && s.assign[item]) ? s.assign[item] : "";

    // Per-person totals are based on assignments.
    if (assigned && totalByPerson[assigned] !== undefined){
      totalByPerson[assigned] = (totalByPerson[assigned] || 0) + 1;
    }

    // A chore counts as done ONLY when assigned AND checked.
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
/* =========================
   DASHBOARD RENDER
========================= */

function ringFilterOptions(selected){
  const opts = ["All", ...PEOPLE];
  return opts.map(v => `<option value="${escapeHtml(v)}" ${v===selected?"selected":""}>${escapeHtml(v)}</option>`).join("");
}

function applyRingFilter(progressObj, selected){
  // progressObj: { done,total,byPerson,totalByPerson }
  if (!progressObj) return { done:0, total:0, byPerson: emptyContribution(), totalByPerson: emptyContribution() };
  if (!selected || selected === "All") return progressObj;

  const personDone = (progressObj.byPerson && typeof progressObj.byPerson[selected] === "number") ? progressObj.byPerson[selected] : 0;
  const personTotal = (progressObj.totalByPerson && typeof progressObj.totalByPerson[selected] === "number") ? progressObj.totalByPerson[selected] : 0;

  const by = emptyContribution();
  by[selected] = personDone;

  const totBy = emptyContribution();
  totBy[selected] = personTotal;

  return { done: personDone, total: personTotal, byPerson: by, totalByPerson: totBy };
}

function renderDashboard(){
  const app = document.getElementById("app");

  const w = calcWeeklyProgress();
  const b = calcBiweeklyProgress();
  const m = calcMonthlyProgress();
  const d = calcDailyProgress();

  // Extract filters and apply per-ring
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
          ${ringCard("Daily (Hoy)", "daily", df, dpF)}
          ${ringCard("Semanal", "weekly", wf, wpF)}
          ${ringCard("Bi-weekly", "biweekly", bf, bpF)}
          ${ringCard("Monthly", "monthly", mf, mpF)}
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

  // Wire dashboard notes + day-notes viewer
  const dash2 = loadDashState();
  const dashTA = document.getElementById("dashNotes");
  const dayTA = document.getElementById("dayNotes");
  const dayLabel = document.getElementById("dayNotesLabel");

  // Dashboard notes (general)
  dashTA.value = dash2.dashboardNotes || "";
  dashTA.oninput = () => {
    const cur = loadDashState();
    cur.dashboardNotes = dashTA.value;
    saveDashState(cur);
  };

  // Day notes: default to today when arriving normally
  const selectedDay = (dash2.viewerDay && DAYS.includes(dash2.viewerDay)) ? dash2.viewerDay : todayKey();
  const ro = !!dash2.viewerReadOnly;

  const ds = loadDailyState();
  ds[selectedDay] = ds[selectedDay] || { checks:{}, notes:"" };

  if (dayLabel) dayLabel.textContent = `Notas para ${selectedDay}...`;
  dayTA.value = ds[selectedDay].notes || "";
  dayTA.placeholder = `Notas para ${selectedDay}...`;
  dayTA.readOnly = ro;
  dayTA.style.opacity = ro ? "0.85" : "1";

  // Only allow editing when not read-only AND the selected day is today
  dayTA.oninput = () => {
    const curDash = loadDashState();
    const currentSelected = (curDash.viewerDay && DAYS.includes(curDash.viewerDay)) ? curDash.viewerDay : todayKey();

    // Guardrails: only editable when viewerReadOnly is false AND day is today
    if (curDash.viewerReadOnly) return;
    if (currentSelected !== todayKey()) return;

    const dss = loadDailyState();
    dss[currentSelected] = dss[currentSelected] || { checks:{}, notes:"" };
    dss[currentSelected].notes = dayTA.value;
    saveDailyState(dss);
  };

  // After rendering the dashboard, reset viewer mode back to normal defaults
  // so the dashboard behaves as “today notes editable” next time unless explicitly invoked.
  dash2.viewerDay = todayKey();
  dash2.viewerReadOnly = false;
  saveDashState(dash2);

  // Wire ring filter dropdowns
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

function ringSVG(done, total, byPerson){
  const r = 30;
  const cx = 38, cy = 38;
  const c = 2 * Math.PI * r;

  const safeTotal = Math.max(0, Number(total) || 0);
  const safeDone  = Math.max(0, Math.min(safeTotal, Number(done) || 0));
  const p = safeTotal ? (safeDone / safeTotal) : 0;

  const filled = p * c; // how much of the ring is filled overall

  const colors = loadMemberColors();

  // Build ordered segments (stable order: Dad, Mom, Ethan, Celo)
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

function ringCard(title, ringKey, prog, percent){
  const dash = loadDashState();
  const filters = dash.ringFilters || { daily:"All", weekly:"All", biweekly:"All", monthly:"All" };
  const selected = filters[ringKey] || "All";

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



/* =========================
   DAY VIEW RENDER
   - Layout switch implemented here: columns first, then semanal panel.
========================= */

function renderDay(dayKey){
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
        <div style="display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;">
          <h2 class="dayTitle" style="margin:0;">${dayKey}</h2>
          ${pickupReminder ? `<div class="hint" style="margin:0; font-size:14px;">${pickupReminder}</div>` : ""}
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="dayDate">${dayDate}</div>
          ${dayKey === "domingo" ? '<button class="danger" id="btnWeeklyDayReset" type="button">Reset</button>' : ''}
        </div>
      </div>
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

    // Outline each member column with that member's color
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

    const tasks = getTasksForDay(dayKey).filter(t => (t.assignees || []).includes(person));

    tasks.forEach(t => {
      const row = document.createElement("div");
      row.className = "chore";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      // Apply member color to checkbox for quick visual association
      try{ cb.style.accentColor = pc; }catch(e){}
      cb.id = `${t.id}__${person}`;
      cb.checked = !!state[dayKey].checks[`${t.id}::${person}`];
      cb.onchange = () => {
        const s = loadDailyState();
        s[dayKey] = s[dayKey] || { checks:{}, notes:"" };
        const key = `${t.id}::${person}`;
        s[dayKey].checks[key] = cb.checked;
        saveDailyState(s);
        // Re-render to refresh pressed styling, but do NOT sync other people's checkboxes.
        renderDailyColumns(dayKey);
      };

      // Label wraps checkbox + text so the text is part of the tap target
      const wrap = document.createElement("label");
      wrap.className = "choreLabel";
      if (cb.checked) wrap.classList.add("pressed");
      wrap.htmlFor = cb.id;

      const text = document.createElement("span");

      // Friendly labels for 2-person chores (mirrors v1 text style)
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

function renderDayNotes(dayKey){
  const state = loadDailyState();
  state[dayKey] = state[dayKey] || { checks:{}, notes:"" };

  const notes = document.getElementById("dailyNotes");
  notes.value = state[dayKey].notes || "";
  notes.oninput = () => {
    const s = loadDailyState();
    s[dayKey] = s[dayKey] || { checks:{}, notes:"" };
    s[dayKey].notes = notes.value;
    saveDailyState(s);
  };
}

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
      // update dashboard ring if open later
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

function renderYesterday(dayKey){
  const y = prevDayKey(dayKey);

  const title = document.getElementById("validationTitle");
  if (title) title.textContent = `Validation chores (from ${y})`;

  const grid = document.getElementById("validationGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const yTasks = getTasksForDay(y);

  // Show what each person had assigned yesterday (regardless of completion).
  // For 2-person chores, show the friendly "(with X)" label.
  // Special rule: in this section ONLY, omit Celo's backpack + Apple Watch chores.
  PEOPLE.forEach(person => {
    const items = yTasks
      .filter(t => (t.assignees || []).includes(person))
      .filter(t => {
        if (person !== "Celo") return true;

        const id = (t.id || "");
        const text = (t.text || "").toLowerCase();

        // omit only from validation section
        if (id.endsWith("::prepBackpack") || id.endsWith("::appleWatch")) return false;
        if (text.includes("prep backpack for tomorrow")) return false;
        if (text.includes("where's your apple watch")) return false;

        return true;
      });

    const card = document.createElement("div");
    card.className = "yCard";

    const t = document.createElement("div");
    t.className = "yTitle";
    t.textContent = person;
    card.appendChild(t);

    if (!items.length){
      const none = document.createElement("div");
      none.className = "yLine";
      none.style.opacity = "0.65";
      none.textContent = "(No chores)";
      card.appendChild(none);
    } else {
      items.forEach(task => {
        const line = document.createElement("div");
        line.className = "yLine";

        // No "NAME –" prefix. The column header already tells you who.
        if ((task.assignees || []).length === 2) {
          const other = (task.assignees || []).find(p => p !== person) || "";
          const base = (task.text || "").trim();
          line.textContent = other ? `${base} (with ${other})` : base;
        } else {
          line.textContent = (task.text || "").trim();
        }

        card.appendChild(line);
      });
    }

    grid.appendChild(card);
  });
}

function renderCeloSchool(){
  const app = document.getElementById("app");

  // Monthly cache-bust without needing HTML edits each month.
  // (Even though month.png is excluded from SW cache, Safari can still be clingy.)
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  app.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <div class="left">
          <h2 style="margin:0;">Celo's School</h2>
          <div class="hint" style="margin:0;">Calendar of events</div>
        </div>
      </div>

      <div class="panel" style="margin-top:12px; padding:12px;">
        <img
          src="month.png?v=${encodeURIComponent(v)}"
          alt="Celo's School calendar"
          style="width:100%; max-width:1100px; display:block; margin:0 auto; border-radius:12px;"
        />
      </div>

      <div class="hint" style="margin-top:10px; text-align:center;">
        Replace <code>month.png</code> in GitHub each month. No HTML edits needed.
      </div>
    </section>
  `;
}

/* =========================
   BIWEEKLY / MONTHLY / MAINTENANCE (scaffold pages)
   - These are intentionally minimal in Phase 4.
========================= */

function renderChecklistPage(kind){
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
        renderChecklistPage(kind);
      };

      const name = document.createElement("label");
      name.className = "name";
      name.htmlFor = cb.id;
      name.style.cursor = "pointer";
      name.textContent = item;

      row.appendChild(cb);
      row.appendChild(name);

      // Assignment dropdown (bi-weekly + monthly)
      state.assign = state.assign || {};

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

      sel.value = state.assign[item] || "";

      sel.onchange = () => {
        const s = isBi ? loadBiweeklyState() : loadMonthlyState();
        s.assign = s.assign || {};
        s.assign[item] = sel.value;
        if (isBi) saveBiweeklyState(s);
        else saveMonthlyState(s);
      };

      row.appendChild(sel);

      grid.appendChild(row);
    });

    isBi ? saveBiweeklyState(state) : saveMonthlyState(state);
  }

  document.getElementById("btnReset").onclick = () => {
  if (!confirm("Hard reset? This will clear all local data and restore defaults.")) return;

  try{
    const keys = [
      "dailyState","weeklyState","biweeklyState","monthlyState","dashState","groceriesState",
      "memberColors","memberPhotos","maintState","weeklyPlanState","themeState","syncMeta"
    ];
    keys.forEach(k => { try{ localStorage.removeItem(k); } catch {} });

    // Best-effort: clear any prefixed note/check keys
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("dayNote::") || k.startsWith("dayChecks::") || k.startsWith("dashNote::")) {
        try{ localStorage.removeItem(k); } catch {}
      }
    });

    renderApp();
    alert("Reset complete.");
  } catch (e){
    console.error("Hard reset failed:", e);
    alert("Reset failed. Check console for details.");
  }
};
}

function renderAdmin(){
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
          <button class="danger" id="btnRebalanceWeek">Rebalance Week</button>
          <button class="danger" id="btnResetColors">Reset Colors</button>
        </div>
      </div>
<div style="height:10px;"></div>

      <div class="adminGrid" id="adminGrid"></div>

      <div class="hint" style="margin-top:10px;">Tip: Think of member colors as each person's "signature" in the rings.</div>

      <div style="height:10px;"></div>

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

  // Theme system may not always be initialized. Guard against missing helpers/constants.
  const safeThemeState = (typeof loadThemeState === "function")
    ? (loadThemeState() || { themeId: "paperClean", mode: "dark" })
    : { themeId: "paperClean", mode: "dark" };

  const themePresets = (typeof THEME_MEMBER_COLORS !== "undefined" && THEME_MEMBER_COLORS)
    ? THEME_MEMBER_COLORS
    : null;

  // Member colors are always editable in this build.
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

  // --- Admin: member avatar uploads (stored locally) ---
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

  // --- Admin: pre-write day notes for the week (shared with Dashboard day notes) ---
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

    // Ensure any missing day buckets are persisted
    saveDailyState(ds);
  }

  // Disable reset button if locked
  // Rebalance Week (regenerates weeklyPlanState for the current week)
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

document.getElementById("btnResetColors").onclick = () => {
    if (!confirm("Reset member colors to defaults?")) return;
    saveMemberColors(defaultMemberColors());
    renderAdmin();
  };
}

function renderMaintenance(){
  const app = document.getElementById("app");
  const s = loadMaintState();
  s.entries = s.entries || [];

  // Phase 7.1: migrate legacy entries (no id) so delete works reliably
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

  // Sort newest first (by date)
  const entries = [...s.entries].sort((a, b) => {
    const da = (a.date || "");
    const db = (b.date || "");
    if (da === db) return 0;
    return da < db ? 1 : -1;
  });

  // Build options for completedBy
  const peopleOpts = PEOPLE.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

  // Simple suggested tasks (you can type anything)
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

  // Default the date to today
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

  // Add entry handler
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

  // Reset button
  document.getElementById("btnResetMaint").onclick = () => {
    if (!confirm("Reset maintenance log?")) return;
    localStorage.removeItem("maintState");
    renderMaintenance();
  };
}

/* =========================
   WEEKLY RESET (per your rules)
   - resets daily pages (checkboxes + notes)
   - resets weekly chores (checks + assignments)
   - DOES NOT touch dashboard notes/pin
   - DOES NOT touch biweekly/monthly/maintenance
========================= */

function weeklyReset(){
  if (!confirm("Weekly Reset: clear daily checkboxes + daily notes + weekly chores assignments/checks?")) return;
  localStorage.removeItem("dailyState");
  localStorage.removeItem("weeklyState");
  // stay on current page, re-render
  renderApp();
}

/* =========================
   APP RENDER
========================= */

function renderApp(){
  renderTopNav();
  const r = route();
  console.log("HASH:", location.hash, "ROUTE:", r);

  // add a contextual reset button to top nav only when on a day page
  // (keeps screen real estate used but avoids clutter on dashboard)
  addContextResetButton(r);

  if (r === "dashboard"){
    const dash = loadDashState();
    // If not explicitly invoked, default viewer to today (editable)
    if (!dash.viewerDay) dash.viewerDay = todayKey();
    if (dash.viewerReadOnly !== true) dash.viewerReadOnly = false;
    saveDashState(dash);
    return renderDashboard();
  }
  if (r === "biweekly") return renderChecklistPage("biweekly");
  if (r === "monthly") return renderChecklistPage("monthly");
  if (r === "maintenance") return renderMaintenance();
  if (r === "admin") return renderAdmin();
  if (r === "celos-school") return renderCeloSchool();

  // day route
  if (DAYS.includes(r)) return renderDay(r);

  // special alias: "hoy" means today's day page
  if (r === "hoy") return renderDay(todayKey());

  // unknown route: go home instead of silently showing today
  return goto("dashboard");
}

function addContextResetButton(r){
  const nav = document.getElementById("topNav");
  const existing = document.getElementById("ctxReset");
  if (existing) existing.remove();

  if (DAYS.includes(r)){
    // Read-only day-notes viewer shortcut
    const notesBtn = document.createElement("button");
    notesBtn.id = "ctxViewNotes";
    notesBtn.className = "navBtn";
    notesBtn.textContent = "View notes";
    notesBtn.onclick = () => {
      // If we're on today's page, show a quick overlay instead of navigating away
      if (r === todayKey()){
        // Ensure the notes UI exists (renderTopNav() creates it). Then open it.
        const openFn = window.__openNotesForDay;
        if (typeof openFn === "function"){
          openFn(r);
          return;
        }
      }

      // Otherwise: jump to dashboard and show read-only notes there
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


/* =========================
   GROCERIES PANEL RENDER
========================= */

function renderGroceriesPanel(){
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

    // Remove handlers
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

  // Add handler (dedupe + bump)
  function addItem(){
    const text = (inputEl.value || "").trim();
    if (!text) return;

    const cur = loadGroceriesState();
    cur.items = Array.isArray(cur.items) ? cur.items : [];

    const n = normItemText(text);
    // Dedupe by normalized text only
    const existingIdx = cur.items.findIndex(x => normItemText(x.text) === n);

    if (existingIdx >= 0){
      const existing = cur.items[existingIdx];
      existing.qty = Number(existing.qty || 1) + 1;
      // bump to top
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

  // Initial draw
  saveGroceriesState(state);
  redraw();
}

/* =========================
   UTIL
========================= */

function escapeHtml(str){
  return (str || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}
function isoToday(){
  // Returns YYYY-MM-DD in local time
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function makeId(){
  // Prefer native UUID; fall back for older Safari just in casex
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}


// Safety fallback: ensure THEMES exists so theme loader never crashes
// (Prevents "ReferenceError: Can't find variable: THEMES" if theme presets are missing)
if (typeof THEMES === "undefined") {
  var THEMES = {
    neonGlass: {
      dark: {
        "--panel": "#111",
        "--ringTrack": "rgba(255,255,255,0.12)"
      },
      light: {
        "--panel": "#ffffff",
        "--ringTrack": "rgba(0,0,0,0.12)"
      }
    },
    paperClean: {
      dark: {
        "--panel": "#111",
        "--ringTrack": "rgba(255,255,255,0.12)"
      },
      light: {
        "--panel": "#ffffff",
        "--ringTrack": "rgba(0,0,0,0.12)"
      }
    }
  };
}
/* =========================
   THEME STATE
========================= */

function loadThemeState(){
  const s = jget("themeState", { themeId: "neonGlass", mode: "dark" });
  if (!s || typeof s !== "object") return { themeId: "neonGlass", mode: "dark" };
  if (typeof s.themeId !== "string" || !s.themeId) s.themeId = "neonGlass";
  if (s.mode !== "dark" && s.mode !== "light") s.mode = "dark";
  if (!THEMES || !THEMES[s.themeId]) s.themeId = "neonGlass";
  return s;
}

function saveThemeState(s){
  if (!s || typeof s !== "object") s = { themeId: "neonGlass", mode: "dark" };
  if (typeof s.themeId !== "string" || !s.themeId) s.themeId = "neonGlass";
  if (s.mode !== "dark" && s.mode !== "light") s.mode = "dark";
  jset("themeState", s);
}

function applyTheme(themeId, mode){
  // Safe defaults
  const ts = loadThemeState();
  const tId = (typeof themeId === "string" && themeId) ? themeId : ts.themeId;
  const m = (mode === "light" || mode === "dark") ? mode : ts.mode;

  const theme = (THEMES && THEMES[tId]) ? THEMES[tId] : (THEMES && THEMES.neonGlass ? THEMES.neonGlass : null);
  const vars = theme ? (theme[m] || theme.dark || {}) : {};

  try{
    const root = document.documentElement;
    root.dataset.mode = m;
    root.dataset.theme = tId;

    // Apply CSS variables
    Object.keys(vars).forEach(k => {
      try{ root.style.setProperty(k, String(vars[k])); } catch {}
    });

    // Persist state
    saveThemeState({ themeId: tId, mode: m });

    // If this theme locks member colors, snap to presets.
    // Only paperClean allows editing.
    try{
      if (tId !== "paperClean" && typeof THEME_MEMBER_COLORS === "object" && THEME_MEMBER_COLORS[tId]){
        saveMemberColors({ ...THEME_MEMBER_COLORS[tId] });
      }
    } catch {}

  } catch (e){
    console.warn("applyTheme failed:", e);
  }
}

/* =========================
   INIT
========================= */

// Apply saved theme first (so the first render uses the right look)
try{
  const ts0 = loadThemeState();
  applyTheme(ts0.themeId, ts0.mode);
} catch {}

// Default to dashboard if no hash
if (!location.hash){
  goto("dashboard");
}
renderApp();

/* =========================
   SERVICE WORKER
========================= */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}
