import {
  DAYS, PEOPLE,
  ROTATING_PAIR_CHORES, ROTATING_SOLO_CHORES, FIXED_SOLO_CHORES,
  FIXED_WEEKLY_CADENCE, WEEKLY_TARGETS
} from './constants.js';
import { pad2, dateForDayKey, hashSeed, seededShuffle } from './utils.js';
import { loadWeeklyPlanState, saveWeeklyPlanState } from './state.js';

export function weekSeedString(){
  const monday = dateForDayKey("lunes");
  const y = monday.getFullYear();
  const m = pad2(monday.getMonth() + 1);
  const d = pad2(monday.getDate());
  return `${y}-${m}-${d}`;
}

const CHORE_WEIGHTS = {
  vacuum:      1.25,
  dishes:      1.25,
  trash:       0.75,
  feedDogs:    0.75,
  counters:    0.5,
  dining:      0.5,
  mop:         1.0,
  dust:        0.75,
  cabinets:    0.5,
  dogPoop:     0.75,
  walk:        0.75,
  fynnTreat:   0.25,
  read20:      0.5,
  brushHarvey: 0.5,
  checkAgenda: 0,
  prepBackpack: 0,
  appleWatch:  0
};

// Kept as export so external code (backup/audit display) can read weights by name
export function defaultChoreWeights(){ return { ...CHORE_WEIGHTS }; }

// Module-level constant so slugLabel doesn't recreate the array on every call
const ALL_CHORE_LABELS = [].concat(ROTATING_PAIR_CHORES, ROTATING_SOLO_CHORES);

export function isReminderSlug(slug){
  return slug === "prepBackpack" || slug === "appleWatch";
}

export function shouldIncludeFixedChoreOnDay(fixed, dayKey){
  if (!fixed || !fixed.when) return false;
  // "weekdays" = school nights: Sunday through Thursday (prep for next school day)
  if (fixed.when === "weekdays"){
    return (dayKey === "domingo" || dayKey === "lunes" || dayKey === "martes" || dayKey === "miercoles" || dayKey === "jueves");
  }
  if (fixed.when === "monwed") return (dayKey === "lunes" || dayKey === "miercoles");
  if (fixed.when === "fri")    return (dayKey === "viernes");
  if (fixed.when === "monfri") return (dayKey === "lunes" || dayKey === "martes" || dayKey === "miercoles" || dayKey === "jueves" || dayKey === "viernes");
  return false;
}

export function makeTask(dayKey, slug, text, assignees, primary){
  return { id: `${dayKey}::${slug}`, text, assignees, primary };
}

