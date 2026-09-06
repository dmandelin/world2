// Eudaimonia: how well a clan's life is actually going, judged over the long
// run rather than turn by turn.
//
// Unlike quality of life, which reads the current year's conditions, this is a
// slow-moving verdict on a clan's whole run of years. It notionally sits
// between -100 and 100 -- 0 being an unremarkable life, positive being a life
// worth having lived -- but nothing clamps it, because a clan can do
// spectacularly well or spectacularly badly and the number should say so.
//
// The verdict is made of subscores, each a running average of its own signal
// with its own memory, added together:
//
//     Life  how the clan is growing or dying, over about a generation
//     Food  what the clan has been eating, over about half that
//
// Subscores are added, not blended: a clan that is growing and starving is
// doing both, and the total should say so.
//
// Alongside them is Fortune, which is the food signal for the current year
// alone, before the running average absorbs it. It runs the same chain on a
// gentler quantity curve, because it reports on a year rather than judging a
// life.
//
// ---------------------------------------------------------------------------
// A note on how the calculation is written
// ---------------------------------------------------------------------------
//
// The turn loop runs this for every clan every year, so the update path does
// arithmetic and nothing else: no intermediate objects, no arrays, no labels.
// But when someone opens the Wellness panel we want the whole derivation,
// every intermediate value named and shown.
//
// The usual way to get both is to write the math twice -- once fast, once
// explained -- and then spend the rest of the project keeping the two copies
// honest. We avoid that entirely. There is ONE implementation of each part.
// Each takes an optional trace sink; when the sink is absent (the turn loop)
// the function is pure arithmetic guarded by a single branch, and when it is
// present (the panel, replaying on demand) every intermediate is reported.
//
// The reporting happens in one block at the END, after the math, where every
// intermediate is still in scope as a local. So the fast path pays for exactly
// one correctly-predicted branch per part rather than one per step, and the
// math reads as ordinary math instead of being interleaved with bookkeeping.
//
// When the chain was short this cost nothing measurable against hand-inlined
// math. It is no longer quite free -- the update path benchmarks at roughly
// 1.8x the inlined floor, which is about 5ms over a 2000-turn run, immaterial
// but not nothing. What it still buys is the comparison that matters: some 90x
// cheaper than building the labeled detail every turn, and no allocation at
// all. Re-run eudaimonia.bench.ts if the chain grows again.
//
// Each part is its own function returning a plain number, rather than one
// function returning a record of them. That keeps the update path free of
// allocation, which returning an object would not.
//
// The Food subscore and Fortune run the SAME chain with different quantity
// exponents, so they would collide if they wrote to one report. They get a
// report each -- explain() and explainFortune() -- rather than a duplicate set
// of node names.
//
// If you add a step: add the local, then add its `put` to the trace block a
// few lines below, then add it to EU_NODES. All three are in this file within
// a screen of each other, which is the point.

// --- Tuning ---------------------------------------------------------------

// How much of the gap between a running subscore and this year's signal is
// closed per turn. Life is the slower of the two: 3% gives it a memory of
// roughly a generation, which is about right for something meant to summarize
// a life. Food moves at twice that, because eating badly is felt sooner and
// forgiven sooner than a line dying out is.
export const EU_LIFE_DECAY = 0.03;
export const EU_FOOD_DECAY = 0.06;

// The notional bound on the scale. Nothing clamps to it -- a clan can run past
// it in either direction -- but it is what the number is written against: how
// wide the axes are drawn, and what counts as a full share of the range when
// clans are averaged together.
export const EU_RANGE = 100;

// Converts a net growth rate into eudaimonia units. At this scale a clan that
// sustains 2% net growth a year settles at +40, and one shrinking that fast
// settles at -40; sustained growth of 5% a year would put it at the notional
// bound of 100.
export const EU_VITALITY_SCALE = 2000;

// --- Food ------------------------------------------------------------------
//
// Food consumption is read as a share of what the clan needs, so 1 is enough
// to eat. Quantity is the shortfall from that, raised to a power and scaled.
//
// The Food subscore squares it: going a little short costs a little and going
// badly short costs disproportionately more. At three-quarters rations the
// signal is about -44, at half about -75.
//
// Fortune reads the same input on a straight line, so a year's eating maps to
// a year's fortune proportionately: three-quarters rations is -25, half -50.
// It is a report on the year rather than a judgement accumulated over many.
export const EU_FOOD_SCALE = 100;
export const EU_FOOD_EXPONENT = 2;
export const EU_FORTUNE_EXPONENT = 1;

