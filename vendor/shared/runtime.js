// contracts/parameters.json
var parameters_default = {
  $comment: "The parameter registry. One entry per control the engine exposes. Read by the UI (frontend/lib/contract.ts), by PHP (App\\Support\\Project\\Contract) and, from Night 6, by bckgrnd-msc-mcp. Add a parameter here before adding its control. See contracts/README.md. `taper` says how a control should spread the range under the hand: linear, log (frequency-like and time-like), db (gain heard in decibels), or the parameter's own engine curve.",
  contract: "bckgrnd-msc/parameters",
  version: 1,
  stems: [
    "kick",
    "clap",
    "hats",
    "bass",
    "stab",
    "lead",
    "pad",
    "arp"
  ],
  parameters: [
    {
      id: "transport.bpm",
      label: "Tempo",
      kind: "continuous",
      min: 40,
      max: 200,
      step: 1,
      control: {
        min: 60,
        max: 180
      },
      default: "track",
      unit: "bpm",
      taper: "linear",
      scope: "project",
      engine: "bpm"
    },
    {
      id: "transport.swing",
      label: "Swing",
      kind: "continuous",
      min: 0,
      max: 1,
      step: 0.01,
      default: "track",
      unit: "ratio",
      taper: "linear",
      scope: "project",
      engine: "swing"
    },
    {
      id: "master.level",
      label: "Master",
      kind: "continuous",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.78,
      unit: "gain",
      taper: "db",
      scope: "project",
      engine: "master"
    },
    {
      id: "fx.low",
      label: "Low",
      kind: "continuous",
      min: 0,
      max: 1.4,
      step: 0.01,
      default: 1,
      unit: "gain",
      taper: "db",
      scope: "project",
      engine: "bands"
    },
    {
      id: "fx.mid",
      label: "Mid",
      kind: "continuous",
      min: 0,
      max: 1.4,
      step: 0.01,
      default: 1,
      unit: "gain",
      taper: "db",
      scope: "project",
      engine: "bands"
    },
    {
      id: "fx.high",
      label: "High",
      kind: "continuous",
      min: 0,
      max: 1.4,
      step: 0.01,
      default: 1,
      unit: "gain",
      taper: "db",
      scope: "project",
      engine: "bands"
    },
    {
      id: "fx.filter",
      label: "Filter",
      kind: "continuous",
      min: 0,
      max: 1,
      step: 0.01,
      default: 1,
      unit: "ratio",
      taper: "engine",
      scope: "project",
      engine: "filter"
    },
    {
      id: "fx.stereo",
      label: "Stereo",
      kind: "continuous",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.5,
      unit: "balance",
      taper: "linear",
      scope: "project",
      engine: "stereoBalance"
    },
    {
      id: "fx.filterQ",
      label: "Resonance",
      kind: "continuous",
      min: 0.5,
      max: 6,
      step: 0.01,
      default: 0.85,
      unit: "q",
      taper: "log",
      scope: "project",
      engine: "filterQ"
    },
    {
      id: "fx.echoFeedback",
      label: "Feedback",
      kind: "continuous",
      min: 0,
      max: 0.9,
      step: 0.01,
      default: 0.3,
      unit: "ratio",
      taper: "linear",
      scope: "project",
      engine: "echoFeedback"
    },
    {
      id: "fx.echoReturn",
      label: "Return",
      kind: "continuous",
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.24,
      unit: "ratio",
      taper: "linear",
      scope: "project",
      engine: "echoReturn"
    },
    {
      id: "fx.reverbMix",
      label: "Room",
      kind: "continuous",
      min: 0,
      max: 0.5,
      step: 5e-3,
      default: 0.07,
      unit: "ratio",
      taper: "linear",
      scope: "project",
      engine: "reverbMix"
    },
    {
      id: "fx.reverbDecay",
      label: "Decay",
      kind: "continuous",
      min: 0.2,
      max: 2.5,
      step: 0.01,
      default: 0.32,
      unit: "seconds",
      taper: "log",
      scope: "project",
      engine: "reverbDecay"
    },
    {
      id: "fx.width",
      label: "Width",
      kind: "continuous",
      min: 0,
      max: 1.5,
      step: 0.01,
      default: 1,
      unit: "ratio",
      taper: "linear",
      scope: "project",
      engine: "width"
    },
    {
      id: "fx.echoTime",
      label: "Echo time",
      kind: "enum",
      options: [
        {
          value: 0,
          label: "Off"
        },
        {
          value: 0.25,
          label: "1/16"
        },
        {
          value: 0.3333333333333333,
          label: "1/8T"
        },
        {
          value: 0.5,
          label: "1/8"
        },
        {
          value: 0.75,
          label: "1/8."
        },
        {
          value: 1,
          label: "1/4"
        },
        {
          value: 1.5,
          label: "1/4."
        }
      ],
      default: 0.75,
      unit: "beats",
      scope: "project",
      engine: "echoTime"
    },
    {
      id: "performance.loopBars",
      label: "Loop",
      kind: "enum",
      options: [
        {
          value: 0,
          label: "Off"
        },
        {
          value: 1,
          label: "1"
        },
        {
          value: 2,
          label: "2"
        },
        {
          value: 4,
          label: "4"
        },
        {
          value: 8,
          label: "8"
        },
        {
          value: 16,
          label: "16"
        }
      ],
      default: 0,
      unit: "bars",
      scope: "performance",
      engine: "loop"
    },
    {
      id: "performance.echoThrow",
      label: "Echo throw",
      kind: "toggle",
      default: false,
      unit: "on",
      scope: "performance",
      engine: "echo"
    }
  ],
  stemParameters: [
    {
      id: "volume",
      label: "Volume",
      kind: "continuous",
      min: 0,
      max: 1,
      step: 0.01,
      default: "track",
      unit: "gain",
      taper: "linear",
      scope: "project",
      engine: "volume"
    },
    {
      id: "send",
      label: "Echo send",
      kind: "continuous",
      min: 0,
      max: 1,
      step: 0.01,
      default: "stem",
      defaults: {
        kick: 0,
        clap: 0.05,
        hats: 0.06,
        bass: 0,
        stab: 0.16,
        lead: 0.3,
        pad: 0.2,
        arp: 0.28
      },
      unit: "ratio",
      taper: "linear",
      scope: "project",
      engine: "send"
    },
    {
      id: "muted",
      label: "Cut",
      kind: "toggle",
      default: false,
      unit: "on",
      scope: "project",
      engine: "mute"
    },
    {
      id: "solo",
      label: "Solo",
      kind: "toggle",
      default: false,
      unit: "on",
      scope: "project",
      engine: "solo"
    }
  ]
};

