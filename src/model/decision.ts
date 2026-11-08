import { isPositive, sumFun } from "./lib/basics";
import { normal } from "./lib/distributions";
import { TRAIT_SD } from "./people/traits";
import { getAlignment } from "./relations/alignment";
import { getRelativeAttention } from "./relations/conversation";
import type { Clan } from "./people/people";
import type { Settlement } from "./people/settlement";
import type { World } from "./world";

// Something the village has to settle together.
//
// Now and then a question comes up that the clans of a village cannot each
// answer for themselves: which ground to clear, whether to take up a new
// rite, where to move to. Every clan has to live with the same answer, so the
// village has to arrive at one.
//
// For now a decision is always between two choices. Each choice has a
// Favorability for each clan: how well it would go for that clan, drawn at
// random. No clan knows its Favorabilities exactly, only an estimate of each,
// off by an error that is smaller the cleverer the clan.
//
// Nor does a clan care only about itself. What it weighs is its Inclusive
// Favorability for each choice: its own estimate averaged with the estimates
// of the clans it talks with -- what they have told it -- each weighted by how
// much it feels for them. This is what the clan directly cares about, on a
// felt level; backing a neighbor for what it might get back is another thing,
// still to come.
//
// Last, the clan reckons with what the others are going for, because a
// choice nobody else makes gets it nothing. Its Coordinated Favorability for
// a choice is what it would actually get, as it weighs everyone, by making
// that choice when every other clan goes the way its Inclusive Favorability
// points: the choice's Inclusive Favorability if every other clan is for it
// too, and otherwise what failing to agree is worth -- every clan's worst,
// weighed the same way. The clan picks whichever choice its Coordinated
// Favorability says is better. When the two are the same, which is when the
// village fails to agree either way, it goes by its Inclusive Favorability.
//
// If every clan picked the same, that is what the village does, and every
// clan gets that choice's Favorability for it. If not, the village has failed
// to settle the thing, and every clan gets the worse of the choices for it:
// whatever the question was, leaving it open is the worst answer to it. How
// the clans might argue their way to one answer is still to come.
//
// Favorability bears on a clan's Fortune, its birth rate, and its farming and
// fishing, and fades over the years.

// What the clans are choosing between. Always two for now.
export type DecisionChoices = readonly [string, string];

// Abstract until there are particular kinds of decision to name.
export const DEFAULT_DECISION_CHOICES: DecisionChoices = ["A", "B"];

// Chance per year that a village has something to decide.
export const DECISION_CHANCE = 0.1;

// How a decision's Favorability is drawn: normally, around nothing either
// way, for each choice and each clan. In points of Fortune.
export const DECISION_FAVORABILITY_SD = 10;

// How far off a clan's estimate of a Favorability is: normally, around the
// true value, with this spread for a clan of ordinary wits, halved for every
// standard deviation of intellect above that and doubled for every one below.
export const DECISION_ESTIMATE_SD = 3;
export const DECISION_ESTIMATE_INTELLECT_BASELINE = 50;

export function decisionEstimateSD(intellect: number): number {
    return DECISION_ESTIMATE_SD * Math.pow(
        0.5, (intellect - DECISION_ESTIMATE_INTELLECT_BASELINE) / TRAIT_SD);
}

// How fast a decision's effects fade: by half every this many years.
export const DECISION_EFFECT_HALF_LIFE = 20;

// What a point of Favorability is worth elsewhere: the birth rate moves by
// 1/200 of it, farming and fishing by 1/100.
export const DECISION_BIRTH_RATE_SCALE = 200;
export const DECISION_PRODUCTIVITY_SCALE = 100;
// A long enough run of bad decisions could otherwise take a clan's fields and
// nets to nothing or less.
export const DECISION_PRODUCTIVITY_FLOOR = 0.1;

// --- Caring about the others -------------------------------------------------
//
// How much a clan weighs another clan's interests against its own:
//
//     weight = care(righteousness) * feeling * conversation
//
// care is how far the clan holds others' interests as its own at all: nothing
// at or below SELFISH righteousness, as much as its own at or above EVEN, in a
// straight line between. A clan of ordinary righteousness weighs a neighbor it
// feels fully for and knows well at half itself.
//
// feeling is its alignment toward the other, -1 to 1, made more of by a
// tender clan and less by a hard one -- doubled for every standard deviation
// of tenderness above the middle, halved for every one below -- and kept
// within -1 to 1. A clan it is set against weighs negatively: what is good for
// them counts against a choice.
//
// conversation is how much of the other clan it knows, 0 to 1. A clan it
// never talks with has told it nothing, and is not weighed at all.
//
// Inclusive Favorability is then the clan's own estimate and the others',
// weighted so:
//
//     inclusive = (own + sum(weight * theirs)) / (1 + sum(|weight|))
//
// so it stays on the scale of a single Favorability, and a clan that cares
// for no one weighs exactly its own.
export const INCLUSIVE_RIGHTEOUSNESS_SELFISH = 20;
export const INCLUSIVE_RIGHTEOUSNESS_EVEN = 80;

