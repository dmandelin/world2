// Benchmark for the eudaimonia update path.
//
// The claim being tested: running the turn update as bare arithmetic, with the
// trace sink absent, costs essentially nothing over hand-inlined math, and is
// far cheaper than building the labeled intermediate objects that the detail
// display needs. If that is not true, the whole trace-sink design is not
// earning its keep and we should just build the objects every turn.
//
// Re-checked when Hunger was added, since the update now runs two subscore
// functions and so pays two trace checks rather than one.
//
// Nothing imports this file; it is run on demand. From the repo root:
//
//   npx tsc src/model/self/eudaimonia.bench.ts --outDir .bench
//       --module commonjs --target es2022 --moduleResolution node
//   (then put a package.json saying type commonjs in .bench/)
//   node .bench/model/self/eudaimonia.bench.js

import {
    computeLife,
    computeHunger,
    EudaimoniaReport,
    EU_LIFE_DECAY,
    EU_HUNGER_DECAY,
    EU_HUNGER_EXPONENT,
    EU_HUNGER_SCALE,
    EU_VITALITY_SCALE,
} from "./eudaimonia";

// --- What we are comparing against ----------------------------------------

// The floor: the same math with no function call boundary and no trace check.
function inlineLife(
    prevLife: number,
    births: number,
    deaths: number,
    population: number,
): number {
    const net = births - deaths;
    const netRate = net / Math.max(population, 1);
    const signal = netRate * EU_VITALITY_SCALE;
    return prevLife + EU_LIFE_DECAY * (signal - prevLife);
}

function inlineHunger(prevHunger: number, food: number): number {
    const raw = EU_HUNGER_SCALE * (Math.pow(food, EU_HUNGER_EXPONENT) - 1);
    const signal = raw > 0 ? 0 : raw;
    return prevHunger + EU_HUNGER_DECAY * (signal - prevHunger);
}

// The thing we are avoiding: building a labeled record of every step on every
// turn, in the style of the existing quality-of-life calculation.
class DetailItem {
    constructor(
        readonly name: string,
        readonly value: number,
        readonly note: string,
    ) {}
}

function buildDetail(
    prevLife: number,
    prevHunger: number,
    births: number,
    deaths: number,
    population: number,
    food: number,
): Map<string, DetailItem> {
    const net = births - deaths;
    const netRate = net / Math.max(population, 1);
    const lifeSignal = netRate * EU_VITALITY_SCALE;
    const lifePull = EU_LIFE_DECAY * (lifeSignal - prevLife);
    const life = prevLife + lifePull;

    const raw = EU_HUNGER_SCALE * (Math.pow(food, EU_HUNGER_EXPONENT) - 1);
    const hungerSignal = raw > 0 ? 0 : raw;
    const hungerPull = EU_HUNGER_DECAY * (hungerSignal - prevHunger);
    const hunger = prevHunger + hungerPull;

    const m = new Map<string, DetailItem>();
    m.set("prevLife", new DetailItem("Life last year", prevLife, "Last year"));
    m.set("births", new DetailItem("Births", births, "Born this year"));
    m.set("deaths", new DetailItem("Deaths", deaths, "Lost this year"));
    m.set("population", new DetailItem("Population", population, "Clan size"));
    m.set("net", new DetailItem("Net change", net, "Births less deaths"));
    m.set("netRate", new DetailItem("Net rate", netRate, "Per person"));
    m.set("lifeSignal", new DetailItem("Life signal", lifeSignal, "Settles at"));
    m.set("lifePull", new DetailItem("Life pull", lifePull, "Moved by"));
    m.set("life", new DetailItem("Life", life, "Subscore"));
    m.set("prevHunger", new DetailItem("Hunger last year", prevHunger, "Last year"));
    m.set("food", new DetailItem("Food", food, "Share of needs"));
    m.set("raw", new DetailItem("Before clamping", raw, "Runs positive"));
    m.set("hungerSignal", new DetailItem("Hunger signal", hungerSignal, "Held at zero"));
    m.set("hungerPull", new DetailItem("Hunger pull", hungerPull, "Moved by"));
    m.set("hunger", new DetailItem("Hunger", hunger, "Subscore"));
    m.set("value", new DetailItem("Eudaimonia", life + hunger, "Added"));
    return m;
}

// --- Harness --------------------------------------------------------------