// contracts/scenes.json
var scenes_default = {
  $comment: "Scene slots and factory recipes, read by frontend/lib/contract.ts, App\\Support\\Project\\Contract and engine-core/tests. sceneVector is both the list of parameters a scene holds and the order of indices 32..43 of the engine's scene vector (docs/NIGHT3_PROTOCOL.md). A recipe is relative to the track: scale multiplies the track's own level for that stem, cut mutes it, and a stem not listed keeps the track's level. Params not listed take their registry default.",
  contract: "bckgrnd-msc/scenes",
  version: 1,
  slots: ["full", "sparse", "build", "drop"],
  sceneVector: [
    "fx.filter",
    "fx.filterQ",
    "fx.low",
    "fx.mid",
    "fx.high",
    "fx.echoTime",
    "fx.echoFeedback",
    "fx.echoReturn",
    "fx.reverbMix",
    "fx.reverbDecay",
    "fx.width",
    "fx.stereo"
  ],
  factory: [
    {
      id: "full",
      name: "Full",
      description: "The track as written: every part at its own level, effects at their defaults.",
      stems: {},
      params: {}
    },
    {
      id: "sparse",
      name: "Sparse",
      description: "The breakdown. Hats, bass and pad carry it; the kick, clap and top parts step out.",
      stems: {
        kick: { cut: true },
        clap: { cut: true },
        stab: { cut: true },
        lead: { cut: true },
        arp: { cut: true },
        pad: { scale: 1 },
        bass: { scale: 0.85 }
      },
      params: {
        "fx.reverbMix": 0.14
      }
    },
    {
      id: "build",
      name: "Build",
      description: "Reduce the bass, keep the hats, and darken the mix before the return.",
      stems: {
        bass: { scale: 0.45 },
        kick: { scale: 0.75 },
        lead: { scale: 0.7 },
        stab: { scale: 0.8 },
        pad: { scale: 0.9 }
      },
      params: {
        "fx.filter": 0.62,
        "fx.filterQ": 1.6,
        "fx.low": 0.7,
        "fx.echoFeedback": 0.42,
        "fx.reverbMix": 0.12
      }
    },
    {
      id: "drop",
      name: "Drop",
      description: "The return. Kick and bass back at full, the filter open, the lead and stab back in, the pad tucked under.",
      stems: {
        pad: { scale: 0.75 },
        arp: { scale: 0.85 }
      },
      params: {
        "fx.filter": 1,
        "fx.echoFeedback": 0.25,
        "fx.reverbMix": 0.05
      }
    }
  ]
};

// contracts/patterns.json
var patterns_default = {
  $comment: "The pattern registry: which lanes a project may override, how musical positions are measured, and the limits every reader enforces. Read by frontend/lib/patterns.ts and App\\Support\\Project\\Patterns, and by the engine's tests for the lane order. See contracts/README.md, Patterns.",
  contract: "bckgrnd-msc/patterns",
  version: 1,
  unit: "sixteenth",
  steps: 256,
  stepsPerBar: 16,
  maxEvents: 256,
  maxNotes: 6,
  pitch: { min: 0, max: 127 },
  lanes: [
    { id: "kick", stem: "kick", kind: "drum", label: "Kick", prefix: "k", engine: 0, editable: true, velocity: 0.95 },
    { id: "clap", stem: "clap", kind: "drum", label: "Clap", prefix: "c", engine: 1, editable: true, velocity: 0.85 },
    { id: "hat", stem: "hats", kind: "drum", label: "Closed hat", prefix: "h", engine: 2, editable: true, velocity: 0.6 },
    { id: "hatOpen", stem: "hats", kind: "drum", label: "Open hat", prefix: "o", engine: 3, editable: true, velocity: 0.55 },
    { id: "bass", stem: "bass", kind: "notes", label: "Bass", prefix: "b", engine: 4, editable: true, velocity: 0.9, range: [24, 60] },
    { id: "stab", stem: "stab", kind: "notes", label: "Stab", prefix: "s", engine: 5, editable: false, velocity: 0.6, range: [36, 96] },
    { id: "lead", stem: "lead", kind: "notes", label: "Lead", prefix: "l", engine: 6, editable: true, velocity: 0.7, range: [48, 96] },
    { id: "pad", stem: "pad", kind: "notes", label: "Pad", prefix: "p", engine: 7, editable: false, velocity: 0.5, range: [36, 96] },
    { id: "arp", stem: "arp", kind: "notes", label: "Arp", prefix: "a", engine: 8, editable: false, velocity: 0.5, range: [48, 108] }
  ],
  originKinds: ["edit", "paste", "humanize", "variation", "scene"]
};

