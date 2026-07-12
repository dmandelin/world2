import { sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import { SkillDefs } from "../econ/econdefs";

export class MarriageInterest {
    private items_: MarriageInterestItem[] = [];

    get items(): readonly MarriageInterestItem[] { return this.items_; }
    get value(): number { return sumFun(this.items_, i => i.value); }

    updateFor(subject: Clan, object: Clan): void {
        this.items_ = [
            MarriageInterestItem.forStress(subject, object),
            MarriageInterestItem.forStandardOfLiving(subject, object),
            MarriageInterestItem.forSkills(subject, object),
            MarriageInterestItem.forRandom(subject, object),
        ];
    }

    clone(): MarriageInterest {
        const a = new MarriageInterest();
        a.items_ = [...this.items_];
        return a;
    }
}

export class MarriageInterestItem {
    constructor(
        readonly label: string,
        readonly baseValue: number,
        readonly informationModifier: number,
        readonly explanation: string,
    ) { }

    get value(): number {
        return this.baseValue * this.informationModifier;
    }

    static forStress(subject: Clan, object: Clan): MarriageInterestItem {
        return new MarriageInterestItem(
            'Stress',
            object.stress.value - subject.stress.value,
            1,
            `Stress`
        );
    }

    static forStandardOfLiving(subject: Clan, object: Clan): MarriageInterestItem {
        return new MarriageInterestItem(
            'Standard of Living',
            object.qol.value - subject.qol.value,
            1,
            `Standard of Living`
        );
    }

    static forSkills(subject: Clan, object: Clan): MarriageInterestItem {
        const skillDefs = Object.values(SkillDefs);
        const totalObjectSkill = sumFun(skillDefs, s => object.skills.v(s));
        const avgObjectSkill = totalObjectSkill / (skillDefs.length || 1);
        const totalSubjectSkill = sumFun(skillDefs, s => subject.skills.v(s));
        const avgSubjectSkill = totalSubjectSkill / (skillDefs.length || 1);
        return new MarriageInterestItem(
            'Skills',
            (avgObjectSkill - avgSubjectSkill) / 10,
            1,
            `Skills`
        );
    }

    static forRandom(subject: Clan, object: Clan): MarriageInterestItem {
        // Small random value in range [0, 2]
        const randVal = Math.random() * 2;
        return new MarriageInterestItem(
            'Random',
            randVal,
            1,
            `random factor`
        );
    }
}
