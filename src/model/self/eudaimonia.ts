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
//     Life     how the clan is growing or dying, over about a generation
//     Fortune  how its years have been going, over about half that
//
// Subscores are added, not blended: a clan that is growing and miserable is
// doing both, and the total should say so.
//
// Fortune is how a year went, and it is a tree:
//
//     Fortune
//       Material
//         Food
//           Nutrition     enough to eat, and balanced enough to nourish
//           Taste
//             Honey       the pleasures of a gathered diet
//             Beer        the pleasures of a cereal one
//       Social
//         Care
//           Comfort       how well looked after everyone was
//           Stress        what the looking after cost those doing it
//         Conversation
//           Quantity      how many people outside the clan it knows
//           Quality       how well it gets on with them
//
// Each inner node combines its children, by default by adding them. The
// nodes where the parts are needs that make up for each other only so far --
// those with quantity and quality under them, Social, and Fortune itself --
// BLEND them instead, which lets a bad part drag the whole down. See
// "Combining" below. The year's Fortune, shown on its own, is the tree as it
// stands. The Fortune subscore averages it over the years.
//
// FORTUNE_TREE below is the tree as data, for the UI to walk. The calculation
// follows the same shape, one function per subtree.
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
// This is not quite free -- with the full Fortune tree and its blends the
// update path benchmarks at roughly 1.35x the inlined floor, about 30ms over a
// 2000-turn run of 100 clans -- but it is far cheaper than building the
// labeled detail every turn, and allocates nothing. The blends' exp and log
// are most of what the floor itself costs now. Re-run eudaimonia.bench.ts if the tree grows again.
//
// Each part is its own function returning a plain number, rather than one
// function returning a record of them. That keeps the update path free of
// allocation, which returning an object would not.
//
// The Fortune subscore's replay (explain) and the year's Fortune on its own
// (explainFortune) each get a report, so the panel can show either without
// running the parts it does not need.
//
// If you add a step: add the local, then add its `put` to the trace block a
// few lines below, then add it to EU_NODES (and FORTUNE_TREE, if it is part of
// the tree). All of them are in this file, which is the point.

import { careComfort, careSkillFactor, careStress } from "../people/care";
import { foodBalance, nutritionFromRaw } from "../people/nutrition";

// --- Tuning ---------------------------------------------------------------

// How much of the gap between a running subscore and this year's signal is
// closed per turn. Life is the slower of the two: 3% gives it a memory of
// roughly a generation, which is about right for something meant to summarize
// a life. Fortune moves at twice that, because a bad run of years is felt
// sooner and forgiven sooner than a line dying out is.
export const EU_LIFE_DECAY = 0.03;
export const EU_FORTUNE_DECAY = 0.06;

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
// Nutrition reads the clan's nutritional state -- how much it ate times how
// well balanced it was, 1 being everything its people need; see
// people/nutrition.ts -- as points of Fortune:
//
//     SCALE * (1 - e^(-RATE * (nutrition - 1)))
//
// A saturating exponential: nothing at 1, rising toward +SCALE above it and
// falling ever faster below. Nutrition itself tops out at 1.25, where this
// comes to about +10; at 90% it is -9, at 80% -24, at 70% -49, at 50% -157.
export const EU_NUTRITION_SCALE = 14;
export const EU_NUTRITION_RATE = 5;

export function nutritionFortune(nutrition: number): number {
    return EU_NUTRITION_SCALE * -Math.expm1(-EU_NUTRITION_RATE * (nutrition - 1));
}

// The pleasures each kind of food brings, beyond nourishment. Gatherers turn
// up honey and the like, worth a little in proportion to how much of the diet
// they provide. Cereals make beer, worth rather more, but only so much beer is
// any use.
export const EU_HONEY_PER_SHARE = 5;
export const EU_BEER_PER_SHARE = 20;
export const EU_BEER_MAX = 10;

