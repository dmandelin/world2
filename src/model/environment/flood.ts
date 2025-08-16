import { poisson } from "../lib/distributions";
import type { Settlement } from "../people/settlement";

// Flood control and permanent settlements
//
// Flooding causes settlements to move for two reasons:
// - Shifting currents change which areas are naturally
//   flooded and thus arable. Small-scale ditching enables
//   more permanent fields.
// - Major flooding can dry up an entire area or inundate
//   a settlement. Resisting these effects requires larger
//   flood control systems.
//
// The aim is to have a progression something like this:
// - At first, settlements shift every few years to where
//   the really fertile fields are.
//   - (P2) High productivity for fresh soils and low
//     preperation labor
// - Over 3-12 turns (75-300 years), irrigation skill rises
//   high enough to avoid small shifts for 100+ years at a
//   time.
// - There's still flood damage to settlements, and major
//   moves every some centuries, motivating continued
//   development
// - 500-1000 years after start (25-50 turns), irrigation
//   skill is high enough to resist most floods, but there
//   should be some risk over a millennium.
//
// To change:
// - Update the model to have 100-year and 500-year floods:
//   - 100-year: significant losses
//   - 500-year: settlement may be wiped out; however, people
//               could rebuild in place depending on exactly
//               what happened
//   - Tells of 1m+ should offer significant protection
// - Update shift avoidance:
//   - 10 skill: not much
//   - 20 skill: have to move for fields every 200 years or so
//   - 30 skill: have to move for fields every 1000 years or so
// - Update display:
//   - Moving average of shifts
//   - Full in-persona tenure indicator
// - Get some population growth going again

export class FloodLevel {
    constructor(
        readonly index: number,
        readonly name: string,
        readonly description: string,
        readonly baseAgriculturalProductivity: number,
        readonly maxAgriculturalProductivity: number,
        readonly baseExpectedForcedMigrations: number,
        readonly majorEventForcedMigrations: number,
        readonly qolModifier: number,
    ) {}


    static max(a: FloodLevel, b: FloodLevel): FloodLevel {
        return a.index > b.index ? a : b;
    }
}

export const FloodLevels = {
    Lower: new FloodLevel(
        0,
        'Lower',
        'Floods have been relatively low in recent years',
        0.8,
        1.1,
        3,
        0,
        2,
    ),
    Normal: new FloodLevel(
        1,
        'Normal',
        'Floods have been normal in recent years',
        1.0,
        1.2,
        5,
        0,
        0,
    ),
    Higher: new FloodLevel(
        2,
        'Higher',
        'Floods have been relatively high in recent years',
        0.65,
        1.0,
        7,
        0,
        -2,
    ),
    Major: new FloodLevel(
        3,
        'Major',
        'There was a major flood event in recent years!',
        1.2,
        0.6,
        6,
        0.5,
        -10,
    ),
    Extreme: new FloodLevel(
        4,
        'Extreme',
        'There was an extreme flood event in recent years!',
        1.3,
        0.5,
        4,
        1,
        -20,
    ),
};

export function randomFloodLevel(): FloodLevel {
    const roll = Math.random();
    if (roll < 0.25) {
        return FloodLevels.Lower;
    } else if (roll < 0.65) {
        return FloodLevels.Normal;
    } else if (roll < 0.9) {
        return FloodLevels.Higher;
    } else if (roll < 0.98) {
        return FloodLevels.Major;
    } else {
        return FloodLevels.Extreme;
    }
}