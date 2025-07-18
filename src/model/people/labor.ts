import type Settlement from '../../components/Settlement.svelte';
import { clamp } from '../lib/basics';
import { normal } from '../lib/distributions';
import { Clan } from './people';
import { SkillDefs, type SkillDef } from './skills';

export class LaborAllocation {
    // value is fraction and values must sum to 1
    readonly allocs: Map<SkillDef, number> = new Map<SkillDef, number>();

    constructor(readonly clan: Clan) {
        const r = clamp(normal(0.2, 0.1), 0, 1);
        this.allocs.set(SkillDefs.Agriculture, r);
        this.allocs.set(SkillDefs.Fishing, 1 - r);
    }

    get workers(): number { return this.clan.population / 3; }
}