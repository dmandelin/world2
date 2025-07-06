import { Clan } from './people';
import { SkillDefs, type SkillDef } from './skills';

export class LaborAllocation {
    readonly allocs: Map<SkillDef, number> = new Map<SkillDef, number>();

    constructor(readonly clan: Clan) {
        const r = Math.random();
        this.allocs.set(SkillDefs.Agriculture, r);
        this.allocs.set(SkillDefs.Fishing, 1 - r);
    }

    get workers(): number { return this.clan.population / 3; }
}