export function generateBalancedWeeklyPlan(weekSeed, salt){
  const seedStr = weekSeed || weekSeedString();
  const saltStr = (salt !== undefined && salt !== null) ? String(salt) : "";
  const days = {};

  DAYS.forEach(dayKey => {
    const cadence = FIXED_WEEKLY_CADENCE[dayKey] || { pair:{}, solo:{}, walk:"", fynnTreat:"" };
    const tasks = [];

    ROTATING_PAIR_CHORES.forEach(c => {
      const pair = cadence.pair && Array.isArray(cadence.pair[c.slug]) ? cadence.pair[c.slug].slice(0, 2) : [];
      const a = pair[0];
      const b = pair[1];
      if (!PEOPLE.includes(a) || !PEOPLE.includes(b) || a === b) return;
      tasks.push(makeTask(dayKey, c.slug, c.text, [a, b], b));
    });

    ROTATING_SOLO_CHORES.forEach(c => {
      const assignee = cadence.solo ? cadence.solo[c.slug] : "";
      if (!PEOPLE.includes(assignee)) return;
      tasks.push(makeTask(dayKey, c.slug, c.text, [assignee], assignee));
    });

    if (PEOPLE.includes(cadence.walk)) {
      tasks.push(makeTask(dayKey, "walk", "Walk with Celo", [cadence.walk], cadence.walk));
    }

    if (PEOPLE.includes(cadence.fynnTreat)) {
      tasks.push(makeTask(dayKey, "fynnTreat", "Give Fynn his teeth treat", [cadence.fynnTreat], cadence.fynnTreat));
    }

    FIXED_SOLO_CHORES.forEach(c => {
      if (!PEOPLE.includes(c.person)) return;
      if (!shouldIncludeFixedChoreOnDay(c, dayKey)) return;
      tasks.push(makeTask(dayKey, c.slug, c.text, [c.person], c.person));
    });

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
    weights: CHORE_WEIGHTS
  };

  return plan;
}

export function isValidTaskObject(task){
  if (!task || typeof task !== "object") return false;
  if (typeof task.id !== "string" || !task.id.includes("::")) return false;
  if (typeof task.text !== "string" || !task.text.trim()) return false;
  if (!Array.isArray(task.assignees) || !task.assignees.length) return false;

  const assignees = task.assignees.filter(p => PEOPLE.includes(p));
  if (assignees.length !== task.assignees.length) return false;

  const slug = task.id.split("::")[1] || "";
  const isPair = ROTATING_PAIR_CHORES.some(c => c.slug === slug);

  if (isPair) {
    if (assignees.length !== 2) return false;
    if (assignees[0] === assignees[1]) return false;
  } else {
    if (assignees.length !== 1) return false;
  }

  if (!PEOPLE.includes(task.primary)) return false;
  if (!assignees.includes(task.primary)) return false;

  return true;
}

export function validateWeeklyPlan(plan){
  if (!plan || typeof plan !== "object") return false;
  if (typeof plan.weekSeed !== "string" || !plan.weekSeed) return false;
  if (!plan.days || typeof plan.days !== "object") return false;

  for (const dayKey of DAYS){
    const items = plan.days[dayKey];
    if (!Array.isArray(items)) return false;

    const seen = new Set();
    for (const task of items){
      if (!isValidTaskObject(task)) return false;
      if (seen.has(task.id)) return false;
      seen.add(task.id);
    }
  }

  return true;
}

export function ensureWeeklyPlanForCurrentWeek(){
  const curSeed = weekSeedString();
  const s = loadWeeklyPlanState();

  const valid = !!(s && typeof s === "object" && typeof s.weekSeed === "string" && s.weekSeed === curSeed && validateWeeklyPlan(s));
  if (valid) return s;

  const plan = generateBalancedWeeklyPlan(curSeed);
  if (!validateWeeklyPlan(plan)) {
    throw new Error("Generated weekly plan failed validation.");
  }
  saveWeeklyPlanState(plan);
  return plan;
}

export function cloneTasksArray(arr){
  if (!Array.isArray(arr)) return [];
  return arr.map(t => {
    const o = (t && typeof t === "object") ? { ...t } : t;
    if (o && o.assignees && Array.isArray(o.assignees)) o.assignees = o.assignees.slice();
    return o;
  });
}

export function buildDailyBaseTasks(dayKey){
  try{
    const plan = ensureWeeklyPlanForCurrentWeek();
    const dayTasks = plan && plan.days ? plan.days[dayKey] : null;
    if (Array.isArray(dayTasks) && dayTasks.length){
      return cloneTasksArray(dayTasks);
    }
  } catch (e){
    console.warn("Weekly plan read failed; attempting regenerate.", e);
  }

  try{
    const curSeed = weekSeedString();
    const plan2 = generateBalancedWeeklyPlan(curSeed);
    if (!validateWeeklyPlan(plan2)) {
      throw new Error("Fallback weekly plan failed validation.");
    }
    saveWeeklyPlanState(plan2);
    const dayTasks2 = plan2 && plan2.days ? plan2.days[dayKey] : null;
    if (Array.isArray(dayTasks2)){
      return cloneTasksArray(dayTasks2);
    }
  } catch (e2){
    console.error("Weekly plan generation failed.", e2);
  }

  return [];
}

export function normalizeTwoPersonTask(task){
  if (!task || !Array.isArray(task.assignees)) return task;
  if (task.assignees.length !== 2) return task;

  const a = task.assignees[0];
  const b = task.assignees[1];
  if (a && b && a !== b) return task;

  const seed = hashSeed("pairfix::" + (task.id || ""));
  const pool = seededShuffle(PEOPLE, seed);
  const fixedA = pool[0];
  const fixedB = pool[1] || pool[0];
  return { ...task, assignees: [fixedA, fixedB], primary: fixedB };
}

export function getTasksForDay(dayKey){
  const base = buildDailyBaseTasks(dayKey);
  return base.map(t => normalizeTwoPersonTask(t));
}

export function computePlanMemberTotals(plan){
  const totals = {};
  PEOPLE.forEach(p => totals[p] = 0);
  if (!plan || !plan.days) return totals;

  Object.keys(plan.days).forEach(dayKey => {
    const items = plan.days[dayKey] || [];
    items.forEach(t => {
      if (!t || typeof t !== "object") return;
      const id = String(t.id || "");
      const slug = id.includes("::") ? id.split("::")[1] : "";
      const w = Number(CHORE_WEIGHTS[slug] ?? 0) || 0;
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

export function countPlanChanges(oldPlan, newPlan){
  let changed = 0;
  const days = new Set([...(Object.keys((oldPlan && oldPlan.days) || {})), ...(Object.keys((newPlan && newPlan.days) || {}))]);
  days.forEach(dayKey => {
    const a = (oldPlan && oldPlan.days && oldPlan.days[dayKey]) ? oldPlan.days[dayKey] : [];
    const b = (newPlan && newPlan.days && newPlan.days[dayKey]) ? newPlan.days[dayKey] : [];

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

export function buildPlanSummary(oldPlan, newPlan){
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

export function buildCurrentWeekAudit(){
  const plan = ensureWeeklyPlanForCurrentWeek();
  const totals = computePlanMemberTotals(plan);

  const rows = PEOPLE.map(person => {
    const target = WEEKLY_TARGETS[person] || { min:0, max:0 };
    const load = Number(totals[person] || 0);
    const midpoint = (target.min + target.max) / 2;
    const delta = Math.round((load - midpoint) * 100) / 100;
    const inRange = load >= target.min && load <= target.max;
    return { person, load, target, midpoint, delta, inRange };
  });

  const allInRange = rows.every(r => r.inRange);
  return { plan, rows, allInRange };
}

export function buildSuggestedAdjustments(){
  const audit = buildCurrentWeekAudit();
  const plan = audit.plan;

  const overloaded = audit.rows
    .filter(r => r.delta > 0)
    .sort((a, b) => b.delta - a.delta);

  const underloaded = audit.rows
    .filter(r => r.delta < 0)
    .sort((a, b) => a.delta - b.delta);

  const suggestions = [];
  const used = new Set();

  if (!plan || !plan.days) return { audit, suggestions };

  for (const over of overloaded){
    for (const under of underloaded){
      if (over.person === under.person) continue;

      for (const dayKey of DAYS){
        const items = Array.isArray(plan.days[dayKey]) ? plan.days[dayKey] : [];

        for (const task of items){
          const slug = String((task.id || "")).split("::")[1] || "";
          const assignees = Array.isArray(task.assignees) ? task.assignees : [];

          if (used.has(task.id)) continue;
          if (FIXED_SOLO_CHORES.some(x => x.slug === slug)) continue;
          if (ROTATING_PAIR_CHORES.some(x => x.slug === slug)) continue;
          if (assignees.length !== 1) continue;
          if (task.primary !== over.person) continue;
          if (!PEOPLE.includes(under.person)) continue;

          suggestions.push({
            dayKey,
            slug,
            text: task.text,
            from: over.person,
            to: under.person,
            fromDelta: over.delta,
            toDelta: under.delta
          });

          used.add(task.id);
          if (suggestions.length >= 8) return { audit, suggestions };
          break;
        }
      }
    }
  }

  return { audit, suggestions };
}

export function buildCurrentWeekRepetitionAudit(){
  const plan = ensureWeeklyPlanForCurrentWeek();
  const dayTasks = (plan && plan.days) ? plan.days : {};

  const personDailySlugs = {};
  PEOPLE.forEach(person => {
    personDailySlugs[person] = DAYS.map(dayKey => {
      const items = Array.isArray(dayTasks[dayKey]) ? dayTasks[dayKey] : [];
      return items
        .filter(t => Array.isArray(t.assignees) && t.assignees.includes(person))
        .map(t => String((t.id || "")).split("::")[1] || "")
        .filter(Boolean);
    });
  });

  const streakFindings = [];

  PEOPLE.forEach(person => {
    const rows = personDailySlugs[person];
    const counts = {};
    rows.forEach(slugs => {
      slugs.forEach(slug => {
        counts[slug] = (counts[slug] || 0) + 1;
      });
    });

    Object.keys(counts).forEach(slug => {
      let run = 0;
      let maxRun = 0;
      rows.forEach(slugs => {
        if (slugs.includes(slug)) {
          run++;
          if (run > maxRun) maxRun = run;
        } else {
          run = 0;
        }
      });

      if (maxRun >= 3) {
        streakFindings.push({ person, slug, maxRun, total: counts[slug] });
      }
    });
  });

  const pairCounts = {};
  DAYS.forEach(dayKey => {
    const items = Array.isArray(dayTasks[dayKey]) ? dayTasks[dayKey] : [];
    items.forEach(t => {
      const slug = String((t.id || "")).split("::")[1] || "";
      if (!ROTATING_PAIR_CHORES.some(c => c.slug === slug)) return;
      const assignees = Array.isArray(t.assignees) ? t.assignees.slice().sort() : [];
      if (assignees.length !== 2) return;
      const key = `${slug}::${assignees.join("+")}`;
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });
  });

  const repeatedPairs = Object.keys(pairCounts)
    .filter(key => pairCounts[key] >= 3)
    .map(key => ({ key, count: pairCounts[key] }));

  return {
    plan,
    streakFindings,
    repeatedPairs,
    hasIssues: streakFindings.length > 0 || repeatedPairs.length > 0
  };
}

export function slugLabel(slug){
  const found = ALL_CHORE_LABELS.find(x => x.slug === slug);
  return found ? found.text : slug;
}
