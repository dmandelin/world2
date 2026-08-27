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
        // How hard this skill is to get and to keep, with 1 as ordinary.
        // A harder skill is picked up more slowly, and its tradition is
        // harder to pass on intact, so it also decays faster. The factor is
        // split evenly across the two sides -- learning goes as
        // 1/sqrt(difficulty) and error as sqrt(difficulty) -- so the ceiling
        // falls with difficulty itself:
        //     ceiling = 50 * focusFactor * intellectFactor / difficulty
        // reached with a time constant of 200 / sqrt(difficulty) years.
        // Turning this one number down raises the ceiling and stretches the
        // climb toward it together.
        readonly difficulty: number = 1,
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

    prepareAdvance(clan: Clan, skillDef: SkillDef, elapsedYears: number = clan.world?.yearsPerTick ?? 1): void {
        this.lastChange_ = new ClanSkillChange(elapsedYears, clan, skillDef, this);
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