// --- Conversation ------------------------------------------------------------
//
// Quantity reads how many people outside the clan its people deal with
// regularly -- its acquaintance, summed over every clan it converses with; see
// relations/conversation.ts. An ordinary clan knows about 70. More is better,
// but each doubling is worth the same, so this many points per doubling from
// the standard, and a clan that knows next to nobody bottoms out at the floor
// rather than running off to minus infinity: 4 doublings short, -16.
export const EU_CONVERSATION_STANDARD = 70;
export const EU_CONVERSATION_PER_DOUBLING = 4;
export const EU_CONVERSATION_FLOOR = EU_CONVERSATION_STANDARD / 16;

// Quality reads how well the clan gets on with the people it talks to: its
// absolute affinity for each clan it converses with, averaged by acquaintance.
// Clans mostly sit between 0.5 and 0.85, so 0.6 is the neutral point, and a
// clan that talks only with those it has everything in common with (1.0) is
// +10 better for it.
export const EU_CONVERSATION_NEUTRAL_AFFINITY = 0.6;
export const EU_CONVERSATION_QUALITY_SCALE = 25;

// --- Combining -------------------------------------------------------------
//
// How an inner node of the Fortune tree makes one value of its children's.
// Every combiner has the same form: lift each child onto its own scale, add
// the lifted values, and finish the total back into eudaimonia units. That is
// general enough for anything we are likely to want, and needs no arrays, so
// the update path stays free of allocation.
//
// SUM lifts and finishes with the identity: plain addition.
//
// BLEND is a quasi-arithmetic mean: a mean taken on a curve,
//
//     blend(x...) = f^-1( mean f(x) )
//
//     f(x) =  e^(x/U) - 1     for x >= 0
//     f(x) =  1 - e^(-x/D)    for x <  0
//
// f runs straight through zero with slope about 1, but it bends upward above
// zero and bends down much harder below it. So a mean taken on it is pulled
// toward the high values when all is well, a little, and toward the low ones
// when anything is going badly, a lot -- more the worse it is going, and more
// the more parts are going badly. At U = 120 and D = 60:
//
//     0 and +100       -> +60   (the mean is +50)
//     -1 and +100      -> +59.5 (a small want barely registers)
//     -100 and +100    -> -55   (the mean is 0)
//     -100, -100, +100 -> -74
//     -20 and -1       -> -11
//
// Note that it is a mean, not a total: two parts at +10 blend to +10, where
// they would sum to +20.
export const EU_BLEND_UP_SCALE = 120;
export const EU_BLEND_DOWN_SCALE = 60;

export interface EuCombiner {
    readonly key: "sum" | "blend";
    readonly label: string;
    lift(x: number): number;
    finish(total: number, count: number): number;
}

export const SUM: EuCombiner = {
    key: "sum",
    label: "Sum",
    lift: (x) => x,
    finish: (total) => total,
};

function blendLift(x: number): number {
    return x >= 0
        ? Math.expm1(x / EU_BLEND_UP_SCALE)
        : -Math.expm1(-x / EU_BLEND_DOWN_SCALE);
}

function blendFinish(total: number, count: number): number {
    const m = total / count;
    return m >= 0
        ? EU_BLEND_UP_SCALE * Math.log1p(m)
        : -EU_BLEND_DOWN_SCALE * Math.log1p(-m);
}

export const BLEND: EuCombiner = {
    key: "blend",
    label: "Blend",
    lift: blendLift,
    finish: blendFinish,
};

// Keeps the per-capita rate finite for a clan that has just lost everyone.
const MIN_POPULATION = 1;

// --- Inputs ----------------------------------------------------------------

