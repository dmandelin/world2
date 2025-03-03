// Clans can contribute to the village (or other grouping)
// festival, or not. At the beginning, we would expect that
// most would choose to, but since people have choices, we
// will allow nonparticipation from the first.
//
// The festival works like this:
// - By some procedure, clans decide to participate or not.
//   Clans that participate pay a cost and gain the results,
//   good or bad.
// - The festival may succeed or fail.
// - If there is no particular structure, the festival will
//   be successful according to the average knowledge and
//   the size: bigger means more chances to fail.
// - But bigger means bigger benefits when the festival succeeds.
// - People work harder at the festival, so they produce more
//   than they usually would.
// - The festival also increases happiness, over and above
//   the indirect benefit of the extra production.
// - Knowledge:
//   - Clans that don't participate will lose knowledge, but
//     have a small chance of gaining a lot of knowledge because
//     they used the time to invent a new ritual.
//   - Clans that do participate will increase their knowledge
//     by learning from each other.
//   - Clans that participate also generate new ritual knowledge,
//     usually the clans with the most knowledge, usually small
//     increments.

import type { Clan, Clans } from "./people";

export class Festival {
    message: string = '';

    constructor(readonly clans: readonly Clan[]) {
    }

    process() {
        if (!this.clans) return;

        // Pay the cost of the festival. It's substantial: people
        // are putting a lot into this.
        for (const clan of this.clans) {
            clan.festivalModifier -= 10;
        }

        // We'll start with a super-simple average result.
        const highBenefitClans = Math.min(5, this.clans.length);
        const lowBenefitClans = Math.max(0, Math.min(25, this.clans.length - 5));
        const baseBenefit = 10 + highBenefitClans * 2 + lowBenefitClans / 5;

        const people = this.clans.reduce((acc, clan) => acc + clan.size, 0);
        const weightedSumKnowledge = this.clans.reduce(
            (acc, clan) => acc + clan.knowledge * clan.size, 0);
        const knowledge = weightedSumKnowledge / people;
        const knowledgeModifier = 1 + (knowledge - 50) / 100;
        const benefit = Math.round(baseBenefit * knowledgeModifier);

        for (const clan of this.clans) {
            clan.festivalModifier += benefit;
        }

        this.message = `Seasonal festival with ${this.clans.length} clans!`;
    }
}

export abstract class FestivalBehavior {
    abstract get name(): string;
    abstract willParticipate(): boolean;
}

class Reliable extends FestivalBehavior {
    name = 'reliable';
    willParticipate() { return Math.random() < 0.99; }
}

class Flaky extends FestivalBehavior {
    name = 'flaky';
    willParticipate() { return Math.random() < 0.9; }
}

class Rare extends FestivalBehavior {
    name = 'rare';
    willParticipate() { return Math.random() < 0.1; }
}

class Out extends FestivalBehavior {
    name = 'out';
    willParticipate() { return Math.random() < 0.01; }
}

export const Behaviors = {
    reliable: new Reliable(),
    flaky: new Flaky(),
    rare: new Rare(),
    out: new Out(),
}

const behaviorList = Object.values(Behaviors);

const MUTATION_TABLE = [
    [0.83, 0.15, 0.00, 0.02],
    [0.15, 0.79, 0.05, 0.01],
    [0.01, 0.05, 0.79, 0.15],
    [0.01, 0.01, 0.15, 0.83],
];

for (const row of MUTATION_TABLE) {
    let sum = 0;
    for (const x of row) sum += x;
    if (Math.abs(sum - 1) > 0.001) throw new Error('Mutation table must sum to 1');
}

export function mutate(b: FestivalBehavior): FestivalBehavior {
    const i = behaviorList.indexOf(b);
    const row = MUTATION_TABLE[i];
    const r = Math.random();
    let sum = 0;
    for (let j = 0; j < row.length; ++j) {
        sum += row[j];
        if (r < sum) return behaviorList[j];
    }
    return b;
}