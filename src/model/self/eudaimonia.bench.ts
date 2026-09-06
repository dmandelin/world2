// Benchmark for the eudaimonia update path.
//
// The claim being tested: running the turn update as bare arithmetic, with the
// trace sink absent, costs essentially nothing over hand-inlined math, and is
// far cheaper than building the labeled intermediate objects that the detail
// display needs. If that is not true, the whole trace-sink design is not
// earning its keep and we should just build the objects every turn.
//
// Nothing imports this file; it is run on demand. From the repo root:
//
//   npx tsc src/model/self/eudaimonia.bench.ts --outDir .bench \
//       --module esnext --target es2022 --moduleResolution bundler
//   node .bench/model/self/eudaimonia.bench.js
//
// (Add "type": "module" resolution notwithstanding, the package is already
// type: module, so the emitted .js runs as-is.)

import {
    computeEudaimonia,
    EudaimoniaReport,
    EU_DECAY,
    EU_VITALITY_SCALE,
} from "./eudaimonia";

// --- What we are comparing against ----------------------------------------

// The floor: the same math with no function call boundary and no trace check.
function inlineOnly(
    prevValue: number,
    births: number,
    deaths: number,
    population: number,
): number {
    const net = births - deaths;
    const netRate = net / Math.max(population, 1);
    const signal = netRate * EU_VITALITY_SCALE;
    return prevValue + EU_DECAY * (signal - prevValue);
}

// The thing we are avoiding: building a labeled record of every step on every
// turn, in the style of the existing quality-of-life calculation. Each step
// becomes an object with a name and a note, collected into a Map.
class DetailItem {
    constructor(
        readonly name: string,
        readonly value: number,
        readonly note: string,
    ) {}
}

function buildDetail(
    prevValue: number,
    births: number,
    deaths: number,
    population: number,
): Map<string, DetailItem> {
    const net = births - deaths;
    const netRate = net / Math.max(population, 1);
    const signal = netRate * EU_VITALITY_SCALE;
    const pull = EU_DECAY * (signal - prevValue);
    const value = prevValue + pull;

    const m = new Map<string, DetailItem>();
    m.set("prev", new DetailItem("Standing verdict", prevValue, "Last year's value"));
    m.set("births", new DetailItem("Births", births, "People born this year"));
    m.set("deaths", new DetailItem("Deaths", deaths, "People lost this year"));
    m.set("population", new DetailItem("Population", population, "Clan size"));
    m.set("net", new DetailItem("Net change", net, "Births less deaths"));
    m.set("netRate", new DetailItem("Net rate", netRate, "Net change per person"));
    m.set("signal", new DetailItem("Signal", signal, "This year read as eudaimonia"));
    m.set("pull", new DetailItem("Pull", pull, "Movement toward the signal"));
    m.set("value", new DetailItem("Eudaimonia", value, "The new standing verdict"));
    return m;
}

// --- Harness --------------------------------------------------------------

// Plausible clan-years: small clans, a handful of births and deaths each.
const N_CASES = 1024;
const births = new Float64Array(N_CASES);
const deaths = new Float64Array(N_CASES);
const pops = new Float64Array(N_CASES);

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
}

// Accumulated so nothing can be optimized away.
let sink = 0;

type Variant = { name: string; run: (iters: number) => void };

const variants: Variant[] = [
    {
        name: "A  inline arithmetic (floor)",
        run: (iters) => {
            let v = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                v = inlineOnly(v, births[j], deaths[j], pops[j]);
            }
            sink += v;
        },
    },
    {
        name: "B  computeEudaimonia, no trace  <-- turn update",
        run: (iters) => {
            let v = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                v = computeEudaimonia(v, births[j], deaths[j], pops[j]);
            }
            sink += v;
        },
    },
    {
        name: "C  computeEudaimonia, traced   <-- panel replay",
        run: (iters) => {
            let v = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                const r = new EudaimoniaReport();
                v = computeEudaimonia(v, births[j], deaths[j], pops[j], r);
                sink += r.get(8);
            }
            sink += v;
        },
    },
    {
        name: "D  build labeled detail objects every turn",
        run: (iters) => {
            let v = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                const m = buildDetail(v, births[j], deaths[j], pops[j]);
                v = m.get("value")!.value;
            }
            sink += v;
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
    `eudaimonia update: ${ITERS.toLocaleString()} calls x ${REPS} reps, median ns/call\n`,
);

const results: { name: string; ns: number }[] = [];
for (const v of variants) {
    results.push({ name: v.name, ns: bench(v) });
}

const floor = results[0].ns;
const fast = results[1].ns;

for (const r of results) {
    const rel = (r.ns / fast).toFixed(2);
    console.log(
        `${r.name.padEnd(46)} ${r.ns.toFixed(2).padStart(8)} ns   ` +
            `${rel.padStart(6)}x the turn update`,
    );
}

// What it means at the scale the simulation actually runs.
const CLANS = 100;
const TURNS = 2000;
console.log(`\nAt ${CLANS} clans over ${TURNS} turns (${(CLANS * TURNS).toLocaleString()} updates):`);
for (const r of results) {
    const ms = (r.ns * CLANS * TURNS) / 1e6;
    console.log(`  ${r.name.padEnd(46)} ${ms.toFixed(1).padStart(8)} ms total`);
}

const savedPerRun = ((results[3].ns - fast) * CLANS * TURNS) / 1e6;
console.log(
    `\nOverhead of the trace check vs. the floor: ` +
        `${(fast - floor).toFixed(2)} ns/call (${(((fast - floor) / floor) * 100).toFixed(1)}%)`,
);
console.log(
    `Saved by not building detail every turn: ${savedPerRun.toFixed(1)} ms per ${TURNS}-turn run`,
);

// Keep the sink observable so none of the loops can be elided.
if (!Number.isFinite(sink)) console.log("sink", sink);
