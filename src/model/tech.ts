import { normal } from "./distributions";

// Ditching and canals next steps:
//
// - Ditching
//   - People living by the river at least part time gain XP toward ditching.
//   - Costs 100 XP
//   - Enables output boost and permanent dwellings
// - Canal-based irrigation
//   - People tending plants by the river at least part time gain XP toward 
//     canal-based irrigation.
//     - XP gain is greatly slowed due to lack of need unless:
//       - Population pressure: normal XP gain
//         - Determining population pressure
//           - Set a local capacity limit, initially 300, 500 with ditching,
//             1000 with canal-based irrigation
//           - Overpopulation has a quality penalty
//           - When overpopulated, people can randomly migrate away
//       - High knowledge or skill: XP gain is less slowed
//   - Costs 100 XP
//   - Main effect is raising local capacity limit to 1000.

const DITCHING = {
    'name': 'Ditching',
    'xpRequired': 100,
    'description': 'Flood control ditches',
    'longDescription':  `We use ditches to control flooding, and now we live in permanent dwellings
where barley and lentils are naturally plentiful.`,
}

const IRRIGATION = {
    'name': 'Irrigation',
    'xpRequired': 100,
    'description': 'Irrigation canals',
    'longDescription':  `We use canals to flood new fields for our growing people.`,
}

const TECHLIST = [DITCHING, IRRIGATION];
const TECHS = new Map(TECHLIST.map(tech => [tech.name, tech]));

export class Technai {
    readonly xp = new Map<String, number>();

    advance(population: number) {
        this.addXP(DITCHING.name, this.randomGain(population));
        this.addXP(IRRIGATION.name, this.randomGain(population, 0.1));
    }

    addXP(tech: string, xp: number) {
        const orig = this.xp.get(tech) || 0;
        this.xp.set(tech, orig + xp);
    }

    randomGain(population: number, factor = 1.0) {
        const popFactor = Math.pow(population / 100, 1.1);
        const xpRoll = normal(10, 5);
        const xpGain = popFactor * xpRoll * factor;
        return Math.round(xpGain);
    }

    get description(): string[] {
        return TECHLIST.map(tech => {
            const xp = this.xp.get(tech.name) || 0;
            if (xp == 0) return '';
            if (xp < tech.xpRequired) return `Learning: ${tech.description} (${xp}/${tech.xpRequired})`;
            return tech.description;
        }).filter(s => s.length > 0);
    }

    get long(): string[] {
        return TECHLIST.map(tech => {
            const xp = this.xp.get(tech.name) || 0;
            if (xp < tech.xpRequired) return '';
            return tech.longDescription;
        }).filter(s => s.length > 0);
    }

    get outputBoost() {
        return (this.xp.get(DITCHING.name) || 0) >= DITCHING.xpRequired ? 20 : 0;
    }
}