import type { Clan } from './people';
import { ClanSkillChange } from './skillchange';
import { ProductivityCalc } from './productivity';
import { Traits } from './traits';
import { normal } from '../lib/distributions';

export class SkillDef {
    constructor(
        readonly name: string,
        readonly icon: string,
        readonly traitFactors: Map<string, number> = new Map<string, number>(),
    ) {}
}

export const SkillDefs = {
    Agriculture: new SkillDef('Agriculture', 'skill-farming-256.png',
        new Map([['Skill', 1], [Traits.Intelligence, 1], [Traits.Strength, 2]])),
    Irrigation: new SkillDef('Irrigation', 'skill-irrigation-256.png',
        new Map([['Skill', 1], [Traits.Intelligence, 2], [Traits.Strength, 1]])),
    Ritual: new SkillDef('Ritual', 'skill-ritual-256.png',
        new Map([['Skill', 2], [Traits.Intelligence, 1], [Traits.Strength, 1]])),
};

export class ClanSkill {
    value_: number;
    lastChange_: ClanSkillChange|undefined;

    constructor(value: number) {
        this.value_ = value;
    }

    get value(): number {
        return this.value_;
    }

    get lastChange(): ClanSkillChange|undefined {
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

export class ClanSkills {
    readonly m_: Map<SkillDef, ClanSkill> = new Map<SkillDef, ClanSkill>();

    constructor(readonly clan: Clan) {
        // Make them build up some skill ditching at the beginning before
        // they get good at it. This is different from how they do it in the
        // north, so they have less of a model to imitate.
        const gen = (skillDef: SkillDef) => 
              skillDef === SkillDefs.Irrigation
            ? normal(20, 5)
            : normal(40, 10);
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

    createProductivityCalcs(): Map<SkillDef, ProductivityCalc> {
        const calcs = new Map<SkillDef, ProductivityCalc>();
        for (const skillDef of this.m_.keys()) {
            calcs.set(skillDef, new ProductivityCalc(this.clan, skillDef));
        }
        return calcs;
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
