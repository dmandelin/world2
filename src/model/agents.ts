import { GiftStrategy } from "./interactions";
import type { Clan } from "./people";

export class ClanAgent {
    readonly defaultGiftStrategy = GiftStrategy.Cooperate;
    readonly lastGiftStrategy = new Map<Clan, GiftStrategy>();

    constructor(readonly clan: Clan) {}

    selectGiftStrategy(other: Clan): GiftStrategy {
        const s = this.defaultGiftStrategy;
        this.lastGiftStrategy.set(other, s);
        return s;
    }

    getLastGiftStrategy(other: Clan): GiftStrategy {
        return this.lastGiftStrategy.get(other) ?? this.defaultGiftStrategy;
    }
}