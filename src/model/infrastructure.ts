import type { Settlement } from './people/settlement';
import { weightedGeometricMean, weightedHarmonicMean } from './lib/basics';
import { eloSuccessProbability } from './lib/modelbasics';
import { SkillDefs } from './people/skills';
import { pct, spct } from './lib/format';

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
        this.items = settlement.clans
            .filter(c => c.isDitching)
            .map(c => {
                const skill = c.skills.v(SkillDefs.Irrigation);
              
                return new MaintenanceCalcItem(
                    c.name,
                    c.population,
                    skill,
                    c.productivity(SkillDefs.Irrigation),
                    // Quality of about 50/90/99 at skill levels 10/20/30.
                    eloSuccessProbability(skill, 10, 10),
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