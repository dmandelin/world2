import { clamp, weightedHarmonicMean } from "./basics";
import { pct, spct, xm } from "./format";
import type { Clan } from "./people";

interface RitesStructure {
    name: string;
    scale: (rites: Rites) => number;
    coordination: (rites: Rites) => number;
    weight: (clan: Clan, rites: Rites) => number;
}

// Rites performed in common by all the clans.
export class CommonRitesStructure implements RitesStructure {
    readonly name = 'Common';

    scale(rites: Rites): number {
        return [0.5, 0.8, 1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5]
            [clamp(rites.reach.length, 1, 9) - 1];
    }

    coordination(rites: Rites): number {
        return [1.1, 1.05, 1, 0.9, 0.7, 0.5, 0.3, 0.1, 0.01]
            [clamp(rites.reach.length, 1, 9) - 1];
    }

    weight(clan: Clan, rites: Rites): number {
        return 1;
    }
}

// Rites performed in common by all the clans, but with leaders
// appointed for the rites by clan prestige to help coordinate
// the rites:
// - This can better take advantage of scale.
// - Prestigious clans will have more influence on the ritual
//   quality, for better or worse. They'll also have a little
//   more skill change.
export class GuidedRitesStructure implements RitesStructure {
    readonly name = 'Guided';

    scale(rites: Rites): number {
        return [0.5, 0.8, 1, 1.3, 1.5, 1.6, 1.65, 1.7, 1.75]
            [clamp(rites.reach.length, 1, 9) - 1];
    }

    coordination(rites: Rites): number {
        return [1.1, 1.05, 1, 0.95, 0.9, 0.8, 0.5, 0.2, 0.01]
            [clamp(rites.reach.length, 1, 9) - 1];
    }

    weight(clan: Clan, rites: Rites): number {
        return clan.influence;
    }
}

// Rites performed in common by all the clans, but with clans
// of evidently poor ritual skill (who thus tend to spoil rituals)
// viewing but not participating directly in the rites:
// - This can increase the average ritual effectiveness and
//   therefore quality.
// - Coordination costs are at least slightly higher, as it
//   takes effort to exclude clans.
// - Excluded clans are likely to react in some way, although
//   one reaction could be deciding they like it that way.
export class NoScrubsRitesStructure implements RitesStructure {
    readonly name = 'No Scrubs';

    scale(rites: Rites): number {
        return [0.5, 0.8, 1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5]
            [clamp(rites.reach.length, 1, 9) - 1];
    }

    coordination(rites: Rites): number {
        return 0.9 * [1.1, 1.05, 1, 0.9, 0.7, 0.5, 0.3, 0.1, 0.01]
            [clamp(rites.reach.length, 1, 9) - 1];
    }


    private weightsRites: Rites|undefined;
    private weights: Map<Clan, number> = new Map();

    weight(clan: Clan, rites: Rites): number {
        this.updateWeights(rites);
        return this.weights.get(clan) ?? 0;
    }

    private updateWeights(rites: Rites) {
        if (this.weightsRites === rites) return;
        this.weightsRites = rites;

        const maxRitualEffectiveness = Math.max(...[...rites.reach].map(c => c.ritualEffectiveness));
        this.weights.clear();
        for (const clan of rites.reach) {
            if (clan.ritualEffectiveness < maxRitualEffectiveness * 0.7) {
                this.weights.set(clan, 0);
            } else {
                this.weights.set(clan, 1);
            }
        }
    }
}

export class Rites {
    structure: RitesStructure = new CommonRitesStructure();
    quality: number = 0;
    items: [string, string][] = [];

    constructor(readonly reach: Clan[]) {
    }

    plan() {
    }

    perform() {
        // Success of the rites depends on the skill of the participants.
        // Low skill tends to drag things down quite a bit, as mistakes can
        // ruin entire rituals.

        const baseEffectiveness = weightedHarmonicMean(
            this.reach,
            c => c.ritualEffectiveness,
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