// frontend/lib/patterns.ts
var STEPS = patterns_default.steps;
var STEPS_PER_BAR = patterns_default.stepsPerBar;
var BARS = STEPS / STEPS_PER_BAR;
var MAX_NOTES = patterns_default.maxNotes;
var LANES = patterns_default.lanes;
var LANE_IDS = LANES.map((l) => l.id);
var ORIGIN_KINDS = patterns_default.originKinds;
function laneSpec(id) {
  const spec = LANES.find((l) => l.id === id);
  if (!spec) throw new Error(`unknown lane ${id}`);
  return spec;
}
function resolvedArrangement(source, patterns) {
  const out = structuredClone(source);
  for (const lane of LANE_IDS) {
    const p = patterns[lane];
    if (!p) continue;
    if (laneSpec(lane).kind === "drum") {
      const hits = Array(STEPS).fill(0);
      for (const e of p.events) hits[e.step] = e.vel;
      out[lane] = hits;
    } else {
      const notes = Array(STEPS).fill(null);
      for (const e of p.events) notes[e.step] = { notes: [...e.notes], len: e.len, vel: e.vel, accent: e.accent };
      out[lane] = notes;
    }
  }
  return out;
}
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isNum = (v) => typeof v === "number" && Number.isFinite(v);
var ID = /^[A-Za-z0-9_-]{1,64}$/;
var EVENT_ID = /^[A-Za-z0-9_-]{1,24}$/;
var isEmptyMap = (v) => isObj(v) && Object.keys(v).length === 0 || Array.isArray(v) && v.length === 0;
function fail(where, why) {
  throw new Error(`Patterns are malformed: ${where}: ${why}`);
}
function readPattern(raw, lane, where) {
  const spec = LANES.find((l) => l.id === lane);
  if (!spec) fail(where, `unknown lane ${JSON.stringify(lane)}`);
  const at = `${where} ${lane}`;
  if (!isObj(raw)) fail(at, "expected an object");
  const p = raw;
  const allowed = ["id", "revision", "lane", "length", "events", "origin"];
  const extra = Object.keys(p).filter((k) => !allowed.includes(k));
  if (extra.length) fail(at, `unknown keys ${JSON.stringify(extra)}`);
  for (const k of ["id", "revision", "lane", "length", "events"]) if (!(k in p)) fail(at, `missing ${k}`);
  if (typeof p.id !== "string" || !ID.test(p.id)) fail(at, "id must be 1 to 64 letters, digits, - or _");
  if (typeof p.revision !== "number" || !Number.isInteger(p.revision) || p.revision < 1) {
    fail(at, "revision must be a whole number of at least 1");
  }
  if (p.lane !== lane) fail(at, `is stored under ${lane} but says ${JSON.stringify(p.lane)}`);
  if (p.length !== STEPS) fail(at, `length must be ${STEPS}`);
  if (!Array.isArray(p.events)) fail(at, "events must be a list");
  if (p.events.length > patterns_default.maxEvents) fail(at, `more than ${patterns_default.maxEvents} events`);
  const seenIds = /* @__PURE__ */ new Set();
  const seenSteps = /* @__PURE__ */ new Set();
  const events = p.events.map((raw2, i) => {
    const e = raw2;
    const where2 = `${at} event ${i}`;
    if (!isObj(raw2)) fail(where2, "expected an object");
    const keys = spec.kind === "drum" ? ["id", "step", "vel"] : ["id", "step", "notes", "len", "vel", "accent"];
    const present = Object.keys(e);
    if (present.length !== keys.length || !keys.every((k) => present.includes(k))) {
      fail(where2, `must have exactly ${keys.join(", ")}`);
    }
    if (typeof e.id !== "string" || !EVENT_ID.test(e.id)) fail(where2, "id must be 1 to 24 letters, digits, - or _");
    if (seenIds.has(e.id)) fail(where2, `repeats id ${e.id}`);
    seenIds.add(e.id);
    if (typeof e.step !== "number" || !Number.isInteger(e.step) || e.step < 0 || e.step >= STEPS) {
      fail(where2, `step must be a whole number from 0 to ${STEPS - 1}`);
    }
    if (seenSteps.has(e.step)) fail(where2, `a second event on step ${e.step}`);
    seenSteps.add(e.step);
    if (!isNum(e.vel) || e.vel <= 0 || e.vel > 1) fail(where2, "vel must be above 0 and at most 1");
    if (spec.kind === "drum") return { id: e.id, step: e.step, vel: e.vel };
    const notes = e.notes;
    if (!Array.isArray(notes) || notes.length < 1 || notes.length > MAX_NOTES) {
      fail(where2, `notes must hold 1 to ${MAX_NOTES} pitches`);
    }
    for (const n of notes) {
      if (!isNum(n) || n < patterns_default.pitch.min || n > patterns_default.pitch.max) {
        fail(where2, `every pitch must be from ${patterns_default.pitch.min} to ${patterns_default.pitch.max}`);
      }
    }
    if (!isNum(e.len) || e.len <= 0 || e.step + e.len > STEPS) {
      fail(where2, `len must be above 0 and end by step ${STEPS}`);
    }
    if (typeof e.accent !== "boolean") fail(where2, "accent must be true or false");
    return {
      id: e.id,
      step: e.step,
      notes: [...notes],
      len: e.len,
      vel: e.vel,
      accent: e.accent
    };
  });
  events.sort((a, b) => a.step - b.step);
  const out = { id: p.id, revision: p.revision, lane, length: STEPS, events };
  if ("origin" in p) {
    const o = p.origin;
    if (!isObj(o) || typeof o.kind !== "string" || !ORIGIN_KINDS.includes(o.kind)) {
      fail(at, `origin must be an object whose kind is one of ${ORIGIN_KINDS.join(", ")}`);
    }
    out.origin = JSON.parse(JSON.stringify(o));
  }
  return out;
}
function readPatterns(raw, where = "patterns") {
  if (raw === void 0 || isEmptyMap(raw)) return {};
  if (!isObj(raw)) fail(where, "expected an object of lanes");
  const out = {};
  for (const key of Object.keys(raw)) {
    if (!LANE_IDS.includes(key)) fail(where, `unknown lane ${JSON.stringify(key)}`);
  }
  for (const lane of LANE_IDS) {
    if (lane in raw) out[lane] = readPattern(raw[lane], lane, where);
  }
  return out;
}
function readScenePatterns(raw, slot) {
  const where = `slot ${slot} patterns`;
  if (raw === void 0 || isEmptyMap(raw)) return {};
  if (!isObj(raw)) fail(where, "expected an object of lanes");
  const out = {};
  for (const key of Object.keys(raw)) {
    if (!LANE_IDS.includes(key)) fail(where, `unknown lane ${JSON.stringify(key)}`);
  }
  for (const lane of LANE_IDS) {
    if (!(lane in raw)) continue;
    const v = raw[lane];
    if (isObj(v) && "factory" in v) {
      if (Object.keys(v).length !== 1 || v.factory !== true) fail(`${where} ${lane}`, 'a factory reference is exactly {"factory": true}');
      out[lane] = { factory: true };
    } else {
      out[lane] = readPattern(v, lane, where);
    }
  }
  return out;
}
function readLocks(raw) {
  const where = "locks";
  if (raw === void 0) return { lanes: [], events: {} };
  if (!isObj(raw)) fail(where, "expected an object with lanes and events");
  const r = raw;
  const keys = Object.keys(r);
  if (keys.length !== 2 || !keys.includes("lanes") || !keys.includes("events")) fail(where, "must have exactly lanes and events");
  if (!Array.isArray(r.lanes)) fail(where, "lanes must be a list");
  for (const l of r.lanes) if (!LANE_IDS.includes(l)) fail(where, `unknown lane ${JSON.stringify(l)}`);
  const lanes = LANE_IDS.filter((l) => r.lanes.includes(l));
  if (!isEmptyMap(r.events) && !isObj(r.events)) fail(where, "events must be an object of lanes");
  const events = {};
  const given = isObj(r.events) ? r.events : {};
  for (const key of Object.keys(given)) if (!LANE_IDS.includes(key)) fail(where, `unknown lane ${JSON.stringify(key)}`);
  for (const lane of LANE_IDS) {
    if (!(lane in given)) continue;
    const ids = given[lane];
    if (!Array.isArray(ids)) fail(where, `events ${lane} must be a list`);
    for (const id of ids) if (typeof id !== "string" || !EVENT_ID.test(id)) fail(where, `events ${lane} has a bad id`);
    const unique = [...new Set(ids)].sort();
    if (unique.length) events[lane] = unique;
  }
  return { lanes, events };
}
var NOTE_WIDTH = 5 + MAX_NOTES;
function compileLanes(lanes) {
  let size = 1;
  for (const p of lanes) size += 3 + (laneSpec(p.lane).kind === "drum" ? STEPS : p.events.length * NOTE_WIDTH);
  const out = new Float32Array(size);
  let k = 0;
  out[k++] = lanes.length;
  for (const p of lanes) {
    const spec = laneSpec(p.lane);
    out[k++] = spec.engine;
    if (spec.kind === "drum") {
      out[k++] = 0;
      out[k++] = STEPS;
      for (const e of p.events) out[k + e.step] = e.vel;
      k += STEPS;
    } else {
      out[k++] = 1;
      out[k++] = p.events.length;
      for (const raw of p.events) {
        const e = raw;
        out[k] = e.step;
        out[k + 1] = e.len;
        out[k + 2] = e.vel;
        out[k + 3] = e.accent ? 1 : 0;
        out[k + 4] = e.notes.length;
        for (let i = 0; i < MAX_NOTES; i += 1) out[k + 5 + i] = e.notes[i] ?? -1;
        k += NOTE_WIDTH;
      }
    }
  }
  return out;
}