// Composition, on the assumption that fishing stands for hunting and gathering
// generally -- a varied and nourishing diet -- and farming for mixed
// production including goats and sheep, nourishing but less so.
//
// So fish carries no nutritional penalty at all. Cereals carry one only past
// the share a mixed diet can absorb: nothing up to 30% of the diet, and
// -7 per unit of the diet beyond that, so an all-cereal diet costs about -4.9.
export const EU_CEREAL_SHARE_FREE = 0.3;
export const EU_CEREAL_NUTRITION_PENALTY = 7;

// The pleasures each kind of food brings, beyond nourishment. Gatherers turn
// up honey and the like, worth a little in proportion to how much of the diet
// they provide. Cereals make beer, worth rather more, but only so much beer is
// any use.
export const EU_HONEY_PER_SHARE = 5;
export const EU_BEER_PER_SHARE = 20;
export const EU_BEER_MAX = 10;

// A treat is worth less to the starving and more to the comfortable, so the
// bonuses are scaled by how the nutrition came out rather than simply added:
// nothing at all at -30, their full worth at 0, and a quarter more again by
// +150. Between those points it runs straight, and it is held inside them.
export const EU_TASTE_ZERO_AT = -30;
export const EU_TASTE_FULL_AT = 0;
export const EU_TASTE_BOOST_AT = 150;
export const EU_TASTE_BOOST = 1.25;

// Keeps the per-capita rate finite for a clan that has just lost everyone.
const MIN_POPULATION = 1;

// --- The calculation graph ------------------------------------------------

// Named points in the derivation. A plain const object rather than an enum so
// the values stay ordinary numbers and the module has no runtime baggage.
export const EuNode = {
    // Life
    PrevLife: 0,
    Births: 1,
    Deaths: 2,
    Population: 3,
    Net: 4,
    NetRate: 5,
    LifeSignal: 6,
    LifePull: 7,
    Life: 8,

    // Food inputs
    PrevFood: 10,
    FoodRatio: 11,
    FishShare: 12,
    CerealShare: 13,

    // Nutrition: what the food is worth as nourishment
    QuantityRaw: 20,
    Quantity: 21,
    Composition: 22,
    Nutrition: 23,

    // Taste: what it is worth beyond nourishment
    Honey: 30,
    Beer: 31,
    TasteRaw: 32,
    TasteScale: 33,
    Taste: 34,
    // What each treat is actually worth once nutrition has had its say. These
    // are what the panel shows, since they are the amounts that add to Taste.
    HoneyScaled: 35,
    BeerScaled: 36,

    // Food, and what the year's food does to the standing subscore
    FoodSignal: 40,
    FoodPull: 41,
    Food: 42,

    // Totals
    PrevValue: 50,
    Value: 51,
} as const;

export type EuNodeId = (typeof EuNode)[keyof typeof EuNode];

// --- Subscores ------------------------------------------------------------

export type EuSubscoreKey = "life" | "food";

// What a subscore is, and where to find its parts in a replay. The UI walks
// this rather than hardcoding the list, so a new subscore appears in the
// overview tooltip and the panel table without either being edited.
export interface EuSubscoreDef {
    key: EuSubscoreKey;
    label: string;
    // Share of the gap to its signal that one year closes.
    decay: number;
    // Whether the concern this subscore tracks is one Fortune also reports
    // on. Fortune reads the same inputs on its own quantity curve, so this
    // marks which subscores it speaks to, not a term it sums.
    inFortune: boolean;
    // Where this subscore's parts land in a report.
    prevNode: EuNodeId;
    signalNode: EuNodeId;
    pullNode: EuNodeId;
    valueNode: EuNodeId;
    blurb: string;
}

