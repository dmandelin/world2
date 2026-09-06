// Benchmark for the eudaimonia update path.
//
// The claim being tested: running the turn update as bare arithmetic, with the
// trace sink absent, is far cheaper than building the labeled intermediate
// objects that the detail display needs. If that is not true, the whole
// trace-sink design is not earning its keep and we should just build the
// objects every turn.
//
// A weaker claim used to hold too -- that the absent sink cost nothing at all
// against hand-inlined math -- and it stopped holding once the food chain grew.
// B now runs at roughly 1.8x A. Some of that was a long cold branch spoiling
// inlining, which moving the trace blocks out of line recovered part of; the
// rest is the extra call layers the shared implementation needs. In absolute
// terms it is about 5ms over a 2000-turn run, so the design still stands, but
// the honest claim is "far cheaper than D", not "free".
//
// Note C and D allocate heavily and so are GC-bound: their numbers move
// noticeably between runs. A and B are stable and are the ones to read.
//
// Re-checked whenever the chain grows, since a longer chain means more steps
// under the same single trace check, and more objects in the alternative.
//
// Nothing imports this file; it is run on demand. From the repo root:
//
//   npx tsc src/model/self/eudaimonia.bench.ts --outDir .bench
//       --module commonjs --target es2022 --moduleResolution node
//   (then put a package.json saying type commonjs in .bench/)
//   node .bench/model/self/eudaimonia.bench.js

import {
    computeLife,
    computeFood,
    tasteScale,
    EudaimoniaReport,
    EuNode,
    EU_LIFE_DECAY,
    EU_FOOD_DECAY,
    EU_FOOD_EXPONENT,
    EU_FOOD_SCALE,
    EU_VITALITY_SCALE,
    EU_CEREAL_SHARE_FREE,
    EU_CEREAL_NUTRITION_PENALTY,
    EU_HONEY_PER_SHARE,
    EU_BEER_PER_SHARE,
    EU_BEER_MAX,
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

function inlineFood(
    prevFood: number,
    foodRatio: number,
    fishShare: number,
    cerealShare: number,
): number {
    const quantityRaw =
        EU_FOOD_SCALE * (Math.pow(foodRatio, EU_FOOD_EXPONENT) - 1);
    const quantity = quantityRaw > 0 ? 0 : quantityRaw;
    const cerealExcess = cerealShare - EU_CEREAL_SHARE_FREE;
    const composition =
        cerealExcess > 0 ? -EU_CEREAL_NUTRITION_PENALTY * cerealExcess : 0;
    const nutrition = quantity + composition;
    const honey = EU_HONEY_PER_SHARE * fishShare;
    const beerRaw = EU_BEER_PER_SHARE * cerealShare;
    const beer = beerRaw > EU_BEER_MAX ? EU_BEER_MAX : beerRaw;
    const taste = (honey + beer) * tasteScale(nutrition);
    const signal = nutrition + taste;
    return prevFood + EU_FOOD_DECAY * (signal - prevFood);
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
    prevFood: number,
    births: number,
    deaths: number,
    population: number,
    foodRatio: number,
    fishShare: number,
    cerealShare: number,
): Map<string, DetailItem> {
    const net = births - deaths;
    const netRate = net / Math.max(population, 1);
    const lifeSignal = netRate * EU_VITALITY_SCALE;
    const lifePull = EU_LIFE_DECAY * (lifeSignal - prevLife);
    const life = prevLife + lifePull;

    const quantityRaw =
        EU_FOOD_SCALE * (Math.pow(foodRatio, EU_FOOD_EXPONENT) - 1);
    const quantity = quantityRaw > 0 ? 0 : quantityRaw;
    const cerealExcess = cerealShare - EU_CEREAL_SHARE_FREE;
    const composition =
        cerealExcess > 0 ? -EU_CEREAL_NUTRITION_PENALTY * cerealExcess : 0;
    const nutrition = quantity + composition;
    const honey = EU_HONEY_PER_SHARE * fishShare;
    const beerRaw = EU_BEER_PER_SHARE * cerealShare;
    const beer = beerRaw > EU_BEER_MAX ? EU_BEER_MAX : beerRaw;
    const tasteRaw = honey + beer;
    const scale = tasteScale(nutrition);
    const taste = tasteRaw * scale;
    const foodSignal = nutrition + taste;
    const foodPull = EU_FOOD_DECAY * (foodSignal - prevFood);
    const food = prevFood + foodPull;

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
    m.set("prevFood", new DetailItem("Food last year", prevFood, "Last year"));
    m.set("foodRatio", new DetailItem("Rations", foodRatio, "Share of needs"));
    m.set("fishShare", new DetailItem("Fish share", fishShare, "Of the diet"));
    m.set("cerealShare", new DetailItem("Cereal share", cerealShare, "Of the diet"));
    m.set("quantityRaw", new DetailItem("Before clamping", quantityRaw, "Runs positive"));
    m.set("quantity", new DetailItem("Quantity", quantity, "Short of enough"));
    m.set("composition", new DetailItem("Composition", composition, "Too much cereal"));
    m.set("nutrition", new DetailItem("Nutrition", nutrition, "Nourishment"));
    m.set("honey", new DetailItem("Honey", honey, "Gathered pleasures"));
    m.set("beer", new DetailItem("Beer", beer, "Brewed pleasures"));
    m.set("tasteRaw", new DetailItem("Before scaling", tasteRaw, "Face value"));
    m.set("tasteScale", new DetailItem("Worth", scale, "At this nourishment"));
    m.set("taste", new DetailItem("Taste", taste, "What they are worth"));
    m.set("foodSignal", new DetailItem("Food signal", foodSignal, "This year"));
    m.set("foodPull", new DetailItem("Food pull", foodPull, "Moved by"));
    m.set("food", new DetailItem("Food", food, "Subscore"));
    m.set("value", new DetailItem("Eudaimonia", life + food, "Added"));
    return m;
}

// --- Harness --------------------------------------------------------------

// Plausible clan-years: small clans, a handful of births and deaths each,
// rations from badly short to more than enough, and any mix of the two foods.
const N_CASES = 1024;
const births = new Float64Array(N_CASES);
const deaths = new Float64Array(N_CASES);
const pops = new Float64Array(N_CASES);
const rations = new Float64Array(N_CASES);
const fish = new Float64Array(N_CASES);

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
    rations[i] = 0.5 + rnd();
    fish[i] = rnd();
}

