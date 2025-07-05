export class FloodLevel {
    constructor(
        readonly index: number,
        readonly name: string,
        readonly description: string,
        readonly agricultureBonus: number,
        readonly agricultureLoss: number,
        readonly expectedForcedMigrations: number,
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
        0.9,
        0.9,
        0.8,
        2,
    ),
    Normal: new FloodLevel(
        1,
        'Normal',
        'Floods have been normal in recent years',
        1.0,
        0.8,
        1.0,
        0,
    ),
    Higher: new FloodLevel(
        2,
        'Higher',
        'Floods have been relatively high in recent years',
        1.1,
        0.7,
        1.2,
        -2,
    ),
    Major: new FloodLevel(
        3,
        'Major',
        'There was a major flood event in recent years!',
        1.2,
        0.6,
        1.5,
        -10,
    ),
    Extreme: new FloodLevel(
        4,
        'Extreme',
        'There was an extreme flood event in recent years!',
        1.3,
        0.5,
        2,
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