export const EU_SUBSCORES: readonly EuSubscoreDef[] = [
    {
        key: "life",
        label: "Life",
        decay: EU_LIFE_DECAY,
        // Left out of Fortune: this signal is a growth rate read at x2000, so
        // in a small clan one birth swings it by a hundred points and it says
        // more about arithmetic than about the year.
        inFortune: false,
        prevNode: EuNode.PrevLife,
        signalNode: EuNode.LifeSignal,
        pullNode: EuNode.LifePull,
        valueNode: EuNode.Life,
        blurb: "Whether the clan is growing or dying, as a share of itself.",
    },
    {
        key: "food",
        label: "Food",
        decay: EU_FOOD_DECAY,
        inFortune: true,
        prevNode: EuNode.PrevFood,
        signalNode: EuNode.FoodSignal,
        pullNode: EuNode.FoodPull,
        valueNode: EuNode.Food,
        blurb:
            "What the clan has been eating: enough of it, varied enough to "
            + "nourish, and with something to enjoy in it.",
    },
];

// The steps of the food chain, in the order they should read on screen. The
// panel walks this rather than naming rows itself.
export interface EuFoodStep {
    node: EuNodeId;
    label: string;
    // A heading that its following terms add up to, rather than a term itself.
    isSubtotal?: boolean;
    // A term belonging to the subtotal above it.
    isPart?: boolean;
    note: string;
}

// Each subtotal leads, with the terms that make it up indented beneath. The
// parts are the amounts that actually add to the subtotal, so the treats
// appear at what nutrition left them worth rather than at face value.
export const EU_FOOD_STEPS: readonly EuFoodStep[] = [
    {
        node: EuNode.Nutrition,
        label: "Nutrition",
        isSubtotal: true,
        note: "Quantity and composition together: what the food was worth as nourishment.",
    },
    {
        node: EuNode.Quantity,
        label: "Quantity",
        isPart: true,
        note: "How far short of enough the clan ate.",
    },
    {
        node: EuNode.Composition,
        label: "Composition",
        isPart: true,
        note: `Cereals past ${(EU_CEREAL_SHARE_FREE * 100).toFixed(0)}% of the diet, which a mixed diet no longer balances. Fish carries no penalty.`,
    },
    {
        node: EuNode.Taste,
        label: "Taste",
        isSubtotal: true,
        note: "Honey and beer, scaled by how the nutrition came out: worth nothing to the starving, more to the comfortable.",
    },
    {
        node: EuNode.HoneyScaled,
        label: "Honey",
        isPart: true,
        note: "What the gatherers turned up, at what it was worth given how well the clan ate.",
    },
    {
        node: EuNode.BeerScaled,
        label: "Beer",
        isPart: true,
        note: `What the cereals brewed, capped at ${EU_BEER_MAX} before scaling, at what it was worth given how well the clan ate.`,
    },
];

// --- Node metadata --------------------------------------------------------

// How each point is meant to read on screen. Never touched by the update path.
export type EuNodeRole = "input" | "derived" | "result";

export interface EuNodeDef {
    id: EuNodeId;
    label: string;
    role: EuNodeRole;
    places: number;
    isRate?: boolean;
    note: string;
}

