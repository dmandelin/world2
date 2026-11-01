import { sumFun } from "./lib/basics";
import { normal } from "./lib/distributions";
import { TRAIT_SD } from "./people/traits";
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
// off by an error that is smaller the cleverer the clan. It picks whichever
// its estimates say is better.
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

function argmax(xs: readonly number[]): number {
    let best = 0;
    for (let i = 1; i < xs.length; ++i) if (xs[i] > xs[best]) best = i;
    return best;
}

// One clan's pick. The name is kept alongside the clan so the record still
// reads right once the clan has split, moved away or died out.
export class DecisionVote {
    readonly clanName: string;
    // What it picked: whichever its estimates said was better.
    readonly choice: string;
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
        // Its intellect as it stood that year, and the spread of its
        // estimates that gave. Kept because the trait drifts.
        readonly intellect: number,
        readonly estimateSD: number,
    ) {
        this.clanName = clan.name;
        this.choice = choices[argmax(estimates)];
        this.bestChoice = choices[argmax(favorabilities)];
    }

    favorabilityOf(choice: string): number {
        return this.favorabilities[this.choices.indexOf(choice)];
    }

    estimateOf(choice: string): number {
        return this.estimates[this.choices.indexOf(choice)];
    }

    // The worse of the choices for it, which is what it gets when the village
    // cannot agree.
    get worstFavorability(): number {
        return Math.min(...this.favorabilities);
    }

    get gotItRight(): boolean {
        return this.choice === this.bestChoice;
    }
}

// Draw a clan's Favorabilities for a decision, and its estimates of them, and
// let it pick.
export function castVote(clan: Clan, choices: DecisionChoices): DecisionVote {
    const intellect = clan.traits.intellect;
    const sd = decisionEstimateSD(intellect);
    const favorabilities = choices.map(() => normal(0, DECISION_FAVORABILITY_SD));
    const estimates = favorabilities.map(f => f + normal(0, sd));
    return new DecisionVote(clan, choices, favorabilities, estimates, intellect, sd);
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
            clans.map(clan => castVote(clan, choices)));
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
