import { clamp, weightedHarmonicMean } from "./basics";
import { pct, xm } from "./format";
import type { NoteTaker } from "./notifications";
import type { Clan } from "./people";

// Note on adding roles to this:
// - Some roles can be discrete, e.g., MC vs auidence member.
//   However, some roles may have varying weight. At a 20-year
//   granularity, we can assume that when there are offices
//   of different value reassigned frequently, they're weighted
//   according to how often held.
// - That seems to imply that this is more about clan _status_,
//   which determines which roles the clan can occupy. But rite
//   structure does still have different roles, which affects
//   how status takes effect.
//
// What initial setups do we need:
// - Common rites, where all clans participate equally. This
//   papers over differences in whom from the clan participates.
// - Common rites overseen by ritual leaders, who have no
//   automatic further role in society, but help the rituals
//   go better
// - Participation:
//   - For common rites, we seem to need only a similar participant
//     concept.
//
// Problems people would be trying to solve based on early
// simulation results:
// - Sometimes there is a clan or two that has very low ritual
//   effectiveness, and brings down the quality.
//   - Let's think through what that really means:
//     - Imagine a big extended family consisting of several
//       families (today), getting together for the holidays.
//     - If there's a family that gets drunk and acts crazy,
//       says offensive things, or gives highly inappropriate
//       gifts, it can ruin the entire event. So what do people
//       do?
//       - One option is to not invite them, but I think people
//         are reluctant to exclude family, so this will depend
//         on relatedness.
//         - If they resist being uninvited, things can get very
//           complicated, but here we'll assume that they basically
//           stay out, with maybe some cost for the effort to
//           chase them away.
//       - Another thing people seem to do is create some rules
//         that they have to follow. This can work in case of
//         offensive behavior, but failure to perform is harder
//         to address this way.
//       - 

interface RitesStructure {
    name: string;
    scale: (rites: Rites) => number;
    coordination: (rites: Rites) => number;
}

// Rites performed in common by all the clans.
export class CommonRitesStructure implements RitesStructure {
    readonly name = 'Common Rites';

    scale(rites: Rites): number {
        return [0.5, 0.8, 1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5]
            [clamp(rites.reach.length, 1, 9) - 1];
    }

    coordination(rites: Rites): number {
        return [1.1, 1.05, 1, 0.9, 0.7, 0.5, 0.3, 0.1, 0.01]
            [clamp(rites.reach.length, 1, 9) - 1];
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
    readonly name = 'Guided Rites';

    scale(rites: Rites): number {
        return [0.5, 0.8, 1, 1.3, 1.5, 1.6, 1.65, 1.7, 1.75]
            [clamp(rites.reach.length, 1, 9) - 1];
    }

    coordination(rites: Rites): number {
        return [1.1, 1.05, 1, 0.95, 0.9, 0.8, 0.5, 0.2, 0.01]
            [clamp(rites.reach.length, 1, 9) - 1];
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

interface RitualLeaderSelection {
    name: string;
    weight(clan: Clan): number;
}

class EqualSelection implements RitualLeaderSelection {
    readonly name = 'Equal by clans';

    weight(clan: Clan): number {
        return 1;
    }
}

class PrestigeWeightedSelection implements RitualLeaderSelection {
    constructor(readonly name: string, private readonly quotient: number) {}

    weight(clan: Clan): number {
        return Math.pow(2, (clan.averagePrestige - 50) / this.quotient);
    }
}

export const RitualLeaderSelectionOptions = {
    Equal: new EqualSelection(),
    PrestigeWeightedSoft: new PrestigeWeightedSelection('By prestige (soft)', 20),
    PrestigeWeightedMedium: new PrestigeWeightedSelection('By prestige (medium)', 10),
    PrestigeWeightedHard: new PrestigeWeightedSelection('By prestige (hard)', 5),
};

export const RitualLeaderSelectionOptionsList: RitualLeaderSelection[] = [
    RitualLeaderSelectionOptions.Equal,
    RitualLeaderSelectionOptions.PrestigeWeightedSoft,
    RitualLeaderSelectionOptions.PrestigeWeightedMedium,
    RitualLeaderSelectionOptions.PrestigeWeightedHard,
];

export class Rites {
    structure: RitesStructure = new GuidedRitesStructure();
    leaderSelectionOption: RitualLeaderSelection = RitualLeaderSelectionOptions.PrestigeWeightedSoft;
    quality: number = 0;
    baseEffectivenessItems: [string, string, string][] = [];
    items: [string, string][] = [];
    weights: Map<Clan, number> = new Map();

    constructor(readonly noteTaker: NoteTaker, readonly reach: Clan[]) {
    }

    plan() {
        // Allow some random drift in ritual leader selection.
        const i = RitualLeaderSelectionOptionsList.findIndex(
            option => option === this.leaderSelectionOption);
        if (i >= 0) {
            let j = i;
            const r = Math.random();
            if (r < 0.1) {
                --j;
                if (j < 0) j = 1;
            } else if (r >= 0.9) {
                ++j;
                if (j >= RitualLeaderSelectionOptionsList.length) j = RitualLeaderSelectionOptionsList.length - 2;
            }
            if (j !== i) {
                this.leaderSelectionOption = RitualLeaderSelectionOptionsList[j];
                this.noteTaker.addNote({
                    shortLabel: 'R',
                });
                console.log(`Rites: changed leader selection option`);
            }
        }
    }

    perform() {
        // Success of the rites depends on the skill of the participants.
        // Low skill tends to drag things down quite a bit, as mistakes can
        // ruin entire rituals.

        let reciprocalSum = 0;
        let weightSum = 0;
        const baseEffectivenessItemsNumeric: [string, number, number][] = [];
        this.weights.clear();
        for (const clan of this.reach) {
            const effectiveness = clan.ritualEffectiveness;
            const weight = this.leaderSelectionOption.weight(clan);
            reciprocalSum += weight / clan.ritualEffectiveness;
            weightSum += weight;
            baseEffectivenessItemsNumeric.push(
                [clan.name, effectiveness, weight]);
            this.weights.set(clan, weight);
        }
        const baseEffectiveness = weightSum / reciprocalSum;
        this.baseEffectivenessItems = baseEffectivenessItemsNumeric.map(
            ([name, effectiveness, weight]) => [
                name,
                pct(effectiveness),
                (weight / weightSum).toFixed(2),
            ]);
        for (const [clan, weight] of this.weights) {
            this.weights.set(clan, weight / weightSum);
        }

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