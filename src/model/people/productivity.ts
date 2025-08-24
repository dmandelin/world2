import { Clan } from '../people/people';
import { SkillDef, SkillDefs } from './skills';
import { pct, spct } from '../lib/format';
import { product } from '../lib/basics';
import { scaleFactorEffect } from '../lib/modelbasics';

interface ProductivityCalcItem {
    label: string;
    value: string|number;
    fp: number;

    statFactor?: number;
}

export class SimpleProductivityCalcItem implements ProductivityCalcItem {
    constructor(readonly label: string, readonly value: string, readonly fp: number) {}
}

export class StatBasedProductivityCalcItem implements ProductivityCalcItem {
    constructor(readonly label: string,
                readonly statValue: number,
                readonly statFactor: number) {}

    get fp(): number {
        const f = 1 + this.statFactor / 300;
        return Math.pow(f, this.statValue - 50);
    }

    get value(): string {
        return this.statValue.toFixed(1);
    }
}

export class ProductivityCalc {
    readonly skill: number;
    readonly items: ProductivityCalcItem[];

    constructor(readonly clan: Clan, readonly skillDef: SkillDef) {
        this.skill = clan.skills.v(skillDef);
        this.items = [...skillDef.traitFactors.entries()].map(tf => {
            const [statName, statFactor] = tf;
            const statValue = statName === 'Skill'
                ? this.skill
                : clan.getTrait(statName);
            return new StatBasedProductivityCalcItem(statName, statValue, statFactor);
        });

        if (skillDef === SkillDefs.Agriculture) {
            const ditchQuality = clan.settlement.ditchQuality;
            const baseProductivity = clan.settlement.floodLevel.baseAgriculturalProductivity;
            const maxProductivity = clan.settlement.floodLevel.maxAgriculturalProductivity;
            const productivity = (1-ditchQuality)*baseProductivity + ditchQuality*maxProductivity;
            const differentialProductivity = productivity / baseProductivity;

            // For now we'll assume migrations are neutral, because although they
            // take work, in the early days people might have been migrating to
            // small patches of the best land. The real importance of permanence
            // will be in enabling durable infrastructure.

            this.items.push(new SimpleProductivityCalcItem(
                'Flooding',
                clan.settlement.floodLevel.name,
                baseProductivity,
            ));
            this.items.push(new SimpleProductivityCalcItem(
                'Flood control',
                pct(ditchQuality),
                differentialProductivity,
            ));
        }
    }

    get tfp(): number {
        return product(this.items.map(item => item.fp));
    }
 
    get tooltip(): string[][] {
        const header = ['Item', '*', 'Value', 'Factor'];
        const data = this.items.map(item => [
            item.label, 
            item.statFactor !== undefined ? item.statFactor.toFixed() : '',
            typeof(item.value) === 'string' ? item.value : item.value.toFixed(1),
            spct(item.fp),
        ]);
        return [header, ...data];
    }
}
