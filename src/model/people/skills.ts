import type { Tagged } from '../econ/tagged';
import type { Clan } from './people';
import { ClanSkillChange } from './skillchange';

// Skills and skill values
//
// Skill is used to model teachable differences in how well 
// clans do the same activity or process. This can be from 
// clan traditions, recent learning while doing, or random
// error.
//
// Skills may be primarily used for a specific process, such
// as SkillDefs.Agriculture for Processes.Agriculture, but
// they don't have to be.
//
// The skill value ranges from 0 to 100. 100 means the clan
// does that skill about as well as any human could. 50 is
// the median value for regular practioners and can be taken
// as the baseline for modifiers. 0 means the clan has not
// practiced the skill.

export class SkillDef implements Tagged {
    constructor(
        readonly sortKey: number,
        readonly name: string,
        readonly icon: string,
        readonly color: string,
        readonly getEffort: (clan: Clan) => number = () => 0,
        readonly resetsOnMove: boolean = false,
        readonly clanSkill: boolean = false,
    ) { }
}

export class ClanSkill {
    value_: number;
    lastChange_: ClanSkillChange | undefined;

    constructor(value: number) {
        this.value_ = value;
    }

    get value(): number {
        return this.value_;
    }

    get lastChange(): ClanSkillChange | undefined {
        return this.lastChange_;
    }

    prepareAdvance(clan: Clan, skillDef: SkillDef): void {
        this.lastChange_ = new ClanSkillChange(clan, skillDef, this);
    }

    commitAdvance(): void {
        if (this.lastChange_) {
            this.value_ += this.lastChange_.delta;
        }
    }

    updateForMigration(clan: Clan): void {
        // TODO - incorporate into the main calculation
        this.value_ *= 0.9;
    }

    clone(): ClanSkill {
        const clone = new ClanSkill(this.value_);
        clone.lastChange_ = this.lastChange_;
        return clone;
    }
}