// Plausible clan-years: small clans, a handful of births and deaths each, and
// food running from badly short to more than enough.
const N_CASES = 1024;
const births = new Float64Array(N_CASES);
const deaths = new Float64Array(N_CASES);
const pops = new Float64Array(N_CASES);
const foods = new Float64Array(N_CASES);

// Fixed seed so runs compare to each other.
let seed = 12345;
function rnd(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
}
for (let i = 0; i < N_CASES; ++i) {
    pops[i] = 10 + Math.floor(rnd() * 90);
    births[i] = Math.floor(rnd() * 0.06 * pops[i]);
    deaths[i] = Math.floor(rnd() * 0.06 * pops[i]);
    foods[i] = 0.5 + rnd();
}

// Accumulated so nothing can be optimized away.
let sink = 0;

type Variant = { name: string; run: (iters: number) => void };

const variants: Variant[] = [
    {
        name: "A  inline arithmetic (floor)",
        run: (iters) => {
            let l = 0;
            let h = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                l = inlineLife(l, births[j], deaths[j], pops[j]);
                h = inlineHunger(h, foods[j]);
            }
            sink += l + h;
        },
    },
    {
        name: "B  computeLife+Hunger, no trace  <-- turn update",
        run: (iters) => {
            let l = 0;
            let h = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                l = computeLife(l, births[j], deaths[j], pops[j]);
                h = computeHunger(h, foods[j]);
            }
            sink += l + h;
        },
    },
    {
        name: "C  same, traced   <-- panel replay",
        run: (iters) => {
            let l = 0;
            let h = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                const r = new EudaimoniaReport();
                l = computeLife(l, births[j], deaths[j], pops[j], r);
                h = computeHunger(h, foods[j], r);
                sink += r.get(8);
            }
            sink += l + h;
        },
    },
    {
        name: "D  build labeled detail objects every turn",
        run: (iters) => {
            let l = 0;
            let h = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                const m = buildDetail(
                    l, h, births[j], deaths[j], pops[j], foods[j]);
                l = m.get("life")!.value;
                h = m.get("hunger")!.value;
            }
            sink += l + h;
        },
    },
];

const ITERS = 2_000_000;
const WARMUP = 200_000;
const REPS = 7;

function bench(v: Variant): number {
    // Warm up so the JIT has settled before anything is timed.
    v.run(WARMUP);
    const times: number[] = [];
    for (let r = 0; r < REPS; ++r) {
        const t0 = process.hrtime.bigint();
        v.run(ITERS);
        const t1 = process.hrtime.bigint();
        times.push(Number(t1 - t0) / ITERS);
    }
    times.sort((a, b) => a - b);
    // Median, to shrug off a stray GC or scheduling hiccup.
    return times[(REPS - 1) >> 1];
}

console.log(
    "eudaimonia update (Life + Hunger): " +
        ITERS.toLocaleString() +
        " updates x " +
        REPS +
        " reps, median ns/update\n",
);

const results: { name: string; ns: number }[] = [];
for (const v of variants) results.push({ name: v.name, ns: bench(v) });

const floor = results[0].ns;
const fast = results[1].ns;

for (const r of results) {
    console.log(
        r.name.padEnd(48) +
            r.ns.toFixed(2).padStart(8) +
            " ns   " +
            (r.ns / fast).toFixed(2).padStart(6) +
            "x the turn update",
    );
}

// What it means at the scale the simulation actually runs.
const CLANS = 100;
const TURNS = 2000;
console.log(
    "\nAt " +
        CLANS +
        " clans over " +
        TURNS +
        " turns (" +
        (CLANS * TURNS).toLocaleString() +
        " updates):",
);
for (const r of results) {
    console.log(
        "  " +
            r.name.padEnd(48) +
            ((r.ns * CLANS * TURNS) / 1e6).toFixed(1).padStart(8) +
            " ms total",
    );
}

console.log(
    "\nOverhead of the two trace checks vs. the floor: " +
        (fast - floor).toFixed(2) +
        " ns/update (" +
        (((fast - floor) / floor) * 100).toFixed(1) +
        "%)",
);
console.log(
    "Saved by not building detail every turn: " +
        (((results[3].ns - fast) * CLANS * TURNS) / 1e6).toFixed(1) +
        " ms per " +
        TURNS +
        "-turn run",
);

// Keep the sink observable so none of the loops can be elided.
if (!Number.isFinite(sink)) console.log("sink", sink);
