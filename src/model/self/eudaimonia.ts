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
//     Life    how the clan is growing or dying, over about a generation
//     Hunger  what going short of food has cost it, over about half that
//
// Subscores are added, not blended: a clan that is growing and starving is
// doing both, and the total should say so.
//
// ---------------------------------------------------------------------------
// A note on how the calculation is written
// ---------------------------------------------------------------------------
//
// The turn loop runs this for every clan every year, so the update path does
// arithmetic and nothing else: no intermediate objects, no arrays, no labels.
// But when someone opens the Eudaimonia panel we want the whole derivation,
// every intermediate value named and shown.
//
// The usual way to get both is to write the math twice -- once fast, once
// explained -- and then spend the rest of the project keeping the two copies
// honest. We avoid that entirely. There is ONE implementation of each
// subscore. It takes an optional trace sink; when the sink is absent (the turn
// loop) the function is pure arithmetic guarded by a single branch, and when
// it is present (the panel, replaying on demand) every intermediate is
// reported.
//
// The trick that makes this cost nothing is that the reporting happens in one
// block at the END, after the math, where every intermediate is still in scope
// as a local. So the fast path pays for exactly one correctly-predicted branch
// per subscore rather than one per step, and the math reads as ordinary math
// instead of being interleaved with bookkeeping.
//
// Each subscore is its own function returning a plain number, rather than one
// function returning a record of them. That keeps the update path free of
// allocation, which returning an object would not.
//
// Replay is possible later because the inputs are cheap to keep: a handful of
// numbers stored as flat fields on the instance, allocating nothing.
//
// If you add a step: add the local, then add its `put` to the trace block a
// few lines below, then add it to EU_NODES. All three are in this file within
// a screen of each other, which is the point.

// --- Tuning ---------------------------------------------------------------

// How much of the gap between a running subscore and this year's signal is
// closed per turn. Life is the slower of the two: 3% gives it a memory of
// roughly a generation, which is about right for something meant to summarize
// a life. Hunger moves at twice that, because going short is felt sooner and
// forgiven sooner than a line dying out is.
export const EU_LIFE_DECAY = 0.03;
export const EU_HUNGER_DECAY = 0.06;

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

// Food consumption is read as a share of what the clan needs, so 1 is enough
// to eat. The shortfall is raised to a power and scaled.
//
// Hunger, the standing subscore, squares it: going a little short costs a
// little and going badly short costs disproportionately more. At three-quarters
// rations the signal is about -44, at half about -75.
//
// Fortune reads the same input on a straight line, so a year's eating maps to
// a year's fortune proportionately: three-quarters rations is -25, half is
// -50. It is a report on the year rather than a judgement accumulated over
// many, so it does not lean on the shortfall the way Hunger does.
export const EU_HUNGER_SCALE = 100;
export const EU_HUNGER_EXPONENT = 2;
export const EU_FORTUNE_EXPONENT = 1;

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

    // Hunger
    PrevHunger: 9,
    Food: 10,
    HungerRaw: 11,
    HungerSignal: 12,
    HungerPull: 13,
    Hunger: 14,

    // Total
    PrevValue: 15,
    Value: 16,

    // Fortune: the year itself, not the running verdict.
    FortuneRaw: 17,
    Fortune: 18,
} as const;

export type EuNodeId = (typeof EuNode)[keyof typeof EuNode];

// --- Subscores ------------------------------------------------------------

export type EuSubscoreKey = "life" | "hunger";

// What a subscore is, and where to find its parts in a replay. The UI walks
// this rather than hardcoding the list, so a new subscore appears in the
// overview tooltip and the panel table without either being edited.
export interface EuSubscoreDef {
    key: EuSubscoreKey;
    label: string;
    // Share of the gap to its signal that one year closes.
    decay: number;
    // Whether the concern this subscore tracks is one Fortune also reports
    // on. Fortune reads the same inputs but on its own curve, so this marks
    // which subscores it speaks to, not a term it sums.
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
        key: "hunger",
        label: "Hunger",
        decay: EU_HUNGER_DECAY,
        inFortune: true,
        prevNode: EuNode.PrevHunger,
        signalNode: EuNode.HungerSignal,
        pullNode: EuNode.HungerPull,
        valueNode: EuNode.Hunger,
        blurb:
            "What going short of food has cost. Never positive: eating enough "
            + "is the most it can be worth.",
    },
];

// --- Node metadata --------------------------------------------------------

// How each point is meant to read on screen. Never touched by the update path.
export type EuNodeRole = "input" | "derived" | "result";

export interface EuNodeDef {
    id: EuNodeId;
    label: string;
    role: EuNodeRole;
    // Digits after the decimal point when shown.
    places: number;
    // Shown as a percentage rather than a bare number.
    isRate?: boolean;
    note: string;
}