// frontend/lib/contract.ts
var PROJECT_FORMAT = "bckgrnd-msc/project";
var PROJECT_VERSION = 3;
var PARAMETERS = parameters_default.parameters;
var STEMS = parameters_default.stems;
var byId = new Map(PARAMETERS.map((p) => [p.id, p]));
function param(id) {
  const spec = byId.get(id);
  if (!spec) throw new Error(`unknown parameter: ${id}`);
  return spec;
}
var STEM_PARAMETERS = parameters_default.stemParameters;
function stemParam(id) {
  const spec = STEM_PARAMETERS.find((p) => p.id === id);
  if (!spec) throw new Error(`unknown stem parameter: ${id}`);
  return spec;
}
function defaultSend(stem) {
  return stemParam("send").defaults?.[stem] ?? 0;
}
function fixedDefault(id) {
  const d = param(id).default;
  if (d === "track") throw new Error(`${id} defaults to the track's own value`);
  return Number(d);
}
function trackDefault(id, track) {
  const d = param(id).default;
  if (d !== "track") return Number(d);
  if (id === "transport.bpm") return track.bpm;
  if (id === "transport.swing") return track.swing;
  throw new Error(`no track default for ${id}`);
}
var SCENE_SLOTS = ["full", "sparse", "build", "drop"];
var SCENE_PARAMS = scenes_default.sceneVector;
var FACTORY_SCENES = scenes_default.factory;
var PROJECT_PARAMS = PARAMETERS.filter((p) => p.scope === "project").map((p) => p.id);
function factoryScene(track, recipeId, slot, revision = 1) {
  const recipe = FACTORY_SCENES.find((r) => r.id === recipeId);
  if (!recipe) throw new Error(`No factory scene ${recipeId}`);
  const params = {};
  for (const id of SCENE_PARAMS) params[id] = recipe.params[id] ?? fixedDefault(id);
  const stems = {};
  for (const id of STEMS) {
    const rule = recipe.stems[id] ?? {};
    const level = track.mix[id] ?? 0.8;
    stems[id] = {
      volume: Math.max(0, Math.min(1, level * (rule.scale ?? 1))),
      send: defaultSend(id),
      muted: Boolean(rule.cut ?? false),
      solo: false
    };
  }
  return { slot, name: recipe.name, factory: recipeId, revision, params, stems, patterns: {} };
}
function factoryScenes(track) {
  return { slots: SCENE_SLOTS.map((slot) => factoryScene(track, slot, slot)) };
}
function projectFromTrack(track) {
  const params = {};
  for (const id of PROJECT_PARAMS) params[id] = trackDefault(id, track);
  const stems = {};
  for (const id of STEMS) {
    stems[id] = { volume: track.mix[id] ?? 0.8, send: defaultSend(id), muted: false, solo: false };
  }
  return {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    name: track.name,
    trackId: track.id,
    params,
    stems,
    patterns: {},
    locks: { lanes: [], events: {} },
    scenes: factoryScenes(track)
  };
}
function inRange(spec, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (spec.kind === "enum") return (spec.options ?? []).some((o) => Math.abs(o.value - value) < 1e-9);
  return (spec.min ?? -Infinity) <= value && value <= (spec.max ?? Infinity);
}
var sameKeys = (o, keys) => {
  const k = Object.keys(o);
  return k.length === keys.length && k.every((key, i) => key === keys[i]);
};
var sameKeySet = (o, keys) => {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((key) => k.includes(key));
};
function readScenes(raw, version = PROJECT_VERSION) {
  const fail2 = (why) => {
    throw new Error(`Scenes are malformed: ${why}`);
  };
  if (!isObj2(raw) || !sameKeys(raw, ["slots"])) fail2('expected an object with only "slots"');
  const slots = raw.slots;
  if (!Array.isArray(slots) || slots.length !== SCENE_SLOTS.length) fail2(`expected ${SCENE_SLOTS.length} slots`);
  const keys = ["slot", "name", "factory", "revision", "params", "stems", "patterns"];
  const factoryIds = FACTORY_SCENES.map((r) => r.id);
  return {
    slots: slots.map((scene, i) => {
      const slot = SCENE_SLOTS[i];
      if (!isObj2(scene)) fail2(`slot ${slot} is not an object`);
      const sc = scene;
      const present = Object.keys(sc);
      const extra = present.filter((k) => !keys.includes(k));
      const missing = keys.filter((k) => !present.includes(k));
      if (extra.length || missing.length) {
        fail2(`slot ${slot} has keys ${JSON.stringify(extra)} and lacks ${JSON.stringify(missing)}`);
      }
      if (sc.slot !== slot) fail2(`slot ${i} should be ${slot}`);
      if (typeof sc.name !== "string" || sc.name === "" || [...sc.name].length > 40) {
        fail2(`slot ${slot} needs a name of 1 to 40 characters`);
      }
      if (typeof sc.factory !== "string" || !factoryIds.includes(sc.factory)) {
        fail2(`slot ${slot} names an unknown factory scene`);
      }
      if (typeof sc.revision !== "number" || !Number.isInteger(sc.revision) || sc.revision < 1) {
        fail2(`slot ${slot} needs a whole-number revision of at least 1`);
      }
      const pats = sc.patterns;
      const emptyPatterns = isObj2(pats) && Object.keys(pats).length === 0 || Array.isArray(pats) && pats.length === 0;
      if (version < 3 && !emptyPatterns) fail2(`slot ${slot} refers to patterns, which this version does not support`);
      const patterns = version < 3 ? {} : readScenePatterns(pats, slot);
      if (!isObj2(sc.params) || !sameKeySet(sc.params, SCENE_PARAMS)) {
        fail2(`slot ${slot} must hold exactly the scene parameters`);
      }
      const params = {};
      for (const id of SCENE_PARAMS) {
        const value = sc.params[id];
        if (!inRange(param(id), value)) fail2(`slot ${slot} has ${id} out of range`);
        params[id] = value;
      }
      if (!isObj2(sc.stems) || !sameKeys(sc.stems, STEMS)) fail2(`slot ${slot} must hold every stem, in order`);
      const stems = {};
      for (const id of STEMS) {
        const entry = sc.stems[id];
        if (!isObj2(entry) || !sameKeys(entry, ["volume", "send", "muted", "solo"])) {
          fail2(`slot ${slot} stem ${id} must have volume, send, muted and solo`);
        }
        const e = entry;
        for (const level of ["volume", "send"]) {
          const v = e[level];
          if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
            fail2(`slot ${slot} stem ${id} ${level} must be a number from 0 to 1`);
          }
        }
        if (typeof e.muted !== "boolean" || typeof e.solo !== "boolean") {
          fail2(`slot ${slot} stem ${id} muted and solo must be true or false`);
        }
        stems[id] = { volume: e.volume, send: e.send, muted: e.muted, solo: e.solo };
      }
      return {
        slot,
        name: sc.name,
        factory: sc.factory,
        revision: sc.revision,
        params,
        stems,
        patterns
      };
    })
  };
}
function clamp(spec, value, fallback) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  if (spec.kind === "enum" && spec.options) {
    return spec.options.reduce(
      (best, o) => Math.abs(o.value - n) < Math.abs(best - n) ? o.value : best,
      spec.options[0].value
    );
  }
  return Math.min(spec.max ?? n, Math.max(spec.min ?? n, n));
}
var isObj2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isEmptyMap2 = (v) => isObj2(v) && Object.keys(v).length === 0 || Array.isArray(v) && v.length === 0;
function migrateProject(raw, lookup) {
  if (!isObj2(raw)) throw new Error("A project must be a JSON object.");
  let doc = raw;
  if (!("format" in doc)) doc = fromLegacyPreset(doc);
  if (doc.format !== PROJECT_FORMAT) {
    throw new Error(`Not a bckgrnd-msc project: format is ${JSON.stringify(doc.format)}`);
  }
  const version = doc.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error("Project version is missing or invalid.");
  }
  if (version > PROJECT_VERSION) {
    throw new Error(
      `Project version ${version} is newer than this app understands (${PROJECT_VERSION}).`
    );
  }
  if (version === 1 && "scenes" in doc) throw new Error("A version 1 project cannot carry scenes.");
  if (version >= 2 && !("scenes" in doc)) throw new Error(`Scenes are missing from a version ${version} project.`);
  if (version < 3 && "locks" in doc) throw new Error(`A version ${version} project cannot carry locks.`);
  if (version < 3 && "patterns" in doc && !isEmptyMap2(doc.patterns)) {
    throw new Error(`A version ${version} project cannot carry patterns.`);
  }
  const track = lookup(String(doc.trackId ?? ""));
  if (!track) throw new Error(`Unknown track: ${String(doc.trackId ?? "")}`);
  const fresh = projectFromTrack(track);
  const givenParams = isObj2(doc.params) ? doc.params : {};
  const params = {};
  for (const id of PROJECT_PARAMS) params[id] = clamp(param(id), givenParams[id], fresh.params[id]);
  const givenStems = isObj2(doc.stems) ? doc.stems : {};
  const stems = {};
  for (const id of STEMS) {
    const g = isObj2(givenStems[id]) ? givenStems[id] : {};
    const volume = typeof g.volume === "number" ? g.volume : fresh.stems[id].volume;
    const send = typeof g.send === "number" && Number.isFinite(g.send) ? g.send : fresh.stems[id].send;
    stems[id] = {
      volume: Math.min(1, Math.max(0, volume)),
      send: Math.min(1, Math.max(0, send)),
      muted: Boolean(g.muted ?? false),
      solo: Boolean(g.solo ?? false)
    };
  }
  const patterns = version >= 3 ? readPatterns(doc.patterns) : {};
  const locks = version >= 3 ? readLocks(doc.locks) : { lanes: [], events: {} };
  const scenes = "scenes" in doc ? readScenes(doc.scenes, version) : fresh.scenes;
  const out = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    name: typeof doc.name === "string" && doc.name !== "" ? doc.name : track.name,
    trackId: track.id,
    params,
    stems,
    patterns,
    locks,
    scenes
  };
  if (typeof doc.id === "string") out.id = doc.id;
  if (typeof doc.createdAt === "string") out.createdAt = doc.createdAt;
  if (typeof doc.updatedAt === "string") out.updatedAt = doc.updatedAt;
  return {
    format: out.format,
    version: out.version,
    ...out.id !== void 0 ? { id: out.id } : {},
    name: out.name,
    ...out.createdAt !== void 0 ? { createdAt: out.createdAt } : {},
    ...out.updatedAt !== void 0 ? { updatedAt: out.updatedAt } : {},
    trackId: out.trackId,
    params: out.params,
    stems: out.stems,
    patterns: out.patterns,
    locks: out.locks,
    scenes: out.scenes
  };
}
function fromLegacyPreset(preset) {
  const mix = isObj2(preset.mix) ? preset.mix : {};
  const muted = isObj2(preset.muted) ? preset.muted : {};
  const solo = isObj2(preset.solo) ? preset.solo : {};
  const stems = {};
  for (const id of STEMS) {
    const entry = {};
    if (id in mix) entry.volume = Number(mix[id]);
    if (id in muted) entry.muted = Boolean(muted[id]);
    if (id in solo) entry.solo = Boolean(solo[id]);
    stems[id] = entry;
  }
  const params = {};
  if (preset.bpm !== void 0) params["transport.bpm"] = Number(preset.bpm);
  if (preset.swing !== void 0) params["transport.swing"] = Number(preset.swing);
  return {
    format: PROJECT_FORMAT,
    version: 1,
    ...preset.id !== void 0 ? { id: String(preset.id) } : {},
    name: typeof preset.name === "string" ? preset.name : "",
    ...preset.updatedAt !== void 0 ? { updatedAt: String(preset.updatedAt) } : {},
    trackId: String(preset.trackId ?? ""),
    params,
    stems,
    patterns: {}
  };
}