// What Fortune reads about a year. Flat number fields, written in place each
// turn, so keeping them for replay costs no allocation.
export class FortuneInputs {
    // Food eaten per head, as a share of what the clan needs.
    foodRatio = 1;
    // Shares of the diet. Fish stands for hunting and gathering, cereals for
    // mixed farming; the two are complementary.
    fishShare = 0.5;
    cerealShare = 0.5;
    // Care effort given, as a share of the standard.
    careEffort = 1;
    // The clan's Care skill.
    careSkill = 50;
    // Share of the clan's effort that went into care.
    careShare = 0.2;
    // People outside the clan its people deal with regularly.
    conversationAmount = EU_CONVERSATION_STANDARD;
    // Acquaintance-weighted absolute affinity for those people's clans.
    conversationAffinity = EU_CONVERSATION_NEUTRAL_AFFINITY;

    copyFrom(o: FortuneInputs): void {
        this.foodRatio = o.foodRatio;
        this.fishShare = o.fishShare;
        this.cerealShare = o.cerealShare;
        this.careEffort = o.careEffort;
        this.careSkill = o.careSkill;
        this.careShare = o.careShare;
        this.conversationAmount = o.conversationAmount;
        this.conversationAffinity = o.conversationAffinity;
    }

    clone(): FortuneInputs {
        const c = new FortuneInputs();
        c.copyFrom(this);
        return c;
    }
}

// --- The calculation graph ------------------------------------------------

// Named points in the derivation. A plain const object rather than an enum so
// the values stay ordinary numbers and the module has no runtime baggage.
// Fortune's nodes are grouped as its tree is.
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

    // Fortune's inputs
    FoodRatio: 10,
    FishShare: 11,
    CerealShare: 12,
    CareEffort: 13,
    CareSkillLevel: 14,
    CareShare: 17,
    ConversationAmount: 15,
    ConversationAffinity: 16,

    // Fortune
    Fortune: 20,

    //   Material
    Material: 21,
    //     Food
    Food: 22,
    //       Nutrition
    FoodNutrition: 23,
    FoodBalance: 24,
    NutritionRaw: 25,
    NutritionLevel: 26,
    //       Taste
    FoodTaste: 27,
    Honey: 28,
    Beer: 29,
    BeerRaw: 37,

    //   Social
    Social: 30,
    //     Care
    Care: 31,
    CareComfort: 32,
    CareStress: 33,
    CareProvision: 38,
    //     Conversation
    Conversation: 34,
    ConversationQuantity: 35,
    ConversationQuality: 36,

    // The Fortune subscore: the tree, averaged over the years
    PrevFortune: 40,
    FortunePull: 41,
    FortuneSubscore: 42,

    // Totals
    PrevValue: 50,
    Value: 51,
} as const;

export type EuNodeId = (typeof EuNode)[keyof typeof EuNode];

// --- The Fortune tree -----------------------------------------------------

// One node of Fortune's tree. Labels and notes live with the node metadata in
// EU_NODES; this is only the shape, and how each inner node combines its
// children. Sum unless it says otherwise.
export interface FortuneTreeNode {
    node: EuNodeId;
    combine?: EuCombiner;
    children?: readonly FortuneTreeNode[];
}

export const FORTUNE_TREE: FortuneTreeNode = {
    node: EuNode.Fortune,
    combine: BLEND,
    children: [
        {
            node: EuNode.Material,
            children: [
                {
                    node: EuNode.Food,
                    children: [
                        { node: EuNode.FoodNutrition },
                        {
                            node: EuNode.FoodTaste,
                            children: [
                                { node: EuNode.Honey },
                                { node: EuNode.Beer },
                            ],
                        },
                    ],
                },
            ],
        },
        {
            node: EuNode.Social,
            combine: BLEND,
            children: [
                {
                    node: EuNode.Care,
                    children: [
                        { node: EuNode.CareComfort },
                        { node: EuNode.CareStress },
                    ],
                },
                {
                    node: EuNode.Conversation,
                    combine: BLEND,
                    children: [
                        { node: EuNode.ConversationQuantity },
                        { node: EuNode.ConversationQuality },
                    ],
                },
            ],
        },
    ],
};

