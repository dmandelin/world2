import { type Clan } from './people';
import { type ClanSkill, type SkillDef, SkillDefs } from './skills';
import { traitFactor, traitWeightedAverage, WeightedValue } from '../lib/modelbasics';
import { absmin, clamp, sumFun } from '../lib/basics';
import { normal } from '../lib/distributions';
import { pct } from '../lib/format';

export class ImitationTargetItem {
    weight: number;

    constructor(
        readonly label: string,
        readonly trait: number,
        readonly prestige: number,
    ) {
        this.weight = traitFactor(trait) * traitFactor(prestige);
    }
}

export class ClanSkillChangeItem {
    readonly shiftMean: number;
    readonly shiftStdDev: number;
    readonly shift: number;

    constructor(
        readonly label: string,
        readonly originalValue: number,
        readonly baseDelta: number,
        shiftMean: number,
        shiftStdDev: number,
        readonly weight: number,
        readonly baseRatio: number = 1.0,
        readonly shiftRatio: number = 1.0,
    ) {
        const shiftFactor = shiftMean <= 0
            ? originalValue / 100
            : (100 - originalValue) / 100;
        this.shiftMean = shiftFactor * shiftMean;
        this.shiftStdDev = shiftFactor * shiftStdDev;
        this.shift = normal(this.shiftMean, this.shiftStdDev);
    }

    get delta(): number {
        return this.baseRatio * this.baseDelta + this.shiftRatio * this.shift;
    }

    get expectedDelta(): number {
        return this.baseRatio * this.baseDelta + this.shiftRatio * this.shiftMean;
    }

    get weightedDelta(): number {
        return this.weight * this.delta;
    }

    get weightedExpectedDelta(): number {
        return this.weight * this.expectedDelta;
    }
}

export class ClanSkillChange {
    readonly originalValue: number;
    readonly educationTarget: number;
    readonly imitationTarget: number;
    readonly imitationTargetItems: readonly ImitationTargetItem[];

    readonly generalLearningFactor: number;

    readonly items: ClanSkillChangeItem[] = [];

    constructor(
        readonly clan: Clan,
        readonly skillDef: SkillDef,
        readonly skill: ClanSkill,
) {
        let experienceRatio = 1.0;
        if (skillDef === SkillDefs.Ritual) {
            // TODO - bring back at some point.
            //const ritualWeight = clan.settlement!.clans.rites.weights.get(clan) ?? 0;
            //experienceRatio = Math.min(2.0, clan.settlement!.clans.length * ritualWeight);
        } else if (skillDef === SkillDefs.Construction) {
            // For now assume rougbly fixed amount of experience. Thus no adjustment,
            // because we don't want to penalize for having less than 100% labor allocation.
        } else if (skillDef === SkillDefs.Irrigation) {
            // For now assume rougbly fixed amount of experience. Thus no adjustment,
            // because we don't want to penalize for having less than 100% labor allocation.
            if (!clan.isDitching) experienceRatio = 0;
        } else {
            const workerFraction = clan.laborAllocation.allocs.get(skillDef);
            // Clans can internally specialize a little, so learning isn't scaled
            // down fully by worker fraction.
            if (workerFraction !== undefined)
                experienceRatio *= Math.sqrt(workerFraction);
        }

        const rr = 0.5; // Population replacement rate
        const baseCMS = 50; // Child max skill
        const baseALR = 1.0; // Adult learning rate

        this.generalLearningFactor = clamp(traitFactor(clan.intelligence, 1.02), 0.5, 1.5);
        const cms = baseCMS * this.generalLearningFactor;
        const alr = baseALR * this.generalLearningFactor;

        const t = skill.value;
        this.originalValue = t;
        this.educationTarget = Math.min(cms, t);

        this.imitationTargetItems = [...clan.settlement!.clans].map(
            c => new ImitationTargetItem(
                c.name,
                c.skills.v(skillDef),
                clan.prestigeViewOf(c).value,
            ));
        const totalWeight = sumFun(this.imitationTargetItems, o => o.weight);
        let weightedSum = 0;
        for (const item of this.imitationTargetItems) {
            item.weight /= totalWeight;
            weightedSum += item.weight * item.trait;
        }
        this.imitationTarget = weightedSum;

        // Imitation with error (education) by children. For now children
        // learn by doing, so they also depend on experience.
        const educationDelta = absmin(cms, this.educationTarget) - t;
        this.items.push(new ClanSkillChangeItem(
            'Education', this.originalValue, educationDelta, -2, 2, 1 - rr, 
            experienceRatio, 1));

        // Imitation with error by adult clan members. Requires experience
        // because they imitate by doing the thing themselves.
        const imitationDelta = this.imitationTarget - t;
        this.items.push(new ClanSkillChangeItem(
            'Imitation', this.originalValue, imitationDelta, -2, 2, (1 - rr) * alr, 
            experienceRatio, 1));

        // Learning from experience and observation. Requires experience.
        this.items.push(new ClanSkillChangeItem(
            `Experience (${pct(experienceRatio)})`, 
            this.originalValue, 0, 4, 4, 1, 
            1, experienceRatio * this.generalLearningFactor));

        // Things may be a little different after a move, which might
        // work out better or worse for us.
        if (this.clan.seniority == 0) {
            this.items.push(new ClanSkillChangeItem(
                'Migration', this.originalValue, 0, -10, 5, 1, 
                1, 1/this.generalLearningFactor));
        }
    }

    get delta(): number {
        return sumFun(this.items, o => o.weightedDelta);
    }

    get educationTargetDelta(): number {
        return this.educationTarget - this.originalValue;
    }

    get imitationTargetDelta(): number {
        return this.imitationTarget - this.originalValue;
    }

    get changeSourcesTooltip(): string[][] {
        const header = ['Source', '𝔼Δ', 'Δ', 'w'];
        const data = this.items.map(o => [
            o.label, 
            o.expectedDelta.toFixed(1),
            o.delta.toFixed(1),
            o.weight.toFixed(1),
        ]);
        const footer = [ 
            'Total',
            sumFun(this.items, o => o.weightedExpectedDelta).toFixed(1),
            sumFun(this.items, o => o.weightedDelta).toFixed(1),
            sumFun(this.items, o => o.weight).toFixed(1),
        ]
        return [header, ...data, footer];
    }
}
