import { clamp } from "../lib/basics";
import { ClanSkill, type SkillDef } from "./skills";
import { normal } from "../lib/distributions";
import { SkillDefs } from "../econ/econdefs";
import type { Clan } from "./people";
import type { ClanSkillChange } from "./skillchange";

export class ClanSkills {
    readonly m_: Map<SkillDef, ClanSkill> = new Map<SkillDef, ClanSkill>();

    constructor(readonly clan: Clan) {
        // Make them build up some skill ditching at the beginning before
        // they get good at it. This is different from how they do it in the
        // north, so they have less of a model to imitate. They've already
        // been fishing, though.
        const gen = (skillDef: SkillDef) => 
              skillDef === SkillDefs.Irrigation || skillDef === SkillDefs.Construction
            ? randomSkill(10, 4)
            : skillDef === SkillDefs.Fishing
            ? randomSkill(60, 10)
            : randomSkill(50, 10);
        for (const skillDef of Object.values(SkillDefs)) {
            this.m_.set(skillDef, new ClanSkill(gen(skillDef)));
        }
    }

    [Symbol.iterator](): IterableIterator<[SkillDef, ClanSkill]> {
        return this.m_.entries();
    }

    v(skill: SkillDef): number {
        const clanSkill = this.m_.get(skill);
        return clanSkill ? clanSkill.value : 0;
    }

    s(skill: SkillDef): string {
        return this.v(skill).toFixed();
    }

    get(skillDef: SkillDef): ClanSkill | undefined {
        return this.m_.get(skillDef);
    }

    keys(): IterableIterator<SkillDef> {
        return this.m_.keys();
    }

    lastChange(skillDef: SkillDef): ClanSkillChange|undefined {
        return this.m_.get(skillDef)?.lastChange;
    }

    cloneFor(clan: Clan): ClanSkills {
        const clone = new ClanSkills(clan);
        for (const [skillDef, clanSkill] of this.m_.entries()) {
            clone.m_.set(skillDef, clanSkill.clone());
        }
        return clone;
    }

    // We have to split skill updates into prepare/commit phases because
    // the skill change depends on the skill value of other clans.
    prepareAdvance() {
        for (const [skillDef, clanSkill] of this.m_.entries()) {
            clanSkill.prepareAdvance(this.clan, skillDef);
        }
    }

    commitAdvance() {
        for (const clanSkill of this.m_.values()) {
            clanSkill.commitAdvance();
        }
    }
}

function randomSkill(mean: number, stdev: number): number {
    return clamp(Math.round(normal(mean, stdev)), 0, 100);
}