// Accumulated so nothing can be optimized away.
let sink = 0;

type Variant = { name: string; run: (iters: number) => void };

const variants: Variant[] = [
    {
        name: "A  inline arithmetic (floor)",
        run: (iters) => {
            let l = 0;
            let f = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                l = inlineLife(l, births[j], deaths[j], pops[j]);
                f = inlineFood(f, rations[j], fish[j], 1 - fish[j]);
            }
            sink += l + f;
        },
    },
    {
        name: "B  computeLife+Food, no trace  <-- turn update",
        run: (iters) => {
            let l = 0;
            let f = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                l = computeLife(l, births[j], deaths[j], pops[j]);
                f = computeFood(f, rations[j], fish[j], 1 - fish[j]);
            }
            sink += l + f;
        },
    },
    {
        name: "C  same, traced   <-- panel replay",
        run: (iters) => {
            let l = 0;
            let f = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                const r = new EudaimoniaReport();
                l = computeLife(l, births[j], deaths[j], pops[j], r);
                f = computeFood(f, rations[j], fish[j], 1 - fish[j], r);
                sink += r.get(EuNode.Nutrition);
            }
            sink += l + f;
        },
    },
    {
        name: "D  build labeled detail objects every turn",
        run: (iters) => {
            let l = 0;
            let f = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                const m = buildDetail(
                    l, f, births[j], deaths[j], pops[j],
                    rations[j], fish[j], 1 - fish[j]);
                l = m.get("life")!.value;
                f = m.get("food")!.value;
            }
            sink += l + f;
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
    "eudaimonia update (Life + Food): " +
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
    "\nAt " + CLANS + " clans over " + TURNS + " turns (" +
        (CLANS * TURNS).toLocaleString() + " updates):",
);
for (const r of results) {
    console.log(
        "  " + r.name.padEnd(48) +
            ((r.ns * CLANS * TURNS) / 1e6).toFixed(1).padStart(8) + " ms total",
    );
}

console.log(
    "\nOverhead of the two trace checks vs. the floor: " +
        (fast - floor).toFixed(2) + " ns/update (" +
        (((fast - floor) / floor) * 100).toFixed(1) + "%)",
);
console.log(
    "Saved by not building detail every turn: " +
        (((results[3].ns - fast) * CLANS * TURNS) / 1e6).toFixed(1) +
        " ms per " + TURNS + "-turn run",
);

// Keep the sink observable so none of the loops can be elided.
if (!Number.isFinite(sink)) console.log("sink", sink);
