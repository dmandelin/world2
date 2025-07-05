import { Clan } from '../people/people';
import { SkillDef, SkillDefs } from './skills';
import { spct } from '../lib/format';
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
            this.items.push(new SimpleProductivityCalcItem(
                'Flood levels',
                clan.settlement.floodLevel.name,
                scaleFactorEffect(clan.settlement.floodLevel.agricultureBonus, 1-clan.settlement.ditchQuality),
            ));
            this.items.push(new SimpleProductivityCalcItem(
                'Flood damage',
                clan.settlement.floodLevel.name,
                scaleFactorEffect(clan.settlement.floodLevel.agricultureLoss, 1-clan.settlement.ditchQuality),
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
