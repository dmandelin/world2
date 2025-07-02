import { Clan } from './people';
import { type ClanSkill, type SkillDef, SkillDefs } from './skills';
import { traitWeightedAverage, WeightedValue } from '../lib/modelbasics';
import { absmin, clamp } from '../lib/basics';
import { normal } from '../lib/distributions';
import { pct } from '../lib/format';

export interface SkillChange {
    originalValue: number;
    educationTarget: number;
    imitationTarget: number;

    delta: number;
    imitationTooltip: string[][];
}

export class NilSkillChange implements SkillChange {
    readonly delta = 0;
    readonly educationTarget = 0;
    readonly educationTargetDelta = 0;
    readonly imitationTarget = 0;
    readonly imitationTargetDelta = 0;
    readonly imitationTooltip: string[][] = [];

    constructor(readonly originalValue: number) {
    }
}

export class ClanSkillChange implements SkillChange {
    readonly originalValue: number;
    readonly educationTarget: number;
    readonly imitationTarget: number;
    readonly imitationTargetTable: readonly WeightedValue<String>[];

    readonly items: {label: string, weight: number, value: number, ev: number}[] = [];

    constructor(
        readonly clan: Clan,
        readonly skillDef: SkillDef,
        readonly skill: ClanSkill,
) {
        let experienceRatio = 1.0;
        if (skillDef === SkillDefs.Ritual) {
            const ritualWeight = clan.settlement!.clans.rites.weights.get(clan) ?? 0;
            const experienceRatio = Math.min(2.0, clan.settlement!.clans.length * ritualWeight);
        }

        const rr = 0.5; // Population replacement rate
        const cms = 50; // Child max skill
        const alr = 1.0; // Adult learning rate

        const t = skill.value;
        this.originalValue = t;
        this.educationTarget =  Math.min(cms, t);
        [this.imitationTarget, this.imitationTargetTable] = traitWeightedAverage(
            [...clan.settlement!.clans],
            c => c.name,
            c => clan.prestigeViewOf(c).value,
            c => c.skills.v(skillDef),
        );

        // Imitation with error (education) by children.
        const educationDelta = absmin(cms, this.educationTarget) - t;
        this.items.push({
            label: 'Education', 
            weight: 1 - rr, 
            value: educationDelta - normal(2, 4) * clamp(t / 100, 0, 1),
            ev: educationDelta - 2 * clamp(t / 100, 0, 1),
        });

        // Imitation with error by adult clan members.
        const imitationDelta = this.imitationTarget - t;
        this.items.push({
            label: 'Imitation', 
            weight: (1 - rr) * alr,
            value: imitationDelta - normal(2, 4) * clamp(t / 100, 0, 1), 
            ev: imitationDelta - 2 * clamp(t / 100, 0, 1),
        });

        // Learning from experience and observation.
        this.items.push({
            label: `Experience (${pct(experienceRatio)})`, 
            weight: 1, 
            value: experienceRatio * normal(2, 4) * clamp((100 - t) / 100, 0, 1), 
            ev: experienceRatio * 2 * clamp((100 - t) / 100, 0, 1),
        })

        // Things may be a little different after a move, which might
        // work out better or worse for us.
        if (this.clan.seniority == 0) {
            this.items.push({
                label: 'Migration',
                weight: 1, 
                value: -10 + normal(2, 4), 
                ev: -10,
            })
        }
    }

    get delta(): number {
        return this.items.reduce((acc, o) => acc + o.weight * o.value, 0);
    }

    get educationTargetDelta(): number {
        return this.educationTarget - this.originalValue;
    }

    get imitationTargetDelta(): number {
        return this.imitationTarget - this.originalValue;
    }

    get imitationTooltip(): string[][] {
        return WeightedValue.tooltip(this.imitationTargetTable,
            ['Model', 'V', 'P', 'W', 'WV'],
        );
    }

    get changeSourcesTooltip(): string[][] {
        const header = ['Source', 'W', 'EV', 'WEV', 'V', 'WV'];
        const data = this.items.map(o => [
            o.label, 
            o.weight.toFixed(2),
            o.ev.toFixed(1),
            (o.weight * o.ev).toFixed(1),
            o.value.toFixed(1),
            (o.weight * o.value).toFixed(1),
        ]);
        const footer = [ 
            'Total',
            '',
            '',
            this.items.reduce((acc, o) => acc + o.ev * o.weight, 0).toFixed(1),
            '',
            this.items.reduce((acc, o) => acc + o.weight * o.value, 0).toFixed(1),
        ]
        return [header, ...data, footer];
    }
}