// The tree flattened in reading order, each node with its depth below the
// root (which is depth 0), whether it combines children of its own, and how.
// The panel and the tooltips walk this rather than naming rows themselves.
export interface FortuneRow {
    node: EuNodeId;
    depth: number;
    hasChildren: boolean;
    combine: EuCombiner;
}

function flattenTree(t: FortuneTreeNode, depth: number, out: FortuneRow[]): FortuneRow[] {
    out.push({
        node: t.node,
        depth,
        hasChildren: !!t.children?.length,
        combine: t.combine ?? SUM,
    });
    for (const c of t.children ?? []) flattenTree(c, depth + 1, out);
    return out;
}

export const FORTUNE_ROWS: readonly FortuneRow[] = flattenTree(FORTUNE_TREE, 0, []);

// Each node's combiner, indexed by node id, for the calculation to look up.
// Nodes outside the tree, and leaves, read as sums, which is harmless.
const COMBINER_OF: readonly EuCombiner[] = (() => {
    const out: EuCombiner[] = [];
    for (const id of Object.values(EuNode)) out[id] = SUM;
    for (const row of FORTUNE_ROWS) out[row.node] = row.combine;
    return out;
})();

export function combinerOf(node: EuNodeId): EuCombiner {
    return COMBINER_OF[node];
}

// Combine children as the tree says `node` does. Fixed arities rather than an
// array, so the update path allocates nothing.
//
// The combiners we have are called directly rather than through the
// interface: going through lift and finish makes every call site see every
// combiner, which V8 will not inline, and the benchmark put that at about
// double the cost of the whole update. Any other combiner takes the general
// path and works, just more slowly.
function combine1(node: EuNodeId, a: number): number {
    const c = COMBINER_OF[node];
    if (c === SUM) return a;
    if (c === BLEND) return blendFinish(blendLift(a), 1);
    return c.finish(c.lift(a), 1);
}

function combine2(node: EuNodeId, a: number, b: number): number {
    const c = COMBINER_OF[node];
    if (c === SUM) return a + b;
    if (c === BLEND) return blendFinish(blendLift(a) + blendLift(b), 2);
    return c.finish(c.lift(a) + c.lift(b), 2);
}

// Each inner node's children, for showing what a sum is made of.
export const FORTUNE_CHILDREN: ReadonlyMap<EuNodeId, readonly EuNodeId[]> = new Map(
    (function collect(t: FortuneTreeNode): [EuNodeId, EuNodeId[]][] {
        const kids = t.children ?? [];
        return [
            ...(kids.length ? [[t.node, kids.map((k) => k.node)] as [EuNodeId, EuNodeId[]]] : []),
            ...kids.flatMap(collect),
        ];
    })(FORTUNE_TREE),
);

// --- Subscores ------------------------------------------------------------

export type EuSubscoreKey = "life" | "fortune";

