import { sumFun } from "../lib/basics";
import { weightedAverage } from "../lib/modelbasics";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import { SkillDefs } from "../econ/econdefs";

export class Respect {
    private items_: RespectItem[] = [];
    private informationValue_: number = 0;
    private previousValue_: number = 0;
    private value_: number = 0;

    static readonly ALPHA = 0.1;

    get items(): readonly RespectItem[] { return this.items_; }
    get informationValue(): number { return this.informationValue_; }
    get previousValue(): number { return this.previousValue_; }

    get currentItemsTotal(): number {
        const infoMultiplier = Math.max(0, Math.min(1, this.informationValue_));
        return sumFun(this.items_, i => i.value) * infoMultiplier;
    }

    get value(): number {
        return this.value_;
    }

    updateFor(subject: Clan, object: Clan, informationValue: number = 1): void {
        this.informationValue_ = informationValue;
        this.items_ = [
            RespectItem.forGenerosity(subject, object),
            RespectItem.forSkills(subject, object),
            RespectItem.forStress(subject, object),
            RespectItem.forStandardOfLiving(subject, object),
            RespectItem.forRandom(subject, object),

            // TODO - Add size component?
            // TODO - Add seniority component, depending on culture?
            // TODO - Add "beauty" component?
        ];
        this.previousValue_ = this.value_;
        const currentTotal = this.currentItemsTotal;
        this.value_ = Respect.ALPHA * currentTotal + (1 - Respect.ALPHA) * this.previousValue_;
    }

    clone(): Respect {
        const a = new Respect();
        a.items_ = [...this.items_];
        a.informationValue_ = this.informationValue_;
        a.previousValue_ = this.previousValue_;
        a.value_ = this.value_;
        return a;
    }
}

export class RespectItem {
    constructor(
        readonly label: string,
        readonly baseValue: number,
        readonly modifier: number,
        readonly explanation: string,
    ) { }

    get value(): number {
        return this.baseValue * this.modifier;
    }

    static forStress(subject: Clan, object: Clan): RespectItem {
        return new RespectItem(
            'Stress',
            object.stress.value - subject.stress.value,
            0.1,
            `Stress`
        );
    }

    static forStandardOfLiving(subject: Clan, object: Clan): RespectItem {
        return new RespectItem(
            'Standard of Living',
            object.qol.value - subject.qol.value,
            0.2,
            `Standard of Living`
        );
    }

    static forSkills(subject: Clan, object: Clan): RespectItem {
        const skillDefs = Object.values(SkillDefs);
        const totalObjectSkill = sumFun(skillDefs, s => object.skills.v(s));
        const avgObjectSkill = totalObjectSkill / (skillDefs.length || 1);
        const totalSubjectSkill = sumFun(skillDefs, s => subject.skills.v(s));
        const avgSubjectSkill = totalSubjectSkill / (skillDefs.length || 1);
        return new RespectItem(
            'Skills',
            (avgObjectSkill - avgSubjectSkill) / 10,
            1,
            `Skills`
        );
    }

    static forGenerosity(subject: Clan, object: Clan): RespectItem {
        const foodGiven = (object.distribution ? object.distribution.totalFoodGiven : 0) + (object.stockOutflow ? object.stockOutflow.totalFoodGiven : 0);
        return new RespectItem(
            'Generosity',
            foodGiven,
            2,
            `Generosity`
        );
    }

    static forRandom(subject: Clan, object: Clan): RespectItem {
        // Small random value in range [0, 2]
        const randVal = Math.random() * 2;
        return new RespectItem(
            'Random',
            randVal,
            1,
            `random factor`
        );
    }
}

export function getRespect(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return subject.world.perceptions.get(subject.uuid, object.uuid)?.respect.value ?? 0;
}

// Average respect weighted by population.
export function getRespectInScope(object: Clan | ClanDTO, scope: (Clan | ClanDTO)[]): number {
    return weightedAverage(
        scope,
        subject => getRespect(subject, object),
        subject => subject.population);
}

export function getRespectInScopeDetail(object: Clan | ClanDTO, scope: (Clan | ClanDTO)[]) {
    const items = [];
    const totalPopulation = sumFun(scope, subject => subject.population) || 1;
    for (const subject of scope) {
        const respect = getRespect(subject, object);
        items.push({
            label: subject.name,
            respect,
            weight: subject.population / totalPopulation,
            weightedValue: respect * (subject.population / totalPopulation),
        });
    }
    return items;
}

export function averageRespectInScope(scope: (Clan | ClanDTO)[]): number {
    return weightedAverage(
        scope,
        object => getRespectInScope(object, scope),
        object => object.population
    );
}

// Respect within settlement relative to weighted average respect.
export function getPrestigeInScope(clan: Clan | ClanDTO, scope: (Clan | ClanDTO)[]): number {
    return getRespectInScope(clan, scope) - averageRespectInScope(scope);
}

export function getLocalRespect(clan: Clan | ClanDTO): number {
    const settlement = clan.settlement;
    if (!settlement) return 0;
    return getRespectInScope(clan, settlement.clans);
}

export function getLocalPrestige(clan: Clan | ClanDTO): number {
    const settlement = clan.settlement;
    if (!settlement) return 0;
    return getPrestigeInScope(clan, settlement.clans);
}

export function getAreaPrestige(clan: Clan | ClanDTO): number {
    const cluster = clan.settlement.cluster;
    if (!cluster) return 0;
    return getPrestigeInScope(clan, cluster.clans);
}