export function inclusiveCare(righteousness: number): number {
    const t = (righteousness - INCLUSIVE_RIGHTEOUSNESS_SELFISH)
        / (INCLUSIVE_RIGHTEOUSNESS_EVEN - INCLUSIVE_RIGHTEOUSNESS_SELFISH);
    return t <= 0 ? 0 : t >= 1 ? 1 : t;
}

export const INCLUSIVE_TENDERNESS_BASELINE = 50;

export function inclusiveTendernessFactor(tenderness: number): number {
    return Math.pow(2, (tenderness - INCLUSIVE_TENDERNESS_BASELINE) / TRAIT_SD);
}

export function inclusiveFeeling(alignment: number, tenderness: number): number {
    const f = alignment * inclusiveTendernessFactor(tenderness);
    return f < -1 ? -1 : f > 1 ? 1 : f;
}

// One other clan, as one clan weighed it.
export class InclusiveWeight {
    readonly clanName: string;

    constructor(
        readonly clan: Clan,
        // Alignment toward it, and what tenderness made of that.
        readonly alignment: number,
        readonly feeling: number,
        // How much of it the clan knows, 0 to 1.
        readonly conversation: number,
        // The weight its estimates got: care * feeling * conversation.
        readonly weight: number,
    ) {
        this.clanName = clan.name;
    }
}

function argmax(xs: readonly number[]): number {
    let best = 0;
    for (let i = 1; i < xs.length; ++i) if (xs[i] > xs[best]) best = i;
    return best;
}

// One clan's pick. The name is kept alongside the clan so the record still
// reads right once the clan has split, moved away or died out.
export class DecisionVote {
    readonly clanName: string;
    // What it picked: whichever its Coordinated Favorability said was
    // better, or its Inclusive Favorability if that could not tell them apart.
    readonly choice: string;
    // What it would have picked going by its Inclusive Favorability alone:
    // what it was for before it reckoned with the others' picks, and what
    // the others reckon it is going for.
    readonly inclusiveChoice: string;
    // What it would have picked caring only for itself.
    readonly ownChoice: string;
    // What would actually have been better for it.
    readonly bestChoice: string;

    constructor(
        readonly clan: Clan,
        readonly choices: DecisionChoices,
        // How well each choice would go for the clan, in the order of the
        // choices, in points of Fortune before fading.
        readonly favorabilities: readonly number[],
        // What the clan made of each.
        readonly estimates: readonly number[],
        // Its own estimates averaged with the others', as it weighed them.
        readonly inclusiveEstimates: readonly number[],
        // What it would get from each, given the others' picks.
        readonly coordinatedEstimates: readonly number[],
        // What failing to agree is worth to it, weighed the same way.
        readonly failureEstimate: number,
        // Every other clan it gave any weight to.
        readonly weights: readonly InclusiveWeight[],
        // Its traits as they stood that year, and what they came to. Kept
        // because the traits drift.
        readonly intellect: number,
        readonly estimateSD: number,
        readonly righteousness: number,
        readonly tenderness: number,
        readonly care: number,
    ) {
        this.clanName = clan.name;
        this.inclusiveChoice = choices[argmax(inclusiveEstimates)];
        // Coordinated first, Inclusive to break a tie.
        let best = 0;
        for (let i = 1; i < choices.length; ++i) {
            const dc = coordinatedEstimates[i] - coordinatedEstimates[best];
            if (dc > 0 || (dc === 0 && inclusiveEstimates[i] > inclusiveEstimates[best])) {
                best = i;
            }
        }
        this.choice = choices[best];
        this.ownChoice = choices[argmax(estimates)];
        this.bestChoice = choices[argmax(favorabilities)];
    }

    favorabilityOf(choice: string): number {
        return this.favorabilities[this.choices.indexOf(choice)];
    }

    estimateOf(choice: string): number {
        return this.estimates[this.choices.indexOf(choice)];
    }

    inclusiveEstimateOf(choice: string): number {
        return this.inclusiveEstimates[this.choices.indexOf(choice)];
    }

    coordinatedEstimateOf(choice: string): number {
        return this.coordinatedEstimates[this.choices.indexOf(choice)];
    }

    // Its own estimate of the worse of the choices for it: what it reckons
    // it would get if the village failed to agree.
    get worstEstimate(): number {
        return Math.min(...this.estimates);
    }

    // Whether its Coordinated Favorability could not tell the choices apart,
    // so that it went by its Inclusive Favorability.
    get coordinationTied(): boolean {
        return this.coordinatedEstimates.every(c => c === this.coordinatedEstimates[0]);
    }

