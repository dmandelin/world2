import { weightedGeometricMean, weightedHarmonicMean } from './lib/basics';
import type { Settlement } from './people/settlement';
import { SkillDefs } from './people/skills';
import { pct, spct } from './lib/format';
import { clamp } from './lib/basics';

export class MaintenanceCalcItem {
    constructor(
        readonly label: string,
        readonly contributingPopulation: number, 
        readonly skill: number,
        readonly productivityFactor: number, 
        readonly quality: number) {}
}

export class DitchMaintenanceCalc {
    readonly items: MaintenanceCalcItem[];
    readonly tfp: number;
    readonly quality: number;

    constructor(readonly settlement: Settlement) {
        // Basic flood control ditching costs 2% of output, or about 2
        // points of QoL, scaled by productivity factor. The labor cost
        // is distributed equally among clans who are ditching.
        this.items = settlement.clans
            .filter(c => c.isDitching)
            .map(c => {
                const skill = c.skills.v(SkillDefs.Irrigation);
                const failureExponent = (75 - skill) / 25;
                const failureFactor = 2 ** failureExponent;
                const failureProbability = clamp(0.1 * failureFactor, 0.01, 1.0);
              
                return new MaintenanceCalcItem(
                    c.name,
                    c.population,
                    skill,
                    c.productivity(SkillDefs.Irrigation),
                    (1 - failureProbability),
                );
            });

        // These are rates that add up, so TFP is the harmonic mean.
        this.tfp = weightedHarmonicMean(
            this.items,
            i => i.productivityFactor,
            i => i.contributingPopulation,
        );

        this.quality = weightedGeometricMean(
            this.items,
            i => i.quality,
            i => i.contributingPopulation,
        )
    }

    get tooltip(): string[][] {
        const header = ['Clan', 'N', '𝕊', 'ℙ', 'Q'];
        const data = this.items.map(item => [
            item.label,
            item.contributingPopulation.toFixed(),
            item.skill.toFixed(),
            spct(item.productivityFactor),
            pct(item.quality),
        ]);
        return [header, ...data];
    }
}