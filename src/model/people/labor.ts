import type Settlement from '../../components/Settlement.svelte';
import { clamp } from '../lib/basics';
import { normal } from '../lib/distributions';
import { Clan } from './people';
import { SkillDefs, type SkillDef } from './skills';

export class LaborAllocation {
    // Planned allocations for labor left over after maintenance and other 
    // required allocations. Value is fraction and values must sum to 1.
    readonly planned_: Map<SkillDef, number> = new Map<SkillDef, number>();

    constructor(readonly clan: Clan) {
        const r = clamp(normal(0.2, 0.1), 0, 1);
        this.planned_.set(SkillDefs.Agriculture, r);
        this.planned_.set(SkillDefs.Fishing, 1 - r);
    }

    get allocs(): Map<SkillDef, number> {
        return this.planned_;
    }

    get workers(): number { 
        return this.clan.population / 3;
    }
}