export const EU_NODES: readonly EuNodeDef[] = [
    { id: EuNode.PrevLife, label: "Life last year", role: "input", places: 1,
      note: "Where the Life subscore stood at the end of last year." },
    { id: EuNode.Births, label: "Births", role: "input", places: 1,
      note: "People born to the clan this year." },
    { id: EuNode.Deaths, label: "Deaths", role: "input", places: 1,
      note: "People the clan lost this year." },
    { id: EuNode.Population, label: "Population", role: "input", places: 0,
      note: "Clan size the rate is measured against." },
    { id: EuNode.Net, label: "Net change", role: "derived", places: 1,
      note: "Births less deaths: whether the clan grew or shrank." },
    { id: EuNode.NetRate, label: "Net rate", role: "derived", places: 2, isRate: true,
      note: "Net change as a share of the clan, so small and large clans compare." },
    { id: EuNode.LifeSignal, label: "Life signal", role: "derived", places: 1,
      note: `The rate read as eudaimonia, at x${EU_VITALITY_SCALE}.` },
    { id: EuNode.LifePull, label: "Life pull", role: "derived", places: 2,
      note: `${(EU_LIFE_DECAY * 100).toFixed(0)}% of the distance from last year's Life to this year's signal.` },
    { id: EuNode.Life, label: "Life", role: "result", places: 1,
      note: "Last year's Life moved by this year's pull." },

    { id: EuNode.PrevFood, label: "Food last year", role: "input", places: 1,
      note: "Where the Food subscore stood at the end of last year." },
    { id: EuNode.FoodRatio, label: "Rations", role: "input", places: 2, isRate: true,
      note: "Food eaten per head, as a share of what the clan needs." },
    { id: EuNode.FishShare, label: "Fish share", role: "input", places: 0, isRate: true,
      note: "Share of the diet from fishing, standing for hunting and gathering generally." },
    { id: EuNode.CerealShare, label: "Cereal share", role: "input", places: 0, isRate: true,
      note: "Share of the diet from farming, standing for mixed farming with herds." },

    { id: EuNode.QuantityRaw, label: "Before clamping", role: "derived", places: 1,
      note: "Runs positive when there is more than enough, which counts for nothing here." },
    { id: EuNode.Quantity, label: "Quantity", role: "derived", places: 1,
      note: "How far short of enough the clan ate." },
    { id: EuNode.Composition, label: "Composition", role: "derived", places: 1,
      note: "The nutritional cost of leaning too hard on cereals." },
    { id: EuNode.Nutrition, label: "Nutrition", role: "derived", places: 1,
      note: "Quantity and composition together." },

    { id: EuNode.Honey, label: "Honey", role: "derived", places: 1,
      note: "The pleasures of a gathered diet." },
    { id: EuNode.Beer, label: "Beer", role: "derived", places: 1,
      note: "The pleasures of a cereal one, up to the point of enough." },
    { id: EuNode.TasteRaw, label: "Before scaling", role: "derived", places: 1,
      note: "Honey and beer added, before nutrition decides what they are worth." },
    { id: EuNode.TasteScale, label: "Worth", role: "derived", places: 2,
      note: "What a treat is worth at this level of nourishment." },
    { id: EuNode.Taste, label: "Taste", role: "derived", places: 1,
      note: "The pleasures, at what they are worth here." },
    { id: EuNode.HoneyScaled, label: "Honey", role: "derived", places: 1,
      note: "What the gathered pleasures were worth at this level of nourishment." },
    { id: EuNode.BeerScaled, label: "Beer", role: "derived", places: 1,
      note: "What the brewed pleasures were worth at this level of nourishment." },

    { id: EuNode.FoodSignal, label: "Food signal", role: "derived", places: 1,
      note: "Nutrition and taste together: what this year's eating was worth." },
    { id: EuNode.FoodPull, label: "Food pull", role: "derived", places: 2,
      note: `${(EU_FOOD_DECAY * 100).toFixed(0)}% of the distance from last year's Food to this year's signal.` },
    { id: EuNode.Food, label: "Food", role: "result", places: 1,
      note: "Last year's Food moved by this year's pull." },

    { id: EuNode.PrevValue, label: "Total last year", role: "input", places: 1,
      note: "The two subscores as they stood at the end of last year." },
    { id: EuNode.Value, label: "Eudaimonia", role: "result", places: 1,
      note: "Life and Food added." },
];

export const EU_NODE_DEFS: ReadonlyMap<EuNodeId, EuNodeDef> = new Map(
    EU_NODES.map((d) => [d.id, d]),
);

// --- Tracing --------------------------------------------------------------

// Where a replay writes its intermediates. The update path passes nothing.
export interface EuTrace {
    put(id: EuNodeId, value: number): void;
}

// A trace that keeps what it is told, for the panel and the tooltips.
export class EudaimoniaReport implements EuTrace {
    private readonly values_ = new Map<EuNodeId, number>();

    put(id: EuNodeId, value: number): void {
        this.values_.set(id, value);
    }

    get(id: EuNodeId): number {
        return this.values_.get(id) ?? 0;
    }

    has(id: EuNodeId): boolean {
        return this.values_.has(id);
    }

    get steps(): { def: EuNodeDef; value: number }[] {
        const out: { def: EuNodeDef; value: number }[] = [];
        for (const def of EU_NODES) {
            if (this.values_.has(def.id)) {
                out.push({ def, value: this.values_.get(def.id)! });
            }
        }
        return out;
    }
}

// --- The calculation ------------------------------------------------------
//
// On the relaxation form the subscores use:
//
//     value = prev + a * (signal - prev)  ==  (1 - a) * prev + a * signal
//
// so the standing subscore IS scaled by (1 - decay), just implicitly. The
// relaxation form is used because it names the pull -- how far this year
// actually moved things -- which is the quantity the panel shows, and because
// it keeps the correction small relative to prev instead of rescaling a large
// number every turn. Note it decays toward the signal, not toward zero:
// decaying toward zero and adding the signal would settle at signal/decay,
// tens of times higher.

