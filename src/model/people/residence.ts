export class ResidenceLevel {
    constructor(
        readonly index: number,
        readonly name: string,
        readonly description: string,
        readonly useFraction: (farmingRatio: number) => number,
    ) {}
}

// We assume that if people are living near the farms only when
// working, that's 50% residence.

export const ResidenceLevels = {
    Work: new ResidenceLevel(0, 'Work',
        'Farming only',
        (farmingRatio: number) => 0.5 * farmingRatio,
    ),
    Visiting: new ResidenceLevel(1, 'Visiting',
        'Visiting',
        (farmingRatio: number) => 0.5 * farmingRatio + 0.1,
    ),
    Birthing: new ResidenceLevel(2, 'Birthing',
        'Birthing',
        (farmingRatio: number) => 0.5 * farmingRatio + 0.4,
    ),
    Full: new ResidenceLevel(3, 'Full',
        'Residing',
        (_: number) => 1,
    ),
};