// frontend/lib/snapshot.ts
var RENDERER_VERSION = "project-renderer-1";
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, "en")).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
async function contentHash(value) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function snapshotOf(project, source, id, revision) {
  const copy = structuredClone(project);
  return {
    format: "bckgrnd-msc/snapshot",
    version: 1,
    id,
    revision,
    savedAt: (/* @__PURE__ */ new Date()).toISOString(),
    renderer: RENDERER_VERSION,
    source: { trackId: source.id, sha256: await contentHash(source) },
    project: copy
  };
}
async function readSnapshot(raw, tracks, source) {
  const doc = raw;
  if (!doc || typeof doc !== "object") throw new Error("A project file must be a JSON object.");
  const wrapped = doc.format === "bckgrnd-msc/snapshot";
  if (wrapped) {
    const allowed = ["format", "version", "id", "revision", "savedAt", "renderer", "source", "project"];
    if (Object.keys(doc).some((key) => !allowed.includes(key)) || typeof doc.savedAt !== "string" || !Number.isFinite(Date.parse(doc.savedAt))) throw new Error("Malformed snapshot metadata.");
    if (!doc.source || Object.keys(doc.source).sort().join(",") !== "sha256,trackId" || !/^[a-f0-9]{64}$/.test(doc.source.sha256)) throw new Error("Malformed source dependency.");
    if (doc.version !== 1) throw new Error(`Unsupported snapshot version: ${doc.version}. Keep the original file and use a compatible app.`);
    if (doc.renderer !== RENDERER_VERSION) throw new Error(`Unsupported renderer: ${doc.renderer}.`);
    if (typeof doc.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(doc.id) || !Number.isSafeInteger(doc.revision) || doc.revision < 1) throw new Error("Invalid project identity or revision.");
    if (doc.project?.version !== PROJECT_VERSION) throw new Error("Unsupported musical project version in snapshot.");
  }
  const project = migrateProject(wrapped ? doc.project : raw, (id) => tracks.find((t) => t.id === id));
  if (wrapped && canonical(project) !== canonical(doc.project)) throw new Error("Project contains unsupported fields or invalid parameter values.");
  const arranged = await source(project.trackId);
  const hash = await contentHash(arranged);
  if (wrapped && (doc.source?.trackId !== project.trackId || doc.source.sha256 !== hash)) throw new Error(`Source library mismatch for ${project.trackId}. Install the matching library before opening or rendering this project.`);
  return wrapped ? structuredClone(doc) : snapshotOf(project, arranged, crypto.randomUUID(), 1);
}