// How the clan's growing or dying reads as eudaimonia.
//
// Keep the trace block at the bottom in step with the math above it.
export function computeLife(
    prevLife: number,
    births: number,
    deaths: number,
    population: number,
    trace?: EuTrace,
): number {
    // Whether the clan grew or shrank, as a share of itself, so that a clan of
    // twelve and a clan of sixty are judged on the same scale.
    const net = births - deaths;
    const netRate = net / Math.max(population, MIN_POPULATION);

    // What this one year, taken on its own, says about how the clan is doing.
    const signal = netRate * EU_VITALITY_SCALE;

    // One year is only one year.
    const pull = EU_LIFE_DECAY * (signal - prevLife);
    const life = prevLife + pull;

    if (trace !== undefined) {
        traceLife(trace, prevLife, births, deaths, population, net, netRate,
            signal, pull, life);
    }

    return life;
}

// Out of line for the same reason as traceFoodSignal below: a long cold branch
// counts against inlining the hot function it sits in.
function traceLife(
    trace: EuTrace,
    prevLife: number,
    births: number,
    deaths: number,
    population: number,
    net: number,
    netRate: number,
    signal: number,
    pull: number,
    life: number,
): void {
    trace.put(EuNode.PrevLife, prevLife);
    trace.put(EuNode.Births, births);
    trace.put(EuNode.Deaths, deaths);
    trace.put(EuNode.Population, population);
    trace.put(EuNode.Net, net);
    trace.put(EuNode.NetRate, netRate);
    trace.put(EuNode.LifeSignal, signal);
    trace.put(EuNode.LifePull, pull);
    trace.put(EuNode.Life, life);
}

// What a treat is worth to a clan eating this well or this badly. Nothing at
// all when they are starving, their face value when fed, a little more when
// there is plenty.
export function tasteScale(nutrition: number): number {
    if (nutrition <= EU_TASTE_ZERO_AT) return 0;
    if (nutrition >= EU_TASTE_BOOST_AT) return EU_TASTE_BOOST;
    if (nutrition < EU_TASTE_FULL_AT) {
        return (
            (nutrition - EU_TASTE_ZERO_AT) /
            (EU_TASTE_FULL_AT - EU_TASTE_ZERO_AT)
        );
    }
    return (
        1 +
        (EU_TASTE_BOOST - 1) *
            ((nutrition - EU_TASTE_FULL_AT) /
                (EU_TASTE_BOOST_AT - EU_TASTE_FULL_AT))
    );
}

// What a year's eating was worth: enough of it, varied enough to nourish, and
// with something in it to enjoy.
//
// The exponent is the one thing the Food subscore and Fortune differ in, so
// this is written once and called twice rather than copied. Because both may
// be on screen at the same time, each caller passes its own report; they would
// overwrite each other in a shared one.
//
// Keep the trace block at the bottom in step with the math above it.
export function computeFoodSignal(
    foodRatio: number,
    fishShare: number,
    cerealShare: number,
    quantityExponent: number,
    trace?: EuTrace,
): number {
    // Nourishment. Eating more than enough counts for nothing, so quantity is
    // held at zero from above and can only ever be a debt.
    const quantityRaw =
        EU_FOOD_SCALE * (Math.pow(foodRatio, quantityExponent) - 1);
    const quantity = quantityRaw > 0 ? 0 : quantityRaw;

    // Cereals past the share a mixed diet absorbs. Fish carries no penalty:
    // gathering and hunting bring variety of their own.
    const cerealExcess = cerealShare - EU_CEREAL_SHARE_FREE;
    const composition =
        cerealExcess > 0 ? -EU_CEREAL_NUTRITION_PENALTY * cerealExcess : 0;

    const nutrition = quantity + composition;

    // Pleasures, which are worth what the nourishment lets them be worth.
    const honey = EU_HONEY_PER_SHARE * fishShare;
    const beerRaw = EU_BEER_PER_SHARE * cerealShare;
    const beer = beerRaw > EU_BEER_MAX ? EU_BEER_MAX : beerRaw;
    const tasteRaw = honey + beer;
    const scale = tasteScale(nutrition);
    const taste = tasteRaw * scale;

    const signal = nutrition + taste;

    if (trace !== undefined) {
        traceFoodSignal(trace, foodRatio, fishShare, cerealShare, quantityRaw,
            quantity, composition, nutrition, honey, beer, tasteRaw, scale,
            taste, signal);
    }

    return signal;
}

