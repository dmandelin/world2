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
// B ran at roughly 1.8x A with the food chain alone, and about 1.5x with the
// full Fortune tree. Some of that was a long cold branch spoiling
// inlining, which moving the trace blocks out of line recovered part of; the
// rest is the extra call layers the shared implementation needs. In absolute
// terms it is about 11ms over a 2000-turn run, so the design still stands, but
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
    computeFortuneSubscore,
    EudaimoniaReport,
    EuNode,
    FortuneInputs,
    EU_LIFE_DECAY,
    EU_FORTUNE_DECAY,
    EU_SUBSCORE_FOOD_EXPONENT,
    EU_FOOD_SCALE,
    EU_VITALITY_SCALE,
    EU_CEREAL_SHARE_FREE,
    EU_CEREAL_NUTRITION_PENALTY,
    EU_HONEY_PER_SHARE,
    EU_BEER_PER_SHARE,
    EU_BEER_MAX,
    EU_CONVERSATION_FLOOR,
    EU_CONVERSATION_NEUTRAL_AFFINITY,
    EU_CONVERSATION_PER_DOUBLING,
    EU_CONVERSATION_QUALITY_SCALE,
    EU_CONVERSATION_STANDARD,
} from "./eudaimonia";
import { CHILDHOOD_JOY_SCALE, careSkillFactor } from "../people/care";

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

// Care provided is held inside this range before Fortune reads it; see care.ts.
function bound(p: number): number {
    return p < 0.25 ? 0.25 : p > 2.5 ? 2.5 : p;
}

