import type { Clan } from "./people";

export class SpiritCalc {

}

export class Rites {
    constructor(readonly participants: Clan[]) {}

    perform() {
        // Success of the rites depends on the skill of the participants.
        // Low skill tends to drag things down quite a bit, as mistakes can
        // ruin entire rituals.
    }
}