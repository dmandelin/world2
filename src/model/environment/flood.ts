import { clamp } from "../lib/basics";
import { plusOrMinus, weightedRandInt } from "../lib/distributions";
import type { SettlementCluster } from "../people/cluster";

// Flooding.
//
// The rivers rise every year, and how far they rise decides what the year
// is worth. There are two kinds of flood:
//
// - "Normal" levels, from scant to abundant, which every settlement gets
//   one of every year. They set farm output and the odds of the river
//   shifting its bed. That's what this file models today.
// - Extreme floods (20-, 100-, and 500-year), which strike on top of the
//   normal level and destroy crops, housing, and people. Not yet modeled.
//
// Flooding is good in moderation and bad at either extreme: too little
// water and the fields go dry, too much and the crop drowns. Ditching
// trades labor for a flatter response to the same water, which is the
// long-run reason to build it.

// What is being flooded. The same water helps or hurts depending on what
// it lands on, so effects are looked up by land type rather than being
// properties of the flood alone. Housing types will join this later.
export type LandType = 'alluvium';

// How a flood level pays off on one land type, from no flood control up
// to full flood control.
export class FloodAgricultureEffect {
    constructor(
        // Yield factor with no ditching at all.
        readonly unditched: number,
        // Yield factor with ditches in perfect repair.
        readonly ditched: number,
    ) {}

    // Yield factor at a given quality of flood control (0-1).
    at(ditchQuality: number): number {
        return this.unditched + (this.ditched - this.unditched) * ditchQuality;
    }
}

export class FloodLevel {
    constructor(
        // Position in the scale, 0 (scant) through 4 (abundant).
        readonly index: number,
        readonly name: string,
        readonly description: string,
        private readonly agriculture: Record<LandType, FloodAgricultureEffect>,
        // Expected river shifts per year at this level.
        readonly expectedRiverShifts: number,
        // Share of built value lost to water damage in a year at this level.
        // Extreme floods will add their own damage on top of this.
        readonly damageFactor: number,
    ) {}

    agricultureOn(land: LandType = 'alluvium'): FloodAgricultureEffect {
        return this.agriculture[land];
    }

    riverShiftProbability(yearsElapsed: number = 1): number {
        return 1 - (1 - this.expectedRiverShifts) ** yearsElapsed;
    }

    static max(a: FloodLevel, b: FloodLevel): FloodLevel {
        return a.index > b.index ? a : b;
    }
}

// Unditched alluvium yields most at a moderate flood and about two thirds
// of that at either extreme. Ditching flattens the curve: it holds water
// back in a scant year and carries it off in an abundant one, so its worst
// years are much better than the unditched worst years even though its
// best year is only somewhat better.
export const FloodLevels = {
    Scant: new FloodLevel(
        0,
        'Scant',
        'The rivers barely rose; much of the land stayed dry',
        { alluvium: new FloodAgricultureEffect(0.67, 0.90) },
        0.002,
        0.00,
    ),
    Low: new FloodLevel(
        1,
        'Low',
        'The rivers rose less than usual',
        { alluvium: new FloodAgricultureEffect(0.88, 1.05) },
        0.005,
        0.01,
    ),
    Moderate: new FloodLevel(
        2,
        'Moderate',
        'The rivers rose about as they usually do',
        { alluvium: new FloodAgricultureEffect(1.00, 1.15) },
        0.010,
        0.02,
    ),
    High: new FloodLevel(
        3,
        'High',
        'The rivers rose more than usual',
        { alluvium: new FloodAgricultureEffect(0.88, 1.10) },
        0.015,
        0.04,
    ),
    Abundant: new FloodLevel(
        4,
        'Abundant',
        'The rivers spilled far across the fields',
        { alluvium: new FloodAgricultureEffect(0.67, 0.95) },
        0.020,
        0.07,
    ),
};

// In index order, so that a level can be stepped up or down.
export const FLOOD_LEVELS: readonly FloodLevel[] = [
    FloodLevels.Scant,
    FloodLevels.Low,
    FloodLevels.Moderate,
    FloodLevels.High,
    FloodLevels.Abundant,
];

// Probability of each level in the year's map-wide flow.
const BASE_LEVEL_WEIGHTS = [0.10, 0.20, 0.40, 0.20, 0.10];

// Chance for a cluster to sit one step off the map-wide level, and for a
// settlement to sit one step off its cluster's. Each is the chance of a
// step in one direction, so the chance of landing off-level is twice this.
const CLUSTER_STEP_PROBABILITY = 0.15;
const SETTLEMENT_STEP_PROBABILITY = 0.05;

export function floodLevelByIndex(index: number): FloodLevel {
    return FLOOD_LEVELS[clamp(Math.round(index), 0, FLOOD_LEVELS.length - 1)];
}

// This year's flow for the map as a whole, before local variation.
export function randomBaseFloodLevel(): FloodLevel {
    return FLOOD_LEVELS[weightedRandInt(FLOOD_LEVELS, l => BASE_LEVEL_WEIGHTS[l.index])];
}

// One local draw: usually the level it was handed, sometimes a step off it.
function steppedFrom(level: FloodLevel, stepProbability: number): FloodLevel {
    return floodLevelByIndex(level.index + plusOrMinus(stepProbability));
}

// Set this year's flood level everywhere: one map-wide flow, varied by
// cluster, then varied again by settlement.
export function updateFloodLevels(clusters: Iterable<SettlementCluster>): void {
    const baseLevel = randomBaseFloodLevel();
    for (const cluster of clusters) {
        const clusterLevel = steppedFrom(baseLevel, CLUSTER_STEP_PROBABILITY);
        cluster.updateFloodLevel(clusterLevel);
        for (const settlement of cluster.settlements) {
            settlement.updateFloodLevel(
                steppedFrom(clusterLevel, SETTLEMENT_STEP_PROBABILITY));
        }
    }
}
