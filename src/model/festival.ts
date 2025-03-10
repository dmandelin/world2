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

import { plusOrMinus } from "./distributions";
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
            (acc, clan) => acc + clan.intelligence * clan.size, 0);
        const knowledge = weightedSumKnowledge / people;
        const knowledgeModifier = 1 + (knowledge - 50) / 100;
        const modifiedBenefit = baseBenefit * knowledgeModifier;

        console.log(modifiedBenefit);

        let resultModifier;
        const resultKnowledgeModifier = 0.07 * (knowledge - 50) / 50;
        const plusProb = Math.min(0.167 + resultKnowledgeModifier, 0.333);
        const minusProb = Math.max(0.167 - resultKnowledgeModifier, 0.05);
        const result = plusOrMinus(plusProb, minusProb, 2);
        switch (result) {
            case -2: // disaster
                resultModifier = 0;
                this.message = 'Disastrous festival!';
                break;
            case -1: // poor results
                resultModifier = 0.5;
                this.message = 'Poor festival.';
                break;
            case 0:  // average results
                resultModifier = 1;
                this.message = 'Seasonal festival!';
                break;
            case 1:  // above-average results
                resultModifier = 1.5;
                this.message = 'Great festival!!';
                break;
            case 2:  // exceptional result
                resultModifier = 2;
                this.message = 'Epic festival!!!';
                break;
            default:
                throw('Invalid result');
        }
        for (const clan of this.clans) {
            clan.festivalModifier += Math.round(modifiedBenefit * resultModifier);
        }
    }
}