// What a subscore is, and where to find its parts in a replay. The UI walks
// this rather than hardcoding the list, so a new subscore appears in the
// overview tooltip and the panel table without either being edited.
export interface EuSubscoreDef {
    key: EuSubscoreKey;
    label: string;
    // Share of the gap to its signal that one year closes.
    decay: number;
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
        prevNode: EuNode.PrevLife,
        signalNode: EuNode.LifeSignal,
        pullNode: EuNode.LifePull,
        valueNode: EuNode.Life,
        blurb: "Whether the clan is growing or dying, as a share of itself.",
    },
    {
        key: "fortune",
        label: "Fortune",
        decay: EU_FORTUNE_DECAY,
        prevNode: EuNode.PrevFortune,
        signalNode: EuNode.Fortune,
        pullNode: EuNode.FortunePull,
        valueNode: EuNode.FortuneSubscore,
        blurb:
            "How the clan's years have been going: enough to eat, and good to "
            + "eat, looked after, and with people to talk to.",
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

    { id: EuNode.FoodRatio, label: "Rations", role: "input", places: 2, isRate: true,
      note: "Food eaten per head, as a share of what the clan needs." },
    { id: EuNode.FishShare, label: "Fish share", role: "input", places: 0, isRate: true,
      note: "Share of the diet from fishing, standing for hunting and gathering generally." },
    { id: EuNode.CerealShare, label: "Cereal share", role: "input", places: 0, isRate: true,
      note: "Share of the diet from farming, standing for mixed farming with herds." },
    { id: EuNode.CareEffort, label: "Care effort", role: "input", places: 0, isRate: true,
      note: "Care effort given, as a share of what the clan's children need." },
    { id: EuNode.CareSkillLevel, label: "Care skill", role: "input", places: 0,
      note: "The clan's skill at looking after people." },
    { id: EuNode.CareShare, label: "Care share", role: "input", places: 0, isRate: true,
      note: "Share of the clan's effort that went into looking after people." },
    { id: EuNode.ConversationAmount, label: "Acquaintance", role: "input", places: 0,
      note: "People outside the clan its people deal with regularly." },
    { id: EuNode.ConversationAffinity, label: "Affinity", role: "input", places: 2,
      note: "The clan's affinity for the clans it talks with, averaged by acquaintance." },

    { id: EuNode.Fortune, label: "Fortune", role: "result", places: 1,
      note: "Material and social fortune blended: a bad side drags the whole down." },

    { id: EuNode.Material, label: "Material", role: "derived", places: 1,
      note: "What the year was worth in things: for now, only food." },
    { id: EuNode.Food, label: "Food", role: "derived", places: 1,
      note: "Nutrition and taste added: what this year's eating was worth." },
    { id: EuNode.FoodNutrition, label: "Nutrition", role: "derived", places: 1,
      note: "The clan's nutritional state as Fortune: nothing at 100%, about -50 at 70%, up to about +10 at the 125% ceiling." },
    { id: EuNode.FoodBalance, label: "Balance", role: "derived", places: 2, isRate: true,
      note: "How well the mix of foods covers what people need: 100% at 30% cereals, 90% at all fish, 70% at all cereal." },
    { id: EuNode.NutritionRaw, label: "Before the ceiling", role: "derived", places: 2, isRate: true,
      note: "Rations times balance, before diminishing returns past 100%." },
    { id: EuNode.NutritionLevel, label: "Nutrition level", role: "derived", places: 2, isRate: true,
      note: "The clan's nutritional state, where 100% is everything its people need." },
    { id: EuNode.FoodTaste, label: "Taste", role: "derived", places: 1,
      note: "Honey and beer added: what the food was worth beyond nourishment." },
    { id: EuNode.Honey, label: "Honey", role: "derived", places: 1,
      note: "The pleasures of a gathered diet, in proportion to how much of it the gatherers provide." },
    { id: EuNode.Beer, label: "Beer", role: "derived", places: 1,
      note: `The pleasures of a cereal one, up to the point of enough: held at ${EU_BEER_MAX}.` },
    { id: EuNode.BeerRaw, label: "Before capping", role: "derived", places: 1,
      note: "What the cereals would have brewed, before only so much beer is any use." },

    { id: EuNode.Social, label: "Social", role: "derived", places: 1,
      note: "What the year was worth in people: care and conversation blended." },
    { id: EuNode.Care, label: "Care", role: "derived", places: 1,
      note: "How well looked after everyone was, and what it cost those doing it, added." },
    { id: EuNode.CareProvision, label: "Care provided", role: "derived", places: 2, isRate: true,
      note: "Care effort against the standard, times what the clan's skill made of it." },
    { id: EuNode.CareComfort, label: "Comfort", role: "derived", places: 1,
      note: "How well looked after everyone was: care provided, at 50 a doubling from the standard." },
    { id: EuNode.CareStress, label: "Stress", role: "derived", places: 1,
      note: "What the looking after cost the people doing it: nothing at a fifth of the clan's effort, a little easier below that, and wearing fast above." },
    { id: EuNode.Conversation, label: "Conversation", role: "derived", places: 1,
      note: "How many people outside the clan it knows, and how well it gets on with them, blended." },
    { id: EuNode.ConversationQuantity, label: "Quantity", role: "derived", places: 1,
      note: `People outside the clan dealt with regularly, at ${EU_CONVERSATION_PER_DOUBLING} a doubling from ${EU_CONVERSATION_STANDARD}.` },
    { id: EuNode.ConversationQuality, label: "Quality", role: "derived", places: 1,
      note: `How much the clan has in common with the people it talks to, against an affinity of ${EU_CONVERSATION_NEUTRAL_AFFINITY}.` },

    { id: EuNode.PrevFortune, label: "Fortune last year", role: "input", places: 1,
      note: "Where the Fortune subscore stood at the end of last year." },
    { id: EuNode.FortunePull, label: "Fortune pull", role: "derived", places: 2,
      note: `${(EU_FORTUNE_DECAY * 100).toFixed(0)}% of the distance from last year's Fortune subscore to this year's signal.` },
    { id: EuNode.FortuneSubscore, label: "Fortune", role: "result", places: 1,
      note: "Last year's Fortune subscore moved by this year's pull." },

    { id: EuNode.PrevValue, label: "Total last year", role: "input", places: 1,
      note: "The two subscores as they stood at the end of last year." },
    { id: EuNode.Value, label: "Eudaimonia", role: "result", places: 1,
      note: "Life and Fortune added." },
];

