import { harmonicMean } from "./basics";
import { pct, spct } from "./format";
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
        const scale = 1 + Math.max(Math.log2(this.participants.length / 3) / 2, 0.1);
        const coordination = Math.max(1 - 0.03 * Math.pow(this.participants.length, 1.5), 0);

        this.quality = baseEffectiveness * scale * coordination;
        this.items = [
            ['Base effectiveness', pct(baseEffectiveness)],
            ['Scale', spct(scale)],
            ['Coordination', spct(coordination)],
        ];
    }
}