// The reporting half of computeFoodSignal, kept in a function of its own
// rather than inline in the branch above.
//
// This is speed rather than tidiness, though less of it than hoped. A long
// cold branch counts against the budget V8 uses to decide whether to inline
// the function it sits in, so moving thirteen `put` calls out of the hot
// function is worth something: the benchmark put it at about 14% of the update
// path. It does not buy back all of the cost -- see the note on the honesty of
// the "costs nothing" claim in eudaimonia.bench.ts.
//
// Keep this in step with the math above it -- the two are adjacent for that
// reason.
function traceFoodSignal(
    trace: EuTrace,
    foodRatio: number,
    fishShare: number,
    cerealShare: number,
    quantityRaw: number,
    quantity: number,
    composition: number,
    nutrition: number,
    honey: number,
    beer: number,
    tasteRaw: number,
    scale: number,
    taste: number,
    signal: number,
): void {
    trace.put(EuNode.FoodRatio, foodRatio);
    trace.put(EuNode.FishShare, fishShare);
    trace.put(EuNode.CerealShare, cerealShare);
    trace.put(EuNode.QuantityRaw, quantityRaw);
    trace.put(EuNode.Quantity, quantity);
    trace.put(EuNode.Composition, composition);
    trace.put(EuNode.Nutrition, nutrition);
    trace.put(EuNode.Honey, honey);
    trace.put(EuNode.Beer, beer);
    trace.put(EuNode.TasteRaw, tasteRaw);
    trace.put(EuNode.TasteScale, scale);
    trace.put(EuNode.Taste, taste);
    trace.put(EuNode.HoneyScaled, honey * scale);
    trace.put(EuNode.BeerScaled, beer * scale);
    trace.put(EuNode.FoodSignal, signal);
}

// The standing Food subscore, moved by this year's eating.
export function computeFood(
    prevFood: number,
    foodRatio: number,
    fishShare: number,
    cerealShare: number,
    trace?: EuTrace,
): number {
    const signal = computeFoodSignal(
        foodRatio, fishShare, cerealShare, EU_FOOD_EXPONENT, trace);

    const pull = EU_FOOD_DECAY * (signal - prevFood);
    const food = prevFood + pull;

    if (trace !== undefined) {
        trace.put(EuNode.PrevFood, prevFood);
        trace.put(EuNode.FoodPull, pull);
        trace.put(EuNode.Food, food);
    }

    return food;
}

// Fortune: how the year itself went, rather than how the clan's life is
// going. The same chain on a straight quantity curve, and no running average
// after it.
export function computeFortune(
    foodRatio: number,
    fishShare: number,
    cerealShare: number,
    trace?: EuTrace,
): number {
    return computeFoodSignal(
        foodRatio, fishShare, cerealShare, EU_FORTUNE_EXPONENT, trace);
}

// --- Rolling up to a settlement -------------------------------------------

// The eudaimonia of a group of clans, as a population-weighted arithmetic
// mean.
//
// The plain mean is not a fallback here, it is the answer for the Life part:
// it is the only aggregation that makes averaging the clans agree with
// running the whole calculation on the group as one body. Weighting each clan
// by its people, the mean of the clan signals is
//
//     sum( (pop_i/P) * (net_i/pop_i) * k )  =  ( sum(net_i) / P ) * k
//
// which is exactly the signal the group would get from its own births,
// deaths, and headcount. And because the update is affine in the standing
// verdict and the signal, the identity carries through it.
//
// Food is not linear in its inputs -- it squares the shortfall, clamps, and
// scales the bonuses -- so the identity does not extend to it across clans
// eating differently. The average is still the right summary of the clans; it
// is just not the settlement's own food score.
export function eudaimoniaAverage(
    items: readonly { value: number; weight: number }[],
): number {
    let sum = 0;
    let weight = 0;
    for (const item of items) {
        if (!(item.weight > 0) || !Number.isFinite(item.value)) continue;
        sum += item.value * item.weight;
        weight += item.weight;
    }
    return weight > 0 ? sum / weight : 0;
}