export const EU_NODES: readonly EuNodeDef[] = [
    {
        id: EuNode.PrevLife,
        label: "Life last year",
        role: "input",
        places: 1,
        note: "Where the Life subscore stood at the end of last year.",
    },
    {
        id: EuNode.Births,
        label: "Births",
        role: "input",
        places: 1,
        note: "People born to the clan this year.",
    },
    {
        id: EuNode.Deaths,
        label: "Deaths",
        role: "input",
        places: 1,
        note: "People the clan lost this year.",
    },
    {
        id: EuNode.Population,
        label: "Population",
        role: "input",
        places: 0,
        note: "Clan size the rate is measured against.",
    },
    {
        id: EuNode.Net,
        label: "Net change",
        role: "derived",
        places: 1,
        note: "Births less deaths: whether the clan grew or shrank.",
    },
    {
        id: EuNode.NetRate,
        label: "Net rate",
        role: "derived",
        places: 2,
        isRate: true,
        note: "Net change as a share of the clan, so small and large clans compare.",
    },
    {
        id: EuNode.LifeSignal,
        label: "Life signal",
        role: "derived",
        places: 1,
        note: `The rate read as eudaimonia, at x${EU_VITALITY_SCALE}. Where Life would settle if every year went like this one.`,
    },
    {
        id: EuNode.LifePull,
        label: "Life pull",
        role: "derived",
        places: 2,
        note: `${(EU_LIFE_DECAY * 100).toFixed(0)}% of the distance from last year's Life to this year's signal.`,
    },
    {
        id: EuNode.Life,
        label: "Life",
        role: "result",
        places: 1,
        note: "Last year's Life moved by this year's pull.",
    },

    {
        id: EuNode.PrevHunger,
        label: "Hunger last year",
        role: "input",
        places: 1,
        note: "Where the Hunger subscore stood at the end of last year.",
    },
    {
        id: EuNode.Food,
        label: "Food",
        role: "input",
        places: 2,
        isRate: true,
        note: "Food consumed per head, as a share of what the clan needs.",
    },
    {
        id: EuNode.HungerRaw,
        label: "Before clamping",
        role: "derived",
        places: 1,
        note: `${EU_HUNGER_SCALE} x (food^${EU_HUNGER_EXPONENT} - 1), which runs positive when there is more than enough.`,
    },
    {
        id: EuNode.HungerSignal,
        label: "Hunger signal",
        role: "derived",
        places: 1,
        note: "The same, held at zero from above: eating well is worth nothing here, only going short costs.",
    },
    {
        id: EuNode.HungerPull,
        label: "Hunger pull",
        role: "derived",
        places: 2,
        note: `${(EU_HUNGER_DECAY * 100).toFixed(0)}% of the distance from last year's Hunger to this year's signal.`,
    },
    {
        id: EuNode.Hunger,
        label: "Hunger",
        role: "result",
        places: 1,
        note: "Last year's Hunger moved by this year's pull.",
    },

    {
        id: EuNode.PrevValue,
        label: "Total last year",
        role: "input",
        places: 1,
        note: "The two subscores as they stood at the end of last year.",
    },
    {
        id: EuNode.Value,
        label: "Eudaimonia",
        role: "result",
        places: 1,
        note: "Life and Hunger added.",
    },
    {
        id: EuNode.FortuneRaw,
        label: "Before clamping",
        role: "derived",
        places: 1,
        note: `${EU_HUNGER_SCALE} x (food^${EU_FORTUNE_EXPONENT} - 1), which runs positive when there is more than enough.`,
    },
    {
        id: EuNode.Fortune,
        label: "Fortune",
        role: "result",
        places: 1,
        note: "How this year went, before the long verdict absorbs it.",
    },
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

    // The value at a point in the derivation, or 0 if the replay never got
    // there. Callers index with EuNode.Whatever.
    get(id: EuNodeId): number {
        return this.values_.get(id) ?? 0;
    }

    has(id: EuNodeId): boolean {
        return this.values_.has(id);
    }

    // Every recorded step in declaration order, paired with how to show it.
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
// On the relaxation form both subscores use:
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

    return life;
}

// What this year's eating, on its own, says about the clan.
//
// Split out from computeHunger because Fortune is exactly this quantity: the
// year itself, before the running average absorbs it. Both read the same
// implementation rather than each having their own copy of the curve.
//
// Keep the trace block at the bottom in step with the math above it.
// The shape Hunger and Fortune both read food through, differing only in the
// exponent. Written once so the two cannot drift apart in anything but that.
// Returns the unclamped value; each caller holds it at zero itself, because
// each reports the before and after under its own names.
function shortfallRaw(food: number, exponent: number): number {
    return EU_HUNGER_SCALE * (Math.pow(food, exponent) - 1);
}

export function hungerSignal(food: number, trace?: EuTrace): number {
    const raw = shortfallRaw(food, EU_HUNGER_EXPONENT);

    // Held at zero from above. Eating more than enough is not what this is
    // about; it can only ever be a debt.
    const signal = raw > 0 ? 0 : raw;

    if (trace !== undefined) {
        trace.put(EuNode.Food, food);
        trace.put(EuNode.HungerRaw, raw);
        trace.put(EuNode.HungerSignal, signal);
    }

    return signal;
}

