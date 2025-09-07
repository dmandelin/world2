import type Settlement from '../../components/Settlement.svelte';
import { clamp } from '../lib/basics';
import { normal } from '../lib/distributions';
import { Clan } from './people';
import { SkillDefs, type SkillDef } from './skills';

export class LaborAllocation {
    // Planned allocations for labor left over after maintenance and other 
    // required allocations. Value is fraction and values must sum to 1.
    readonly planned_= new Map<SkillDef, number>();

    readonly allocs = new Map<SkillDef, number>();

    constructor(readonly clan: Clan) {
        const r = clamp(normal(0.2, 0.1), 0, 1);
        this.planned_.set(SkillDefs.Agriculture, r);
        this.planned_.set(SkillDefs.Fishing, 1 - r);
        this.plan();
    }

    clone(): LaborAllocation {
        const clone = new LaborAllocation(this.clan);
        clone.planned_.clear();
        for (const [skill, fraction] of this.planned_.entries()) {
            clone.planned_.set(skill, fraction);
        }
        clone.allocs.clear();
        for (const [skill, fraction] of this.allocs.entries()) {
            clone.allocs.set(skill, fraction);
        }
        return clone;
    }

    get workers(): number { 
        return this.clan.population / 3;
    }

    plannedRatioFor(skill: SkillDef): number {
        return this.planned_.get(skill) ?? 0;
    }

    plan(): void {
        this.allocs.clear();
        this.updatePlanned();
        this.updateAllocs();
    }

    private updatePlanned() {
        // Happens during world initialization.
        if (!this.clan.consumption) return;

        if (this.clan.consumption.perCapitaSubsistence() >= 1.0) {
            return;
        }

        const r = this.planned_.get(SkillDefs.Agriculture);
        if (r === undefined) return;
        const sign = Math.random() < 0.5 ? -1 : 1;
        const delta = sign * (1 + Math.random() + Math.random()) * 0.1;
        const newR = clamp(r + delta, 0, 1);
        this.planned_.set(SkillDefs.Agriculture, newR);
        this.planned_.set(SkillDefs.Fishing, 1 - newR);
        
        // TODO - finish
        // If there is hunger, consider doing something different.
        // - Assume that there's a period of experimentation in
        //   the beginning of the turn, so that clans have some
        //   visibility into what will work.
        // - There's still a fair amount of variance, so the signal
        //   won't necessarily be obvious to them, but larger
        //   interacting populations will have a better chance.
        // - Village rituals are assumed to emphasize agriculture,
        //   so ritual activity increases its appeal.

        // There will always be some inequality of food distribution,
        // so we have to be a bit above subsistence for no one to be
        // hungry.

        /*
        // Appeal of the status quo.
        const statusQuoAppeal = (this.clan.happiness.getAppeal('Food Quantity') ?? 0)
                              + (this.clan.happiness.getAppeal('Food Quality') ?? 0);
        if (statusQuoAppeal === undefined) return;

        // Use total factor productivity to estimate the output
        // effects of changing allocations.
        const agTFP = this.clan.settlement.productionNode(SkillDefs.Agriculture).tfp(this.clan);
        const fiTFP = this.clan.settlement.productionNode(SkillDefs.Fishing).tfp(this.clan);

        if (this.clan.consumption.perCapitaSubsistence() >= 1.1) {
            return;
        }
            const r = this.planned_.get(SkillDefs.Agriculture);
            if (r === undefined) return;
            const sign = Math.random() < 0.5 ? -1 : 1;
            const delta = sign * (0.1 + 0.1 * Math.random());
            const newR = clamp(r + delta, 0, 1);
            this.planned_.set(SkillDefs.Agriculture, newR);
            this.planned_.set(SkillDefs.Fishing, 1 - newR);
        }
        */
    }

    private updateAllocs() {
        // Mandatory allocations.
        const housing = this.clan.housing.cost(this.clan);
        this.allocs.set(SkillDefs.Construction, housing);

        const ditching = this.clan.isDitching ? 0.02 : 0;
        if (ditching) {
            this.allocs.set(SkillDefs.Irrigation, ditching);
        }

        const reserved = housing + ditching;

        // Allocate planned items in remainder.
        const remainder = 1 - reserved;
        for (const [skill, fraction] of this.planned_.entries()) {
            this.allocs.set(skill, fraction * remainder);
        }
    }
}