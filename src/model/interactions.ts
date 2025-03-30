import { assert } from "./basics";
import { poisson } from "./distributions";
import type { Clan } from "./people";

export enum GiftStrategy {
    Cooperate = "C", // always give good gifts
    Reciprocate = "R", // give good gifts if received good gifts
    Defect = "D", // cheat everyone but reciprocators
}

export function exchangeGifts(c: Clan, d: Clan) {
    const cs = c.agent.selectGiftStrategy(d);
    const ds = d.agent.selectGiftStrategy(c);

    // Assume both cooperate, small benefit to both.
    assert(cs === GiftStrategy.Cooperate);
    assert(ds === GiftStrategy.Cooperate);
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
    readonly defaultAssessment = 0; // Neutral
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