// --- Per-clan state -------------------------------------------------------

// A clan's running eudaimonia, plus enough of last turn's inputs to replay the
// derivation when someone asks. The inputs are flat number fields, so keeping
// them costs no allocation.
export class Eudaimonia {
    life: number;
    food: number;

    // Last turn's inputs, held for replay.
    private prevLife_: number;
    private prevFood_: number;
    private births_: number;
    private deaths_: number;
    private population_: number;
    private foodRatio_: number;
    private fishShare_: number;
    private cerealShare_: number;
    private hasRun_: boolean;

    constructor(
        life = 0,
        food = 0,
        prevLife = 0,
        prevFood = 0,
        births = 0,
        deaths = 0,
        population = 0,
        foodRatio = 1,
        fishShare = 0.5,
        cerealShare = 0.5,
        hasRun = false,
    ) {
        this.life = life;
        this.food = food;
        this.prevLife_ = prevLife;
        this.prevFood_ = prevFood;
        this.births_ = births;
        this.deaths_ = deaths;
        this.population_ = population;
        this.foodRatio_ = foodRatio;
        this.fishShare_ = fishShare;
        this.cerealShare_ = cerealShare;
        this.hasRun_ = hasRun;
    }

    clone(): Eudaimonia {
        return new Eudaimonia(
            this.life,
            this.food,
            this.prevLife_,
            this.prevFood_,
            this.births_,
            this.deaths_,
            this.population_,
            this.foodRatio_,
            this.fishShare_,
            this.cerealShare_,
            this.hasRun_,
        );
    }

    // The verdict: the subscores added.
    get value(): number {
        return this.life + this.food;
    }

    get previousValue(): number {
        return this.prevLife_ + this.prevFood_;
    }

    // How this year went, on its own terms. Derived rather than stored: it is
    // a function of inputs already kept for replay, so the turn loop pays
    // nothing for it.
    get fortune(): number {
        return computeFortune(
            this.foodRatio_, this.fishShare_, this.cerealShare_);
    }

    // One subscore by key, for UI that walks EU_SUBSCORES.
    subscore(key: EuSubscoreKey): number {
        return key === "life" ? this.life : this.food;
    }

    previousSubscore(key: EuSubscoreKey): number {
        return key === "life" ? this.prevLife_ : this.prevFood_;
    }

    // How much the verdict moved last turn.
    get delta(): number {
        return this.hasRun_ ? this.value - this.previousValue : 0;
    }

    get hasRun(): boolean {
        return this.hasRun_;
    }

    // The turn update. Arithmetic only.
    update(
        births: number,
        deaths: number,
        population: number,
        foodRatio: number,
        fishShare: number,
        cerealShare: number,
    ): void {
        this.prevLife_ = this.life;
        this.prevFood_ = this.food;
        this.births_ = births;
        this.deaths_ = deaths;
        this.population_ = population;
        this.foodRatio_ = foodRatio;
        this.fishShare_ = fishShare;
        this.cerealShare_ = cerealShare;
        this.hasRun_ = true;
        this.life = computeLife(this.life, births, deaths, population);
        this.food = computeFood(
            this.food, foodRatio, fishShare, cerealShare);
    }

    // Replay last turn's update, keeping every intermediate. Only called when
    // someone opens the panel or hovers a tooltip.
    explain(): EudaimoniaReport {
        const report = new EudaimoniaReport();
        const life = computeLife(
            this.prevLife_,
            this.births_,
            this.deaths_,
            this.population_,
            report,
        );
        const food = computeFood(
            this.prevFood_,
            this.foodRatio_,
            this.fishShare_,
            this.cerealShare_,
            report,
        );
        report.put(EuNode.PrevValue, this.prevLife_ + this.prevFood_);
        report.put(EuNode.Value, life + food);
        return report;
    }

    // The same chain on Fortune's gentler quantity curve. A report of its own,
    // because the two would overwrite each other's steps in a shared one.
    explainFortune(): EudaimoniaReport {
        const report = new EudaimoniaReport();
        computeFortune(
            this.foodRatio_, this.fishShare_, this.cerealShare_, report);
        return report;
    }
}