// What going short of food has cost the clan, over the years.
//
// Keep the trace block at the bottom in step with the math above it.
export function computeHunger(
    prevHunger: number,
    food: number,
    trace?: EuTrace,
): number {
    const signal = hungerSignal(food, trace);

    const pull = EU_HUNGER_DECAY * (signal - prevHunger);
    const hunger = prevHunger + pull;

    if (trace !== undefined) {
        trace.put(EuNode.PrevHunger, prevHunger);
        trace.put(EuNode.HungerPull, pull);
        trace.put(EuNode.Hunger, hunger);
    }

    return hunger;
}

// Fortune: how the year itself went, rather than how the clan's life is
// going. It is the sum of the current-turn signals of whichever subscores are
// marked as counting toward it -- for now only Hunger, so it runs from 0 for
// a well-fed year down to -100 for a starving one.
//
// Nothing is stored for it and nothing is computed for it during the turn: it
// is a function of inputs the clan already keeps, so it costs nothing until
// something asks.
export function computeFortune(food: number, trace?: EuTrace): number {
    const raw = shortfallRaw(food, EU_FORTUNE_EXPONENT);
    const fortune = raw > 0 ? 0 : raw;

    if (trace !== undefined) {
        trace.put(EuNode.Food, food);
        trace.put(EuNode.FortuneRaw, raw);
        trace.put(EuNode.Fortune, fortune);
    }

    return fortune;
}

// --- Rolling up to a settlement -------------------------------------------

// The eudaimonia of a group of clans, as a population-weighted arithmetic
// mean.
//
// The plain mean is not a fallback here, it is the answer: it is the only
// aggregation that makes averaging the clans agree with running the whole
// calculation on the group as one body. Weighting each clan by its people,
// the mean of the clan signals is
//
//     sum( (pop_i/P) * (net_i/pop_i) * k )  =  ( sum(net_i) / P ) * k
//
// which is exactly the signal the group would get from its own births,
// deaths, and headcount. And because the update is affine in the standing
// verdict and the signal, the identity carries through it: average the clans'
// new values and you get the group's new value. A geometric mean, or any
// other curve, would break that -- the settlement would disagree with its own
// parts, and the disagreement would compound every turn.
//
// (Exact while the clans are fixed over the turn. Splits, merges, and clans
// dying out move people between the parts and the whole, so the two can drift
// slightly across such a year. Hunger is not linear in food, so the identity
// does not extend to it across clans eating differently: the average is still
// the right summary of the clans, it is just not the settlement's own hunger.)
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
    hunger: number;

    // Last turn's inputs, held for replay.
    private prevLife_: number;
    private prevHunger_: number;
    private births_: number;
    private deaths_: number;
    private population_: number;
    private food_: number;
    private hasRun_: boolean;

    constructor(
        life = 0,
        hunger = 0,
        prevLife = 0,
        prevHunger = 0,
        births = 0,
        deaths = 0,
        population = 0,
        food = 1,
        hasRun = false,
    ) {
        this.life = life;
        this.hunger = hunger;
        this.prevLife_ = prevLife;
        this.prevHunger_ = prevHunger;
        this.births_ = births;
        this.deaths_ = deaths;
        this.population_ = population;
        this.food_ = food;
        this.hasRun_ = hasRun;
    }

    clone(): Eudaimonia {
        return new Eudaimonia(
            this.life,
            this.hunger,
            this.prevLife_,
            this.prevHunger_,
            this.births_,
            this.deaths_,
            this.population_,
            this.food_,
            this.hasRun_,
        );
    }

    // The verdict: the subscores added.
    get value(): number {
        return this.life + this.hunger;
    }

    // How this year went, on its own terms. Derived rather than stored: it is
    // a function of food, which is already kept for replay, so the turn loop
    // pays nothing for it.
    get fortune(): number {
        return computeFortune(this.food_);
    }

    get previousValue(): number {
        return this.prevLife_ + this.prevHunger_;
    }

    // One subscore by key, for UI that walks EU_SUBSCORES.
    subscore(key: EuSubscoreKey): number {
        return key === "life" ? this.life : this.hunger;
    }

    previousSubscore(key: EuSubscoreKey): number {
        return key === "life" ? this.prevLife_ : this.prevHunger_;
    }

    // How much the verdict moved last turn.
    get delta(): number {
        return this.hasRun_ ? this.value - this.previousValue : 0;
    }

    // Whether there is a derivation to show yet.
    get hasRun(): boolean {
        return this.hasRun_;
    }

    // The turn update. Arithmetic only.
    update(
        births: number,
        deaths: number,
        population: number,
        food: number,
    ): void {
        this.prevLife_ = this.life;
        this.prevHunger_ = this.hunger;
        this.births_ = births;
        this.deaths_ = deaths;
        this.population_ = population;
        this.food_ = food;
        this.hasRun_ = true;
        this.life = computeLife(this.life, births, deaths, population);
        this.hunger = computeHunger(this.hunger, food);
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
        const hunger = computeHunger(this.prevHunger_, this.food_, report);
        report.put(EuNode.PrevValue, this.prevLife_ + this.prevHunger_);
        report.put(EuNode.Value, life + hunger);
        computeFortune(this.food_, report);
        return report;
    }
}