export const EU_NODE_DEFS: ReadonlyMap<EuNodeId, EuNodeDef> = new Map(
    EU_NODES.map((d) => [d.id, d]),
);

export function euNodeDef(id: EuNodeId): EuNodeDef {
    return EU_NODE_DEFS.get(id)!;
}

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

// Out of line for the same reason as traceFood below: a long cold branch
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

// Fortune > Material > Food: nutrition -- enough to eat, and balanced enough
// to nourish -- and taste, something in it to enjoy.
//
// Keep the trace block at the bottom in step with the math above it.
export function computeFood(inputs: FortuneInputs, trace?: EuTrace): number {
    const foodRatio = inputs.foodRatio;
    const fishShare = inputs.fishShare;
    const cerealShare = inputs.cerealShare;

    // The same nutrition the clan's births and deaths read; see
    // people/nutrition.ts. Written out in its steps so a replay can show them.
    const balance = foodBalance(cerealShare);
    const raw = (foodRatio > 0 ? foodRatio : 0) * balance;
    const level = nutritionFromRaw(raw);
    const nutrition = nutritionFortune(level);

    const honey = EU_HONEY_PER_SHARE * fishShare;
    const beerRaw = EU_BEER_PER_SHARE * cerealShare;
    const beer = beerRaw > EU_BEER_MAX ? EU_BEER_MAX : beerRaw;
    const taste = combine2(EuNode.FoodTaste, honey, beer);

    const food = combine2(EuNode.Food, nutrition, taste);

    if (trace !== undefined) {
        traceFood(trace, foodRatio, fishShare, cerealShare, balance, raw,
            level, nutrition, honey, beerRaw, beer, taste, food);
    }

    return food;
}

