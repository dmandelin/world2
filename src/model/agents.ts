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