// frontend/lib/scenes.ts
var SCENE_VECTOR_LENGTH = STEMS.length * 4 + SCENE_PARAMS.length;
function sceneVector(mix) {
  const out = new Float32Array(SCENE_VECTOR_LENGTH);
  STEMS.forEach((id, i) => {
    const s = mix.stems[id];
    out[4 * i] = s.volume;
    out[4 * i + 1] = s.send;
    out[4 * i + 2] = s.muted ? 1 : 0;
    out[4 * i + 3] = s.solo ? 1 : 0;
  });
  SCENE_PARAMS.forEach((id, j) => {
    out[STEMS.length * 4 + j] = mix.params[id];
  });
  return out;
}

// frontend/lib/project-renderer.ts
var DEFAULT_RENDER = { startSeconds: 0, seconds: 30, fadeInSeconds: 0, fadeOutSeconds: 0.02, tailSeconds: 0, sampleRate: 48e3 };
function applyProject(engine, snapshot, source) {
  const p = snapshot.project;
  if (!engine.load_track_wasm(JSON.stringify(source))) throw new Error("Engine rejected the source arrangement.");
  engine.set_bpm(p.params["transport.bpm"]);
  engine.set_swing(p.params["transport.swing"]);
  engine.set_master(p.params["master.level"]);
  if (engine.queue_scene(1, 0, sceneVector(p)) !== 0) throw new Error("Engine rejected project mix settings.");
  const lanes = LANE_IDS.flatMap((l) => p.patterns[l] ? [p.patterns[l]] : []);
  if (lanes.length && engine.queue_patterns(2, 0, 0, compileLanes(lanes)) !== 0) throw new Error("Engine rejected project patterns.");
}
async function renderProject(EngineClass, snapshot, source, settings, signal, progress) {
  const s = { ...settings };
  for (const [key, value] of Object.entries(s)) if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid export setting: ${key}.`);
  if (![44100, 48e3].includes(s.sampleRate) || s.seconds <= 0 || s.seconds > 600 || s.startSeconds > 600 || s.tailSeconds > 30 || s.fadeInSeconds + s.fadeOutSeconds > s.seconds) throw new Error("Unsupported export range, sample rate, fade or tail. Maximum range is ten minutes.");
  signal?.throwIfAborted();
  const musicFrames = Math.round(s.seconds * s.sampleRate);
  const frames = musicFrames + Math.round(s.tailSeconds * s.sampleRate);
  const skip = Math.round(s.startSeconds * s.sampleRate);
  const wav = new Uint8Array(44 + frames * 4);
  const view = new DataView(wav.buffer);
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, wav.length - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, s.sampleRate, true);
  view.setUint32(28, s.sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, frames * 4, true);
  const engine = new EngineClass(s.sampleRate);
  let peak = 0;
  let sum = 0;
  try {
    applyProject(engine, structuredClone(snapshot), source);
    engine.play();
    const left = new Float32Array(128), right = new Float32Array(128);
    let yieldAt = 0;
    for (let at = 0; at < skip + frames; ) {
      if (at === skip + musicFrames) engine.end_score();
      const boundary = at < skip + musicFrames ? skip + musicFrames : skip + frames;
      const count = Math.min(128, boundary - at);
      engine.process(left.subarray(0, count), right.subarray(0, count));
      for (let i = 0; i < count; i++) {
        const n = at + i - skip;
        if (n < 0 || n >= frames) continue;
        const fadeIn = s.fadeInSeconds * s.sampleRate, fadeOut = s.fadeOutSeconds * s.sampleRate;
        let gain = 1;
        if (fadeIn > 0 && n < fadeIn) gain *= 0.5 - 0.5 * Math.cos(Math.PI * n / fadeIn);
        if (fadeOut > 0 && frames - 1 - n < fadeOut) gain *= 0.5 - 0.5 * Math.cos(Math.PI * (frames - 1 - n) / fadeOut);
        for (let ch = 0; ch < 2; ch++) {
          const value = (ch ? right[i] : left[i]) * gain;
          if (!Number.isFinite(value)) throw new Error("Engine produced a non-finite sample. Export discarded.");
          peak = Math.max(peak, Math.abs(value));
          sum += value * value;
          view.setInt16(44 + n * 4 + ch * 2, Math.round(Math.max(-1, Math.min(1, value)) * 32767), true);
        }
      }
      at += count;
      if (at >= yieldAt) {
        yieldAt = at + 16384;
        progress?.(Math.floor(100 * at / (skip + frames)));
        await new Promise((resolve) => setTimeout(resolve, 0));
        signal?.throwIfAborted();
      }
    }
  } finally {
    engine.free();
  }
  signal?.throwIfAborted();
  progress?.(100);
  return {
    wav,
    projectId: snapshot.id,
    revision: snapshot.revision,
    renderer: RENDERER_VERSION,
    frames,
    sampleRate: s.sampleRate,
    seconds: frames / s.sampleRate,
    format: "wav/pcm16/stereo",
    peak,
    rms: Math.sqrt(sum / (frames * 2)),
    warnings: []
  };
}
export {
  DEFAULT_RENDER,
  RENDERER_VERSION,
  applyProject,
  canonical,
  contentHash,
  migrateProject,
  projectFromTrack,
  readSnapshot,
  renderProject,
  resolvedArrangement,
  snapshotOf
};
