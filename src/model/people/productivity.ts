import { Clan } from '../people/people';
import { SkillDef } from './skills';
import { spct } from '../lib/format';
import { product } from '../lib/basics';

export class ProductivityCalcItem {
    constructor(readonly label: string,
                readonly statValue: number,
                readonly statFactor: number) {}

    get fp(): number {
        const f = 1 + this.statFactor / 300;
        return Math.pow(f, this.statValue - 50);
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
            return new ProductivityCalcItem(statName, statValue, statFactor);
        });
    }

    get tfp(): number {
        return product(this.items.map(item => item.fp));
    }

    get tooltip(): string[][] {
        const header = ['Item', '*', 'Value', 'Factor'];
        const data = this.items.map(item => [
            item.label, 
            item.statFactor.toFixed(),
            item.statValue.toFixed(1), 
            spct(item.fp),
        ]);
        return [header, ...data];
    }
}
