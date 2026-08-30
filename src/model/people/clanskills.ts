import { clamp, dice, randInt } from "../lib/basics";
import { ClanSkill, type SkillDef } from "./skills";
import { normal } from "../lib/distributions";
import { SkillDefs } from "../econ/econdefs";
import type { Clan } from "./people";
import type { ClanSkillChange } from "./skillchange";

export class ClanSkills {
    readonly m_: Map<SkillDef, ClanSkill> = new Map<SkillDef, ClanSkill>();

    constructor(readonly clan: Clan) {
        // Irrigation comes in wide: they have all cut a channel to a field
        // at some point, but nobody has done it the way this land asks, so
        // where a clan starts is mostly luck of what it happens to have
        // seen. Construction they have barely begun. They've already been
        // fishing, though. Craft and Ritual start at the middle because that
        // is what the middle means here: these are the traditional life of
        // the people, and a clan is by definition ordinary at them.
        const gen = (skillDef: SkillDef) =>
              skillDef === SkillDefs.Irrigation
            ? randomIrrigationSkill()
            : skillDef === SkillDefs.Construction
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
    prepareAdvance(elapsedYears: number = this.clan.world?.yearsPerTick ?? 1) {
        for (const [skillDef, clanSkill] of this.m_.entries()) {
            clanSkill.prepareAdvance(this.clan, skillDef, elapsedYears);
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

// A flat spread of 10 to 30, plus the least of three d20: mostly a small
// bonus, with the occasional clan that turns out to have a real hand for it.
function randomIrrigationSkill(): number {
    const bonus = Math.min(dice(1, 20, 0), dice(1, 20, 0), dice(1, 20, 0));
    return clamp(randInt(10, 31) + bonus, 0, 100);
}