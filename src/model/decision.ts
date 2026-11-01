import { chooseFrom } from "./lib/basics";
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
// This is the bare occasion and nothing more. A decision is always between
// two choices, every clan picks one of them at random, and what is kept is
// who picked what and whether they all picked the same. Where the clans'
// preferences come from, how they argue, and what the outcome does to them
// are all still to come.

// What the clans are choosing between. Always two for now.
export type DecisionChoices = readonly [string, string];

// Abstract until there are particular kinds of decision to name.
export const DEFAULT_DECISION_CHOICES: DecisionChoices = ["A", "B"];

// Chance per year that a village has something to decide.
export const DECISION_CHANCE = 0.1;

// One clan's pick. The name is kept alongside the clan so the record still
// reads right once the clan has split, moved away or died out.
export class DecisionVote {
    readonly clanName: string;

    constructor(
        readonly clan: Clan,
        readonly choice: string,
    ) {
        this.clanName = clan.name;
    }
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

// The event feed's marker for these; see NotificationBar.
export const DECISION_NOTE_LABEL = "✋";

// Look over each village and see whether it has something to decide this
// year, and if so, take the clans' picks. Run in the planning phase with the
// other things the clans settle. Priming turns decide nothing.
export function planDecisions(world: World, priming: boolean = false): void {
    world.lastDecisions = [];
    if (priming) return;

    for (const settlement of world.allSettlements) {
        const clans = settlement.clans.filter(c => c.population > 0);
        if (clans.length === 0) continue;
        if (Math.random() >= DECISION_CHANCE) continue;

        const choices = DEFAULT_DECISION_CHOICES;
        const decision = new Decision(
            settlement, world.year.value, choices,
            clans.map(clan => new DecisionVote(clan, chooseFrom(choices))));
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
