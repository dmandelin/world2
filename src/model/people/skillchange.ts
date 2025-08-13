import { type Clan } from './people';
import { type ClanSkill, type SkillDef, SkillDefs } from './skills';
import { moveToward, traitFactor } from '../lib/modelbasics';
import { chooseWeighted, clamp, sumFun } from '../lib/basics';

export class ImitationTargetItem {
    weight: number;

    constructor(
        readonly label: string,
        readonly trait: number,
        readonly prestige: number,
    ) {
        this.weight = (4 ** trait) * (1.3 ** prestige);
    }
}

export class ClanSkillChangeItem {
    constructor(
        readonly label: string,
        readonly delta: number,
    ) {}
}

export class ClanSkillChange {
    // Amount the skill was used.
    readonly intensity: number;

    readonly originalValue: number;
    readonly imitationTargetItems: readonly ImitationTargetItem[];

    readonly generalLearningFactor: number;

    readonly items: ClanSkillChangeItem[] = [];

    constructor(
        readonly clan: Clan,
        readonly skillDef: SkillDef,
        readonly skill: ClanSkill,
) {
        if (skillDef === SkillDefs.Ritual) {
            // TODO - bring back at some point.
            //const ritualWeight = clan.settlement!.clans.rites.weights.get(clan) ?? 0;
            //experienceRatio = Math.min(2.0, clan.settlement!.clans.length * ritualWeight);
            this.intensity = 1;
        } else if (skillDef === SkillDefs.Construction) {
            // For now assume rougbly fixed amount of experience. Thus no adjustment,
            // because we don't want to penalize for having less than 100% labor allocation.
            this.intensity = 1;
        } else if (skillDef === SkillDefs.Irrigation) {
            // For now assume rougbly fixed amount of experience. Thus no adjustment,
            // because we don't want to penalize for having less than 100% labor allocation.
            this.intensity = clan.isDitching ? 1 : 0;
        } else {
            const workerFraction = clan.laborAllocation.allocs.get(skillDef);
            // Clans can internally specialize a little, so learning isn't scaled
            // down fully by worker fraction.
            this.intensity = workerFraction !== undefined
                ? Math.sqrt(workerFraction)
                : 1;
        }

        const t = skill.value;
        this.originalValue = t;
        this.generalLearningFactor = clamp(traitFactor(clan.intelligence, 1.02), 0.5, 2);

        if (clan.isMigrating) {
            // Skills typically won't work exactly as well at the new location,
            // but for now we have local moves so the effect can be minor.
            const migrationRoll = Math.random();
            if (migrationRoll < 0.15) {
                this.items.push(new ClanSkillChangeItem('Migration', -2));
            } else if (migrationRoll > 0.5) {
                this.items.push(new ClanSkillChangeItem('Migration', -1));
            } else if (migrationRoll >= 0.9) {
                this.items.push(new ClanSkillChangeItem('Migration', 1));
            }
            this.imitationTargetItems = [];
        } else {
            // Imitate a local clan (including self). Assume that if the skill level
            // is the same, there's no change, but otherwise, they're busy adopting
            // from another clan and won't make other changes.
            const maxImitationDelta = 3;
            this.imitationTargetItems = [...clan.settlement!.clans].map(
                c => new ImitationTargetItem(
                    c.name,
                    c.skills.v(skillDef),
                    clan.prestigeViewOf(c).value,
                ));
            const totalWeight = sumFun(this.imitationTargetItems, o => o.weight);
            for (const item of this.imitationTargetItems) {
                item.weight /= totalWeight;
            }
            const imitationTarget = chooseWeighted(this.imitationTargetItems, i => i.weight);

            if (t !== imitationTarget.trait) {
                this.items.push(new ClanSkillChangeItem(
                    imitationTarget.label, 
                    moveToward(t, imitationTarget.trait, maxImitationDelta) - t,
                ));
            } else {
                this.items.push(new ClanSkillChangeItem('Tradition', 0));
            }

            const lossFactor = 0.01 * t;
            const gainFactor = 0.01 * (100 - t);

            // Imitation error (including imitating own traditions). Usually hurts but
            // can help.
            const imitationErrorRoll = Math.random();
            if (imitationErrorRoll < 0.2 * lossFactor / this.generalLearningFactor) {
                this.items.push(new ClanSkillChangeItem('Imitation error', -1));
            } else if (imitationErrorRoll > 1 - 0.02 * gainFactor * this.generalLearningFactor) {
                this.items.push(new ClanSkillChangeItem('Imitation error', 1));
            }

            if (t === imitationTarget.trait) {
                // Learning by observation. Faster for farming because of domestication.
                // For now also arbitrarily make ditching faster to learn.
                // Usually helps but can hurt.
                const effectiveIntensity = 
                      skillDef === SkillDefs.Agriculture
                    ? 2 * this.intensity
                    : skillDef === SkillDefs.Irrigation
                    ? 4 * this.intensity
                    : this.intensity;
                const learningRoll = Math.random();
                if (learningRoll < effectiveIntensity * 0.2 * gainFactor * this.generalLearningFactor) {
                    this.items.push(new ClanSkillChangeItem('Learning', 1));
                } else if (learningRoll > 1 - effectiveIntensity * 0.02 * lossFactor / this.generalLearningFactor) {
                    this.items.push(new ClanSkillChangeItem('Learning', -1));
                }
            }
        }
    }

    get delta(): number {
        return sumFun(this.items, o => o.delta);
    }

    get changeSourcesTooltip(): string[][] {
        const header = ['Source', 'Δ'];
        const data = this.items.map(o => [
            o.label, 
            o.delta.toFixed(),
        ]);
        const footer = [ 
            'Total',
            sumFun(this.items, o => o.delta).toFixed(),
        ]
        return [header, ...data, footer];
    }
}
