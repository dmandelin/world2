import { clamp, harmonicMean } from "./basics";
import { pct, spct, xm } from "./format";
import type { Clan } from "./people";

export class SpiritCalc {

}

export class Rites {
    quality: number = 0;
    items: [string, string][] = [];

    constructor(readonly participants: Clan[]) {
    }

    perform() {
        // Success of the rites depends on the skill of the participants.
        // Low skill tends to drag things down quite a bit, as mistakes can
        // ruin entire rituals.

        const baseEffectiveness = harmonicMean(
            [...this.participants].map(c => c.ritualEffectivenessCalc.value));
        const scale = [0.5, 0.8, 1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5]
            [clamp(this.participants.length, 1, 9) - 1];
        const coordination = [1.1, 1.05, 1, 0.9, 0.7, 0.5, 0.3, 0.1, 0.01]
            [clamp(this.participants.length, 1, 9) - 1];
        this.quality = baseEffectiveness * scale * coordination;
        this.items = [
            ['Base effectiveness', pct(baseEffectiveness)],
            ['Scale', xm(scale)],
            ['Coordination', xm(coordination)],
        ];
    }
}