function inlineFortune(prevFortune: number, x: FortuneInputs): number {
    const quantityRaw =
        EU_FOOD_SCALE * (Math.pow(x.foodRatio, EU_SUBSCORE_FOOD_EXPONENT) - 1);
    const quantity = quantityRaw > 0 ? 0 : quantityRaw;
    const cerealExcess = x.cerealShare - EU_CEREAL_SHARE_FREE;
    const nutrition =
        cerealExcess > 0 ? -EU_CEREAL_NUTRITION_PENALTY * cerealExcess : 0;
    const honey = EU_HONEY_PER_SHARE * x.fishShare;
    const beerRaw = EU_BEER_PER_SHARE * x.cerealShare;
    const beer = beerRaw > EU_BEER_MAX ? EU_BEER_MAX : beerRaw;
    const food = quantity + nutrition + honey + beer;
    const care = CHILDHOOD_JOY_SCALE * (bound(x.careEffort) - 1)
        + CHILDHOOD_JOY_SCALE * (bound(careSkillFactor(x.careSkill)) - 1);
    const amount = x.conversationAmount;
    const conversation = EU_CONVERSATION_PER_DOUBLING * Math.log2(
        (amount > EU_CONVERSATION_FLOOR ? amount : EU_CONVERSATION_FLOOR)
        / EU_CONVERSATION_STANDARD)
        + EU_CONVERSATION_QUALITY_SCALE
        * (x.conversationAffinity - EU_CONVERSATION_NEUTRAL_AFFINITY);
    const signal = food + care + conversation;
    return prevFortune + EU_FORTUNE_DECAY * (signal - prevFortune);
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
    prevFortune: number,
    births: number,
    deaths: number,
    population: number,
    x: FortuneInputs,
): Map<string, DetailItem> {
    const net = births - deaths;
    const netRate = net / Math.max(population, 1);
    const lifeSignal = netRate * EU_VITALITY_SCALE;
    const lifePull = EU_LIFE_DECAY * (lifeSignal - prevLife);
    const life = prevLife + lifePull;

    const quantityRaw =
        EU_FOOD_SCALE * (Math.pow(x.foodRatio, EU_SUBSCORE_FOOD_EXPONENT) - 1);
    const quantity = quantityRaw > 0 ? 0 : quantityRaw;
    const cerealExcess = x.cerealShare - EU_CEREAL_SHARE_FREE;
    const quality =
        cerealExcess > 0 ? -EU_CEREAL_NUTRITION_PENALTY * cerealExcess : 0;
    const nutrition = quantity + quality;
    const honey = EU_HONEY_PER_SHARE * x.fishShare;
    const beerRaw = EU_BEER_PER_SHARE * x.cerealShare;
    const beer = beerRaw > EU_BEER_MAX ? EU_BEER_MAX : beerRaw;
    const taste = honey + beer;
    const food = nutrition + taste;
    const careQuantity = CHILDHOOD_JOY_SCALE * (bound(x.careEffort) - 1);
    const careSkill =
        CHILDHOOD_JOY_SCALE * (bound(careSkillFactor(x.careSkill)) - 1);
    const care = careQuantity + careSkill;
    const amount = x.conversationAmount;
    const convQuantity = EU_CONVERSATION_PER_DOUBLING * Math.log2(
        (amount > EU_CONVERSATION_FLOOR ? amount : EU_CONVERSATION_FLOOR)
        / EU_CONVERSATION_STANDARD);
    const convQuality = EU_CONVERSATION_QUALITY_SCALE
        * (x.conversationAffinity - EU_CONVERSATION_NEUTRAL_AFFINITY);
    const conversation = convQuantity + convQuality;
    const social = care + conversation;
    const signal = food + social;
    const fortunePull = EU_FORTUNE_DECAY * (signal - prevFortune);
    const fortune = prevFortune + fortunePull;

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
    m.set("prevFortune", new DetailItem("Fortune last year", prevFortune, "Last year"));
    m.set("foodRatio", new DetailItem("Rations", x.foodRatio, "Share of needs"));
    m.set("fishShare", new DetailItem("Fish share", x.fishShare, "Of the diet"));
    m.set("cerealShare", new DetailItem("Cereal share", x.cerealShare, "Of the diet"));
    m.set("quantityRaw", new DetailItem("Before clamping", quantityRaw, "Runs positive"));
    m.set("quantity", new DetailItem("Quantity", quantity, "Short of enough"));
    m.set("quality", new DetailItem("Quality", quality, "Too much cereal"));
    m.set("nutrition", new DetailItem("Nutrition", nutrition, "Nourishment"));
    m.set("honey", new DetailItem("Honey", honey, "Gathered pleasures"));
    m.set("beerRaw", new DetailItem("Before capping", beerRaw, "Face value"));
    m.set("beer", new DetailItem("Beer", beer, "Brewed pleasures"));
    m.set("taste", new DetailItem("Taste", taste, "Pleasures"));
    m.set("food", new DetailItem("Food", food, "This year"));
    m.set("material", new DetailItem("Material", food, "This year"));
    m.set("careQuantity", new DetailItem("Quantity", careQuantity, "Effort"));
    m.set("careSkill", new DetailItem("Skill", careSkill, "Skill"));
    m.set("care", new DetailItem("Care", care, "Childhood Joy"));
    m.set("convQuantity", new DetailItem("Quantity", convQuantity, "People known"));
    m.set("convQuality", new DetailItem("Quality", convQuality, "Affinity"));
    m.set("conversation", new DetailItem("Conversation", conversation, "This year"));
    m.set("social", new DetailItem("Social", social, "This year"));
    m.set("signal", new DetailItem("Fortune signal", signal, "This year"));
    m.set("fortunePull", new DetailItem("Fortune pull", fortunePull, "Moved by"));
    m.set("fortune", new DetailItem("Fortune", fortune, "Subscore"));
    m.set("value", new DetailItem("Eudaimonia", life + fortune, "Added"));
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
const careEffort = new Float64Array(N_CASES);
const careSkill = new Float64Array(N_CASES);
const known = new Float64Array(N_CASES);
const affinity = new Float64Array(N_CASES);

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
    careEffort[i] = 0.5 + rnd();
    careSkill[i] = 20 + rnd() * 60;
    known[i] = rnd() * 200;
    affinity[i] = 0.3 + rnd() * 0.6;
}

// One inputs object, refilled per case, as the turn loop does.
const inputs = new FortuneInputs();
function fill(j: number): FortuneInputs {
    inputs.foodRatio = rations[j];
    inputs.fishShare = fish[j];
    inputs.cerealShare = 1 - fish[j];
    inputs.careEffort = careEffort[j];
    inputs.careSkill = careSkill[j];
    inputs.conversationAmount = known[j];
    inputs.conversationAffinity = affinity[j];
    return inputs;
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
                f = inlineFortune(f, fill(j));
            }
            sink += l + f;
        },
    },
    {
        name: "B  computeLife+Fortune, no trace  <-- turn update",
        run: (iters) => {
            let l = 0;
            let f = 0;
            for (let i = 0; i < iters; ++i) {
                const j = i & (N_CASES - 1);
                l = computeLife(l, births[j], deaths[j], pops[j]);
                f = computeFortuneSubscore(f, fill(j));
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
                f = computeFortuneSubscore(f, fill(j), r);
                sink += r.get(EuNode.Social);
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
                    l, f, births[j], deaths[j], pops[j], fill(j));
                l = m.get("life")!.value;
                f = m.get("fortune")!.value;
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
    "eudaimonia update (Life + Fortune): " +
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
