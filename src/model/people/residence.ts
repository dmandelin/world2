export class ResidenceLevel {
    constructor(
        readonly index: number,
        readonly name: string,
        readonly description: string,
        readonly useFraction: (farmingRatio: number) => number,
    ) {}
}

export const ResidenceLevels = {
    Work: new ResidenceLevel(0, 'Work',
        'Farming only',
        (farmingRatio: number) => 0.4 * farmingRatio,
    ),
    Births: new ResidenceLevel(2, 'Births',
        'Births',
        (farmingRatio: number) => 0.4 * farmingRatio + 0.4,
    ),
    Full: new ResidenceLevel(3, 'Full',
        'Full-time',
        (_: number) => 1,
    ),
};