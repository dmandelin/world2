import { clamp, weightedHarmonicMean } from "./basics";
import { pct, spct, xm } from "./format";
import type { Clan } from "./people";

export class SpiritCalc {

}

interface RitesStructure {
    scale: (rites: Rites) => number;
    coordination: (rites: Rites) => number;
    weight: (clan: Clan, rites: Rites) => number;
}

class CommonRitesStructure implements RitesStructure {
    scale(rites: Rites): number {
        return [0.5, 0.8, 1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5]
            [clamp(rites.participants.length, 1, 9) - 1];
    }

    coordination(rites: Rites): number {
        return [1.1, 1.05, 1, 0.9, 0.7, 0.5, 0.3, 0.1, 0.01]
            [clamp(rites.participants.length, 1, 9) - 1];
    }

    weight(clan: Clan, rites: Rites): number {
        return 1;
    }
}

export class Rites {
    structure: RitesStructure = new CommonRitesStructure();
    quality: number = 0;
    items: [string, string][] = [];

    constructor(readonly participants: Clan[]) {
    }

    plan() {
    }

    perform() {
        // Success of the rites depends on the skill of the participants.
        // Low skill tends to drag things down quite a bit, as mistakes can
        // ruin entire rituals.

        const baseEffectiveness = weightedHarmonicMean(
            this.participants,
            c => c.ritualEffectivenessCalc.value,
            c => this.structure.weight(c, this));
            
        const scale = this.structure.scale(this);
        const coordination = this.structure.coordination(this);

        this.quality = baseEffectiveness * scale * coordination;
        this.items = [
            ['Base effectiveness', pct(baseEffectiveness)],
            ['Scale', xm(scale)],
            ['Coordination', xm(coordination)],
        ];
    }
}