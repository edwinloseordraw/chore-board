export const DAYS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
export const PEOPLE = ["Dad","Mom","Ethan","Celo"];
export const PARENTS = ["Dad", "Mom"];
export const KIDS = ["Ethan", "Celo"];

// Core daily chores (rotate fairly, 2-person)
export const ROTATING_PAIR_CHORES = [
  { slug: "vacuum",   text: "Vacuum" },
  { slug: "dishes",   text: "Wash dishes" },
  { slug: "trash",    text: "Take out trash" },
  { slug: "feedDogs", text: "Feed dogs" }
];

// Solo chores that rotate across all people
export const ROTATING_SOLO_CHORES = [
  { slug: "counters",    text: "Wipe kitchen counters",   when: "all" },
  { slug: "dining",      text: "Wipe dining table",       when: "all" },
  { slug: "mop",         text: "Mop",                     when: "all" },
  { slug: "dust",        text: "Dust",                    when: "all" },
  { slug: "cabinets",    text: "Wipe down cabinets",      when: "all" },
  { slug: "dogPoop",     text: "Dog poop",                when: "all" }
];

// Chores fixed to a specific person
export const FIXED_SOLO_CHORES = [
  { slug: "prepBackpack", text: "Reminder: Prep backpack for tomorrow", person: "Celo", when: "weekdays" },
  { slug: "appleWatch",   text: "Reminder: Where's your Apple Watch?",  person: "Celo", when: "weekdays" },
  { slug: "read20",       text: "Read for 20 min",                      person: "Celo", when: "monfri" },
  { slug: "brushHarvey",  text: "Brush Harvey",                         person: "Dad",  when: "monwed" },
  { slug: "brushHarvey",  text: "Brush Harvey",                         person: "Ethan",when: "fri" },
  { slug: "checkAgenda",  text: "Reminder: Check and sign Celo's agenda and folders", person: "Dad", when: "weekdays" }
];

// Fixed weekly cadence — stable week-to-week, balanced against weight system
export const FIXED_WEEKLY_CADENCE = {
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

export const WEEKLY_TARGETS = {
  Dad:   { min:20, max:24 },
  Mom:   { min:18, max:22 },
  Ethan: { min:14, max:18 },
  Celo:  { min: 8, max:12 }
};

export const WEEKLY_CHORES = [
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

export const BIWEEKLY_CHORES = [
  "Sweep the outside area",
  "Wipe cabinet fronts & handles",
  "Clean pet bedding (if applicable)",
  "Wipe window sills & tracks",
  "Wipe walls & doors",
  "Clean windows (inside)"
];

export const MONTHLY_CHORES = [
  "Clean baseboards",
  "Clean light switches & door handles",
  "Deep clean bathrooms (grout, tub edges, behind toilet)",
  "Clean behind large appliances (fridge, stove if movable)",
  "Wash blankets & throws",
  "Wash mattress protectors",
  "Clean oven (light or self-clean)",
  "Clean front door",
  "Spot clean patio or porch"
];