    // The worse of the choices for it, which is what it gets when the village
    // cannot agree.
    get worstFavorability(): number {
        return Math.min(...this.favorabilities);
    }

    // Picked what was actually better for itself.
    get gotItRight(): boolean {
        return this.choice === this.bestChoice;
    }

    // Picked other than its own estimates said, for the others' sake.
    get swayed(): boolean {
        return this.choice !== this.ownChoice;
    }

    // How much the others counted, all together, against its own 1.
    get totalWeight(): number {
        return sumFun(this.weights, w => Math.abs(w.weight));
    }
}

// A clan's Favorabilities for a decision and its own estimates of them,
// before it has heard from anyone.
type Assessment = {
    clan: Clan;
    favorabilities: number[];
    estimates: number[];
    intellect: number;
    sd: number;
};

function assess(clan: Clan, choices: DecisionChoices): Assessment {
    const intellect = clan.traits.intellect;
    const sd = decisionEstimateSD(intellect);
    const favorabilities = choices.map(() => normal(0, DECISION_FAVORABILITY_SD));
    const estimates = favorabilities.map(f => f + normal(0, sd));
    return { clan, favorabilities, estimates, intellect, sd };
}

// A clan's estimates with everyone's weighed in, and what it is therefore for.
type Inclusion = {
    assessment: Assessment;
    righteousness: number;
    tenderness: number;
    care: number;
    weights: InclusiveWeight[];
    total: number;
    inclusive: number[];
    inclusiveChoice: string;
};

function include(
    a: Assessment,
    assessments: readonly Assessment[],
    choices: DecisionChoices,
): Inclusion {
    const righteousness = a.clan.traits.righteousness;
    const tenderness = a.clan.traits.tenderness;
    const care = inclusiveCare(righteousness);
    const weights: InclusiveWeight[] = [];
    const sums = [...a.estimates];
    let total = 1;
    for (const other of assessments) {
        if (other === a) continue;
        const conversation = getRelativeAttention(a.clan, other.clan);
        if (!isPositive(conversation) || !isPositive(care)) continue;
        const alignment = getAlignment(a.clan, other.clan);
        const feeling = inclusiveFeeling(alignment, tenderness);
        const weight = care * feeling * conversation;
        if (weight === 0) continue;
        weights.push(new InclusiveWeight(
            other.clan, alignment, feeling, conversation, weight));
        other.estimates.forEach((e, i) => sums[i] += weight * e);
        total += Math.abs(weight);
    }
    const inclusive = sums.map(s => s / total);
    return {
        assessment: a, righteousness, tenderness, care, weights, total,
        inclusive, inclusiveChoice: choices[argmax(inclusive)],
    };
}

// Every clan's Favorabilities and estimates are drawn first. Then each weighs
// in what the others told it, which settles what it is for; then each
// reckons with what the others are for, and picks.
export function castVotes(clans: readonly Clan[], choices: DecisionChoices): DecisionVote[] {
    const assessments = clans.map(c => assess(c, choices));
    const inclusions = assessments.map(a => include(a, assessments, choices));
    const byClan = new Map(assessments.map(a => [a.clan, a]));
    return inclusions.map(inc => {
        const a = inc.assessment;
        // Failing to agree leaves every clan its worst, and the clan weighs
        // that as it weighs everything else.
        let failure = Math.min(...a.estimates);
        for (const w of inc.weights) {
            failure += w.weight * Math.min(...byClan.get(w.clan)!.estimates);
        }
        failure /= inc.total;
        const coordinated = choices.map((choice, i) =>
            inclusions.every(o => o === inc || o.inclusiveChoice === choice)
                ? inc.inclusive[i]
                : failure);
        return new DecisionVote(
            a.clan, choices, a.favorabilities, a.estimates,
            inc.inclusive, coordinated, failure, inc.weights,
            a.intellect, a.sd, inc.righteousness, inc.tenderness, inc.care);
    });
}

export class Decision {
    constructor(
        readonly settlement: Settlement,
        readonly year: number,
        readonly choices: DecisionChoices,
        // Every clan in the village that year, in the village's own order.
        readonly votes: readonly DecisionVote[],
    ) { }

    votesFor(choice: string): DecisionVote[] {
        return this.votes.filter(v => v.choice === choice);
    }

    voteOf(clan: Clan): DecisionVote | undefined {
        return this.votes.find(v => v.clan === clan);
    }

    // Everyone picked the same. A village of one clan is always of one mind.
    get consensus(): boolean {
        return this.votes.every(v => v.choice === this.votes[0]?.choice);
    }

    // What the village settled on, if it settled on anything.
    get result(): string | undefined {
        return this.consensus ? this.votes[0]?.choice : undefined;
    }

