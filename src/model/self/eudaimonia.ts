// Eudaimonia: how well a clan's life is actually going, judged over the long
// run rather than turn by turn.
//
// Unlike quality of life, which reads the current year's conditions, this is a
// slow-moving verdict on a clan's whole run of years. It notionally sits
// between -100 and 100 -- 0 being an unremarkable life, positive being a life
// worth having lived -- but nothing clamps it, because a clan can do
// spectacularly well or spectacularly badly and the number should say so.
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
// honest. We avoid that entirely. There is ONE implementation. It takes an
// optional trace sink; when the sink is absent (the turn loop) the function is
// pure arithmetic guarded by a single branch, and when it is present (the
// panel, replaying on demand) every intermediate is reported.
//
// The trick that makes this cost nothing is that the reporting happens in one
// block at the END, after the math, where every intermediate is still in scope
// as a local. So the fast path pays for exactly one correctly-predicted branch
// rather than one per step, and the math reads as ordinary math instead of
// being interleaved with bookkeeping.
//
// Replay is possible later because the inputs are cheap to keep: a handful of
// numbers stored as flat fields on the instance, allocating nothing.
//
// If you add a step: add the local, then add its `put` to the trace block a
// few lines below, then add it to EU_NODES. All three are in this file within
// a screen of each other, which is the point.

// --- Tuning ---------------------------------------------------------------

// How much of the gap between the running verdict and this year's signal is
// closed per turn. 3% gives a memory of roughly a generation, which is about
// right for something meant to summarize a life rather than a season.
export const EU_DECAY = 0.03;

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

// Keeps the per-capita rate finite for a clan that has just lost everyone.
const MIN_POPULATION = 1;

// --- The calculation graph ------------------------------------------------

// Named points in the derivation. A plain const object rather than an enum so
// the values stay ordinary numbers and the module has no runtime baggage.
export const EuNode = {
    PrevValue: 0,
    Births: 1,
    Deaths: 2,
    Population: 3,
    Net: 4,
    NetRate: 5,
    Signal: 6,
    Pull: 7,
    Value: 8,
} as const;

export type EuNodeId = (typeof EuNode)[keyof typeof EuNode];

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
        id: EuNode.PrevValue,
        label: "Standing verdict",
        role: "input",
        places: 1,
        note: "Where the clan's eudaimonia stood at the end of last year.",
    },
    {
        id: EuNode.Births,
        label: "Births",
        role: "input",
        places: 2,
        note: "People born to the clan this year.",
    },
    {
        id: EuNode.Deaths,
        label: "Deaths",
        role: "input",
        places: 2,
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
        places: 2,
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
        id: EuNode.Signal,
        label: "This year's signal",
        role: "derived",
        places: 1,
        note: `The rate read as eudaimonia, at ×${EU_VITALITY_SCALE}. What the clan's eudaimonia would settle at if every year went like this one.`,
    },
    {
        id: EuNode.Pull,
        label: "Pull",
        role: "derived",
        places: 2,
        note: `${(EU_DECAY * 100).toFixed(0)}% of the distance from the standing verdict to this year's signal.`,
    },
    {
        id: EuNode.Value,
        label: "Eudaimonia",
        role: "result",
        places: 1,
        note: "The standing verdict moved by this year's pull.",
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

// A trace that keeps what it is told, for the panel and the tooltip.
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

// The one implementation. Called every turn for every clan with no trace, and
// on demand with a trace when someone wants to see the working.
//
// Keep the trace block at the bottom in step with the math above it.
export function computeEudaimonia(
    prevValue: number,
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

    // One year is only one year. It moves the standing verdict a little way
    // toward itself and no further.
    //
    // This is the ordinary exponential moving average, written as a relaxation
    // rather than expanded: the standing verdict IS scaled by (1 - EU_DECAY),
    // just implicitly, since
    //
    //     prev + a*(signal - prev)  ==  (1 - a)*prev + a*signal
    //
    // The relaxation form is used because it names `pull` -- how far this year
    // actually moved things -- which is the quantity the panel draws, and
    // because it keeps the correction small relative to prev instead of
    // rescaling a large number every turn.
    //
    // Note this decays toward the signal, not toward zero. Decaying toward
    // zero and adding the signal on top would be a different model, settling
    // at signal/EU_DECAY -- some 33x higher.
    const pull = EU_DECAY * (signal - prevValue);
    const value = prevValue + pull;

    if (trace !== undefined) {
        trace.put(EuNode.PrevValue, prevValue);
        trace.put(EuNode.Births, births);
        trace.put(EuNode.Deaths, deaths);
        trace.put(EuNode.Population, population);
        trace.put(EuNode.Net, net);
        trace.put(EuNode.NetRate, netRate);
        trace.put(EuNode.Signal, signal);
        trace.put(EuNode.Pull, pull);
        trace.put(EuNode.Value, value);
    }

    return value;
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
// slightly across such a year.)
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
    value: number;

    // Last turn's inputs, held for replay.
    private prevValue_: number;
    private births_: number;
    private deaths_: number;
    private population_: number;
    private hasRun_: boolean;

    constructor(
        value = 0,
        prevValue = 0,
        births = 0,
        deaths = 0,
        population = 0,
        hasRun = false,
    ) {
        this.value = value;
        this.prevValue_ = prevValue;
        this.births_ = births;
        this.deaths_ = deaths;
        this.population_ = population;
        this.hasRun_ = hasRun;
    }

    clone(): Eudaimonia {
        return new Eudaimonia(
            this.value,
            this.prevValue_,
            this.births_,
            this.deaths_,
            this.population_,
            this.hasRun_,
        );
    }

    // How much the verdict moved last turn.
    get delta(): number {
        return this.hasRun_ ? this.value - this.prevValue_ : 0;
    }

    // Whether there is a derivation to show yet.
    get hasRun(): boolean {
        return this.hasRun_;
    }

    // The turn update. Arithmetic only.
    update(births: number, deaths: number, population: number): void {
        this.prevValue_ = this.value;
        this.births_ = births;
        this.deaths_ = deaths;
        this.population_ = population;
        this.hasRun_ = true;
        this.value = computeEudaimonia(this.value, births, deaths, population);
    }

    // Replay last turn's update, keeping every intermediate. Only called when
    // someone opens the panel or hovers the tooltip.
    explain(): EudaimoniaReport {
        const report = new EudaimoniaReport();
        computeEudaimonia(
            this.prevValue_,
            this.births_,
            this.deaths_,
            this.population_,
            report,
        );
        return report;
    }
}
