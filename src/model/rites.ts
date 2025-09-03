import type { Clan } from "./people/people";
import type { NoteTaker } from "./records/notifications";
import { mapNormalized, sumFun, weightedHarmonicMean } from "./lib/basics";
import { SkillDefs } from "./people/skills";

export const RitualGoodsUsage = {
    Private: 'Private',
    Communal: 'Communal',
}

export class RiteItem {
    constructor(readonly name: string, readonly value: number) {}
}

export class RiteSkillItem {
    constructor(readonly name: string, readonly weight: number, readonly value: number) {}
}

export class Rites {
    skillItems: RiteSkillItem[] = [];
    skill: number = 0;

    items: Map<string, RiteItem> = new Map();
    appeal: number = 0;

    constructor(
        readonly name: string,
        readonly expectedParticipantCount: number,
        readonly skillRequirement: number,
        readonly skillFactor: number,
        readonly participants: Clan[],
        readonly leaders: Clan[],
        readonly viewers: Clan[],
        readonly noteTaker: NoteTaker) {
    }

    get producers() { return [...this.participants, ...this.leaders]; }
    get consumers() { return [...this.participants, ...this.viewers]; }

    private add(name: string, value: number) {
        this.items.set(name, new RiteItem(name, value));
    }        

    advance(plan: boolean = true) {
        if (plan) {
            this.plan();
        }
        this.perform();
    }

    plan(updateOptions: boolean = true) {
    }

    perform() {
        this.updateSkill();
        this.updateAppeal();
    }

    updateSkill() {
        this.skillItems = mapNormalized(
            this.producers,
            (c: Clan) => c.population,
            (c: Clan, weight: number) => new RiteSkillItem(
                c.name, weight, c.skills.v(SkillDefs.Ritual)));
        this.skill = weightedHarmonicMean(
            this.skillItems,
            i => i.value,
            i => i.weight);
    }

    updateAppeal() {
        const participantCount = sumFun(this.participants, c => c.population);

        this.add('Quality', this.quality());
        this.add('Numbers', this.numbers(participantCount));
        this.add('Friction', this.friction(participantCount));

        this.appeal = sumFun([...this.items.values()], i => i.value);
    }

    estimatedAppealWith(participantCount: number): number {
        return this.quality() + this.numbers(participantCount) + this.friction(participantCount);
    }

    private quality(): number {
        return this.skillFactor * (this.skill - this.skillRequirement);
    }

    private numbers(participantCount: number): number {
        const n = participantCount ? participantCount : 1;
        const r = n / this.expectedParticipantCount;
        return Math.log2(r) * 5;
    }

    private friction(participantCount: number): number {
        const extras = participantCount - this.expectedParticipantCount;
        if (extras <= 0) return 0;

        return -extras / 30;
    }

    clone(): Rites {
        const clone = new Rites(
            this.name,
            this.expectedParticipantCount,
            this.skillRequirement,
            this.skillFactor,
            this.participants,
            this.leaders,
            this.viewers,
            this.noteTaker);
        clone.skillItems = this.skillItems;
        clone.skill = this.skill;
        clone.items = new Map(this.items);
        clone.appeal = this.appeal;
        return clone;
    }
}