// The reporting half of computeFood, kept in a function of its own rather than
// inline in the branch above.
//
// This is speed rather than tidiness. A long cold branch counts against the
// budget V8 uses to decide whether to inline the function it sits in, so
// moving a dozen `put` calls out of the hot function is worth something: the
// benchmark put it at about 14% of the update path.
//
// Keep this in step with the math above it -- the two are adjacent for that
// reason.
function traceFood(
    trace: EuTrace,
    foodRatio: number,
    fishShare: number,
    cerealShare: number,
    balance: number,
    raw: number,
    level: number,
    nutrition: number,
    honey: number,
    beerRaw: number,
    beer: number,
    taste: number,
    food: number,
): void {
    trace.put(EuNode.FoodRatio, foodRatio);
    trace.put(EuNode.FishShare, fishShare);
    trace.put(EuNode.CerealShare, cerealShare);
    trace.put(EuNode.FoodBalance, balance);
    trace.put(EuNode.NutritionRaw, raw);
    trace.put(EuNode.NutritionLevel, level);
    trace.put(EuNode.FoodNutrition, nutrition);
    trace.put(EuNode.Honey, honey);
    trace.put(EuNode.BeerRaw, beerRaw);
    trace.put(EuNode.Beer, beer);
    trace.put(EuNode.FoodTaste, taste);
    trace.put(EuNode.Food, food);
}

// Fortune > Social > Care: how well looked after everyone was, and what it
// cost the people doing it. See care.ts.
export function computeCare(inputs: FortuneInputs, trace?: EuTrace): number {
    const provision = inputs.careEffort * careSkillFactor(inputs.careSkill);
    const comfort = careComfort(provision);
    const stress = careStress(inputs.careShare);
    const care = combine2(EuNode.Care, comfort, stress);

    if (trace !== undefined) {
        trace.put(EuNode.CareEffort, inputs.careEffort);
        trace.put(EuNode.CareSkillLevel, inputs.careSkill);
        trace.put(EuNode.CareShare, inputs.careShare);
        trace.put(EuNode.CareProvision, provision);
        trace.put(EuNode.CareComfort, comfort);
        trace.put(EuNode.CareStress, stress);
        trace.put(EuNode.Care, care);
    }

    return care;
}

// Fortune > Social > Conversation: how many people outside the clan it knows,
// and how well it gets on with them.
export function computeConversation(inputs: FortuneInputs, trace?: EuTrace): number {
    const amount = inputs.conversationAmount;
    const quantity = EU_CONVERSATION_PER_DOUBLING * Math.log2(
        (amount > EU_CONVERSATION_FLOOR ? amount : EU_CONVERSATION_FLOOR)
        / EU_CONVERSATION_STANDARD);
    const quality = EU_CONVERSATION_QUALITY_SCALE
        * (inputs.conversationAffinity - EU_CONVERSATION_NEUTRAL_AFFINITY);
    const conversation = combine2(
        EuNode.Conversation, quantity, quality);

    if (trace !== undefined) {
        trace.put(EuNode.ConversationAmount, amount);
        trace.put(EuNode.ConversationAffinity, inputs.conversationAffinity);
        trace.put(EuNode.ConversationQuantity, quantity);
        trace.put(EuNode.ConversationQuality, quality);
        trace.put(EuNode.Conversation, conversation);
    }

    return conversation;
}

// Fortune: how a year went. The whole tree, each inner node combining its
// children as FORTUNE_TREE says.
export function computeFortune(inputs: FortuneInputs, trace?: EuTrace): number {
    const food = computeFood(inputs, trace);
    const material = combine1(EuNode.Material, food);

    const care = computeCare(inputs, trace);
    const conversation = computeConversation(inputs, trace);
    const social = combine2(EuNode.Social, care, conversation);

    const fortune = combine2(EuNode.Fortune, material, social);

    if (trace !== undefined) {
        trace.put(EuNode.Material, material);
        trace.put(EuNode.Social, social);
        trace.put(EuNode.Fortune, fortune);
    }

    return fortune;
}

