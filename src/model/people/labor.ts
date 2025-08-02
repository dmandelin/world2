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

    get workers(): number { 
        return this.clan.population / 3;
    }

    plan(): void {
        this.allocs.clear();

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

        console.log("YYY", this.clan.name, this.clan.housing.name, this.allocs);
    }
}