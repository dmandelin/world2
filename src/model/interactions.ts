import { poisson } from "./distributions";
import type { Clan } from "./people";

export function exchangeGifts(c: Clan, d: Clan) {
    // Assume both cooperate, small benefit to both.
    c.interactionModifier += 1;
    d.interactionModifier += 1;
}

export function resolveDisputes(c: Clan, d: Clan) {
    // Assume both cooperate so that losses are shared.
    const loss = poisson(1);
    c.interactionModifier -= loss;
    d.interactionModifier -= loss;
}

// One clan's assessment of other clans.
export class Assessments {
    readonly defaultAssessment = 50; // Neutral
    private assessments = new Map<Clan, number>();

    constructor(private clan: Clan) {}

    get(clan: Clan) {
        return this.assessments.get(clan) || this.defaultAssessment;
    }

    update() {
        // Nothing happens yet so everyone is assessed as neutral.
        this.assessments.clear();
        for (const clan of this.clan.settlement!.clans) {
            if (clan === this.clan) continue;
            this.assessments.set(clan, 50);
        }
    }
}