// The standing Fortune subscore, moved by this year's Fortune.
export function computeFortuneSubscore(
    prevFortune: number,
    inputs: FortuneInputs,
    trace?: EuTrace,
): number {
    const signal = computeFortune(inputs, trace);

    const pull = EU_FORTUNE_DECAY * (signal - prevFortune);
    const fortune = prevFortune + pull;

    if (trace !== undefined) {
        trace.put(EuNode.PrevFortune, prevFortune);
        trace.put(EuNode.FortunePull, pull);
        trace.put(EuNode.FortuneSubscore, fortune);
    }

    return fortune;
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
// Fortune is not linear in its inputs -- it reads nutrition on an exponential,
// blends, and reads conversation on a log scale -- so the identity does not extend to
// it across clans living differently. The average is still the right summary
// of the clans; it is just not the settlement's own fortune.
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
    fortuneSubscore: number;

    // Last turn's inputs, held for replay.
    private prevLife_: number;
    private prevFortune_: number;
    private births_: number;
    private deaths_: number;
    private population_: number;
    private readonly inputs_: FortuneInputs;
    private hasRun_: boolean;

    constructor(
        life = 0,
        fortuneSubscore = 0,
        prevLife = 0,
        prevFortune = 0,
        births = 0,
        deaths = 0,
        population = 0,
        inputs: FortuneInputs = new FortuneInputs(),
        hasRun = false,
    ) {
        this.life = life;
        this.fortuneSubscore = fortuneSubscore;
        this.prevLife_ = prevLife;
        this.prevFortune_ = prevFortune;
        this.births_ = births;
        this.deaths_ = deaths;
        this.population_ = population;
        this.inputs_ = inputs;
        this.hasRun_ = hasRun;
    }

    clone(): Eudaimonia {
        return new Eudaimonia(
            this.life,
            this.fortuneSubscore,
            this.prevLife_,
            this.prevFortune_,
            this.births_,
            this.deaths_,
            this.population_,
            this.inputs_.clone(),
            this.hasRun_,
        );
    }

    // What Fortune read last year.
    get inputs(): Readonly<FortuneInputs> {
        return this.inputs_;
    }

    // The verdict: the subscores added.
    get value(): number {
        return this.life + this.fortuneSubscore;
    }

    get previousValue(): number {
        return this.prevLife_ + this.prevFortune_;
    }

    // How this year went, on its own terms. Derived rather than stored: it is
    // a function of inputs already kept for replay, so the turn loop pays
    // nothing for it.
    get fortune(): number {
        return computeFortune(this.inputs_);
    }

    // Fortune's reading of how the year's care went: comfort and stress.
    get care(): number {
        return computeCare(this.inputs_);
    }

    // One subscore by key, for UI that walks EU_SUBSCORES.
    subscore(key: EuSubscoreKey): number {
        return key === "life" ? this.life : this.fortuneSubscore;
    }

    previousSubscore(key: EuSubscoreKey): number {
        return key === "life" ? this.prevLife_ : this.prevFortune_;
    }

    // How much the verdict moved last turn.
    get delta(): number {
        return this.hasRun_ ? this.value - this.previousValue : 0;
    }

    get hasRun(): boolean {
        return this.hasRun_;
    }

    // The turn update. Arithmetic only. `inputs` is copied, so the caller can
    // reuse one object from year to year.
    update(
        births: number,
        deaths: number,
        population: number,
        inputs: FortuneInputs,
    ): void {
        this.prevLife_ = this.life;
        this.prevFortune_ = this.fortuneSubscore;
        this.births_ = births;
        this.deaths_ = deaths;
        this.population_ = population;
        this.inputs_.copyFrom(inputs);
        this.hasRun_ = true;
        this.life = computeLife(this.life, births, deaths, population);
        this.fortuneSubscore = computeFortuneSubscore(
            this.fortuneSubscore, this.inputs_);
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
        const fortune = computeFortuneSubscore(
            this.prevFortune_, this.inputs_, report);
        report.put(EuNode.PrevValue, this.prevLife_ + this.prevFortune_);
        report.put(EuNode.Value, life + fortune);
        return report;
    }

    // The year's Fortune on its own, without the subscore around it.
    explainFortune(): EudaimoniaReport {
        const report = new EudaimoniaReport();
        computeFortune(this.inputs_, report);
        return report;
    }
}
