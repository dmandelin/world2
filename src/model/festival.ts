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

    constructor(readonly clans: Clans|undefined) {
        this.process();
    }

    private process() {
        if (!this.clans) return;

        // Pay the cost of the festival. It's substantial: people
        // are putting a lot into this.
        for (const clan of this.clans) {
            clan.festivalModifier = -10;
        }

        // We'll start with a super-simple average result.
        for (const clan of this.clans) {
            clan.festivalModifier += 20;
        }

        this.message = 'Seasonal festival!'
    }
}