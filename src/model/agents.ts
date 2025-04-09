import { GiftStrategy } from "./interactions";
import type { Clan } from "./people";

export class ClanAgent {
    readonly lastGiftStrategy = new Map<Clan, GiftStrategy>();

    constructor(readonly clan: Clan, public defaultGiftStrategy = GiftStrategy.Cooperate) {}

    selectGiftStrategy(other: Clan): GiftStrategy {
        const s = this.defaultGiftStrategy;
        this.lastGiftStrategy.set(other, s);
        return s;
    }

    getLastGiftStrategy(other: Clan): GiftStrategy {
        return this.lastGiftStrategy.get(other) ?? this.defaultGiftStrategy;
    }

    clone() {
        const clone = new ClanAgent(this.clan, this.defaultGiftStrategy);
        for (const [other, strategy] of this.lastGiftStrategy) {
            clone.lastGiftStrategy.set(other, strategy);
        }
        return clone;
    }
}

// One clan's assessment of other clans.
export class Assessments {
    readonly defaultAssessment = 0; // Neutral
    assessments = new Map<Clan, number>();
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