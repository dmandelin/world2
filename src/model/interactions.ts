import { assert } from "./basics";
import { poisson } from "./distributions";
import type { Clan } from "./people";

export enum GiftStrategy {
    Cooperate = "C", // always give good gifts
    Reciprocate = "R", // give good gifts if received good gifts
    Defect = "D", // cheat everyone but reciprocators
}

const giftPayoffs: {[key: string]: [number, number]} = {
    "C/C": [1, 1],
    "C/R": [1, 0.8],
    "C/D": [0.8, 1.2],
    "R/C": [0.8, 1],
    "R/R": [0.8, 0.8],
    "R/D": [0, 0],
    "D/C": [1.2, 0.8],
    "D/R": [0, 0],
    "D/D": [0.5, 0.5],
}

export function exchangeGifts(c: Clan, d: Clan) {
    const cs = c.agent.selectGiftStrategy(d);
    const ds = d.agent.selectGiftStrategy(c);

    const key = `${cs}/${ds}`;
    const [cPayoff, dPayoff] = giftPayoffs[key];

    c.interactionModifier += cPayoff;
    c.assessments.updateForGiftStrategy(d, ds, cPayoff, dPayoff);
    d.interactionModifier += dPayoff;
    d.assessments.updateForGiftStrategy(c, cs, dPayoff, cPayoff);
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
    private lastGiftStrategySeen = new Map<Clan, GiftStrategy>();

    constructor(private clan: Clan) {}

    get(clan: Clan) {
        return this.assessments.get(clan) || this.defaultAssessment;
    }

    clone() {
        const clone = new Assessments(this.clan);
        for (const [clan, assessment] of this.assessments) {
            clone.assessments.set(clan, assessment);
        }
        return clone;
    }

    updateForGiftStrategy(clan: Clan, strategy: GiftStrategy, selfPayoff: number, otherPayoff: number) {
        this.lastGiftStrategySeen.set(clan, strategy);
        this.assessments.set(clan, selfPayoff * 5);
    }
}