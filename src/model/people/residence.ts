export class ResidenceLevel {
    constructor(
        readonly index: number,
        readonly name: string,
        readonly description: string,
        readonly useFraction: (farmingRatio: number) => number,
    ) {}
}

export const ResidenceLevels = {
    // Nomadic, no agriculture.
    Nomadic: new ResidenceLevel(0, 'Nomadic',
        'Nomadic',
        (_: number) => 0,
    ),
    // Living near fields while working on them, but otherwise
    // mostly nomadic.
    SemiNomadic: new ResidenceLevel(1, 'Semi-nomadic',
        'Semi-nomadic',
        (farmingRatio: number) => 0.4 * farmingRatio,
    ),
    // Living near fields most of the time, especially when taking
    // care of children, but still spending some time on nomadic
    // hunting and collecting.
    SemiPermanent: new ResidenceLevel(2, 'Semi-permanent',
        'Semi-permanent',
        (farmingRatio: number) => 0.4 * farmingRatio + 0.4,
    ),
    // Permanent: living near the village.
    Permanent: new ResidenceLevel(3, 'Permanent',
        'Permanent',
        (_: number) => 1,
    ),
};