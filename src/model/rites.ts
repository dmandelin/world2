import { clamp, mapNormalized, maxby, maxbyWithValue, sum, sumFun, weightedHarmonicMean } from "./lib/basics";
import { pct, xm } from "./lib/format";
import { ces } from "./lib/modelbasics";
import type { NoteTaker } from "./records/notifications";
import type { Clan } from "./people/people";
import { OwnPrestigeCalc } from "./people/prestige";
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
        this.add('Quality', this.quality());
        this.add('Numbers', this.numbers());
        this.add('Friction', this.friction());

        this.appeal = sumFun([...this.items.values()], i => i.value);
    }

    private get participantCount() {
        return sumFun(this.participants, c => c.population)
    }

    private quality(): number {
        return this.skillFactor * (this.skill - this.skillRequirement);
    }

    private numbers(): number {
        const n = this.participantCount ? this.participantCount : 1;
        const r = n / this.expectedParticipantCount;
        return Math.log2(r) * 5;
    }

    private friction(): number {
        const extras = this.participantCount - this.expectedParticipantCount;
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