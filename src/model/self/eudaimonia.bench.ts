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
// B ran at roughly 1.8x A with the food chain alone, about 1.5x with the full
// Fortune tree, and about 1.35x once the tree blended some of its nodes (the
// blends' exp and log raised the floor more than the overhead). Some of that
// was a long cold branch spoiling inlining, which moving the trace blocks out
// of line recovered part of; the rest is the extra call layers the shared
// implementation needs, and the lookup of each node's combiner. Calling the
// combiners through their interface instead of directly doubled B; see
// combine2 in eudaimonia.ts. In absolute terms the overhead is about 30ms over
// a 2000-turn run of 100 clans, so the design still stands, but the honest
// claim is "far cheaper than D", not "free".
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
    nutritionFortune,
    EU_VITALITY_SCALE,
    EU_HONEY_PER_SHARE,
    EU_BEER_PER_SHARE,
    EU_BEER_MAX,
    EU_CONVERSATION_FLOOR,
    EU_CONVERSATION_NEUTRAL_AFFINITY,
    EU_CONVERSATION_PER_DOUBLING,
    EU_CONVERSATION_QUALITY_SCALE,
    EU_CONVERSATION_STANDARD,
    EU_BLEND_UP_SCALE,
    EU_BLEND_DOWN_SCALE,
} from "./eudaimonia";
// Care's two terms are called rather than written out: stress walks a table
// of knots, which inlining by hand would only obscure.
import { careComfort, careSkillFactor, careStress } from "../people/care";
import { foodBalance, nutritionFromRaw } from "../people/nutrition";

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

// The blend, written out; see eudaimonia.ts.
function liftB(v: number): number {
    return v >= 0
        ? Math.expm1(v / EU_BLEND_UP_SCALE)
        : -Math.expm1(-v / EU_BLEND_DOWN_SCALE);
}

function blend2(a: number, b: number): number {
    const m = (liftB(a) + liftB(b)) / 2;
    return m >= 0
        ? EU_BLEND_UP_SCALE * Math.log1p(m)
        : -EU_BLEND_DOWN_SCALE * Math.log1p(-m);
}

function inlineFortune(prevFortune: number, x: FortuneInputs): number {
    const nutrition = nutritionFortune(nutritionFromRaw(
        (x.foodRatio > 0 ? x.foodRatio : 0) * foodBalance(x.cerealShare)));
    const honey = EU_HONEY_PER_SHARE * x.fishShare;
    const beerRaw = EU_BEER_PER_SHARE * x.cerealShare;
    const beer = beerRaw > EU_BEER_MAX ? EU_BEER_MAX : beerRaw;
    const food = nutrition + honey + beer;
    const care = careComfort(x.careEffort * careSkillFactor(x.careSkill))
        + careStress(x.careShare);
    const amount = x.conversationAmount;
    const conversation = blend2(
        EU_CONVERSATION_PER_DOUBLING * Math.log2(
            (amount > EU_CONVERSATION_FLOOR ? amount : EU_CONVERSATION_FLOOR)
            / EU_CONVERSATION_STANDARD),
        EU_CONVERSATION_QUALITY_SCALE
            * (x.conversationAffinity - EU_CONVERSATION_NEUTRAL_AFFINITY));
    const signal = blend2(food, blend2(care, conversation));
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

    const balance = foodBalance(x.cerealShare);
    const raw = (x.foodRatio > 0 ? x.foodRatio : 0) * balance;
    const level = nutritionFromRaw(raw);
    const nutrition = nutritionFortune(level);
    const honey = EU_HONEY_PER_SHARE * x.fishShare;
    const beerRaw = EU_BEER_PER_SHARE * x.cerealShare;
    const beer = beerRaw > EU_BEER_MAX ? EU_BEER_MAX : beerRaw;
    const taste = honey + beer;
    const food = nutrition + taste;
    const provision = x.careEffort * careSkillFactor(x.careSkill);
    const comfort = careComfort(provision);
    const stress = careStress(x.careShare);
    const care = comfort + stress;
    const amount = x.conversationAmount;
    const convQuantity = EU_CONVERSATION_PER_DOUBLING * Math.log2(
        (amount > EU_CONVERSATION_FLOOR ? amount : EU_CONVERSATION_FLOOR)
        / EU_CONVERSATION_STANDARD);
    const convQuality = EU_CONVERSATION_QUALITY_SCALE
        * (x.conversationAffinity - EU_CONVERSATION_NEUTRAL_AFFINITY);
    const conversation = blend2(convQuantity, convQuality);
    const social = blend2(care, conversation);
    const signal = blend2(food, social);
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
    m.set("balance", new DetailItem("Balance", balance, "Of the mix"));
    m.set("raw", new DetailItem("Before the ceiling", raw, "Rations x balance"));
    m.set("level", new DetailItem("Nutrition level", level, "Share of needs"));
    m.set("nutrition", new DetailItem("Nutrition", nutrition, "As Fortune"));
    m.set("honey", new DetailItem("Honey", honey, "Gathered pleasures"));
    m.set("beerRaw", new DetailItem("Before capping", beerRaw, "Face value"));
    m.set("beer", new DetailItem("Beer", beer, "Brewed pleasures"));
    m.set("taste", new DetailItem("Taste", taste, "Pleasures"));
    m.set("food", new DetailItem("Food", food, "This year"));
    m.set("material", new DetailItem("Material", food, "This year"));
    m.set("careProvision", new DetailItem("Care provided", provision, "Effort x skill"));
    m.set("comfort", new DetailItem("Comfort", comfort, "Looked after"));
    m.set("stress", new DetailItem("Stress", stress, "Cost of it"));
    m.set("care", new DetailItem("Care", care, "Added"));
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
const careShare = new Float64Array(N_CASES);
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
    careShare[i] = rnd() * 0.5;
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
    inputs.careShare = careShare[j];
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