    // What the decision does for one clan, before fading: the Favorability of
    // what the village settled on, or the worse of the choices for the clan
    // if it settled on nothing.
    appliedFavorability(vote: DecisionVote): number {
        const result = this.result;
        return result !== undefined
            ? vote.favorabilityOf(result)
            : vote.worstFavorability;
    }

    // The clans that picked what was better for them.
    get rightCount(): number {
        return this.votes.filter(v => v.gotItRight).length;
    }

    // "3 A, 2 B"
    get tallyLabel(): string {
        return this.choices
            .map(c => `${this.votesFor(c).length} ${c}`)
            .join(", ");
    }

    get outcomeLabel(): string {
        return this.consensus ? `Consensus on ${this.result}` : "No consensus";
    }

    // One line on what happened, for the event feed and the alert row.
    get detail(): string {
        return `${this.choices.join(" or ")}: ${this.tallyLabel}; `
            + (this.consensus ? `all for ${this.result}` : "no consensus");
    }
}

// --- What decisions do to a clan --------------------------------------------

// What a decision still does to one clan, this many years on: its
// Favorability, halved every half-life.
export function decayedFavorability(favorability: number, age: number): number {
    return favorability * Math.pow(0.5, Math.max(0, age) / DECISION_EFFECT_HALF_LIFE);
}

// One decision's mark on one clan.
export class DecisionEffect {
    constructor(
        readonly decision: Decision,
        readonly favorability: number,
    ) { }

    at(year: number): number {
        return decayedFavorability(this.favorability, year - this.decision.year);
    }
}

// Once a decision's mark has faded below this, it is let go.
const DECISION_EFFECT_FORGOTTEN = 0.01;

// Every decision still telling on a clan. A clan that moves takes these with
// it: they are what the decisions did to it, not to where it lives.
export class DecisionEffects {
    private effects_: DecisionEffect[] = [];

    get effects(): readonly DecisionEffect[] {
        return this.effects_;
    }

    add(effect: DecisionEffect): void {
        this.effects_.push(effect);
    }

    // Everything still telling, faded to the given year.
    favorability(year: number): number {
        return sumFun(this.effects_, e => e.at(year));
    }

    forget(year: number): void {
        this.effects_ = this.effects_.filter(
            e => Math.abs(e.at(year)) >= DECISION_EFFECT_FORGOTTEN);
    }

    // For one clan taking in another: each side's effects, counting for as
    // much as its people do, since Favorability is per head.
    static blend(
        a: DecisionEffects, aWeight: number,
        b: DecisionEffects, bWeight: number,
    ): DecisionEffects {
        const total = aWeight + bWeight;
        if (!(total > 0)) return a.clone();
        const c = new DecisionEffects();
        for (const [effects, weight] of [[a, aWeight], [b, bWeight]] as const) {
            for (const e of effects.effects_) {
                c.effects_.push(new DecisionEffect(
                    e.decision, e.favorability * weight / total));
            }
        }
        return c;
    }

    // For a clan that splits: both halves lived through the same decisions.
    // The effects themselves never change, so they can be shared.
    clone(): DecisionEffects {
        const c = new DecisionEffects();
        c.effects_ = [...this.effects_];
        return c;
    }
}

export function decisionBirthRateModifier(favorability: number): number {
    return 1 + favorability / DECISION_BIRTH_RATE_SCALE;
}

export function decisionProductivityModifier(favorability: number): number {
    return Math.max(
        DECISION_PRODUCTIVITY_FLOOR,
        1 + favorability / DECISION_PRODUCTIVITY_SCALE);
}

// The event feed's marker for these; see NotificationBar.
export const DECISION_NOTE_LABEL = "✋";

// Look over each village and see whether it has something to decide this
// year, and if so, take the clans' picks. Run in the planning phase with the
// other things the clans settle. Priming turns decide nothing.
export function planDecisions(world: World, priming: boolean = false): void {
    world.lastDecisions = [];
    if (priming) return;

    for (const clan of world.allClans) clan.decisionEffects.forget(world.year.value);

    for (const settlement of world.allSettlements) {
        const clans = settlement.clans.filter(c => c.population > 0);
        if (clans.length === 0) continue;
        if (Math.random() >= DECISION_CHANCE) continue;

        const choices = DEFAULT_DECISION_CHOICES;
        const decision = new Decision(
            settlement, world.year.value, choices,
            castVotes(clans, choices));
        // Felt from this year on, at full strength this year.
        for (const vote of decision.votes) {
            vote.clan.decisionEffects.add(
                new DecisionEffect(decision, decision.appliedFavorability(vote)));
        }
        settlement.decisions.push(decision);
        world.lastDecisions.push(decision);
        world.addNote(
            DECISION_NOTE_LABEL,
            `{0} has a decision to make`,
            decision.detail,
            [{ uuid: settlement.uuid, name: settlement.name }],
        );
    }
}
