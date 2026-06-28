import { sumFun } from "../lib/basics";
import { weightedAverage } from "../lib/modelbasics";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";

// Notes on how the calculations will work:
//
// Respect is based on information clan A has about clan B,
// so it will depend on interactions and visibility.
//
// Clans' opinions on this should be able to influence each other.
// However, that's not automatically important right away.
//
// Factors:
// *   Major
//     *   Relationships, especially with more prestigious clans
//     *   Seniority (parent/cadet clan relationships)
//     *   Tenure in the area
//     *   "Face": For now, based on nutrition
//         *   Also base on care and leisure
//         *   Fairly salient, needs some interaction but not
//             a lot
//     *   Visible food storage - requires close observation
//         to see this unless it's somehow advertised
// *   Medium
//     *   Asking for/giving help - giving help doesn't directly
//         produce prestige (it's more about alignment), but it
//         implies resources to spare
//     *   Skill - requires close observation unless the skill is
//         particularly prominent
// *   Lesser
//     *   Population
//     *   Gifts

export class Respect {
    private items_: RespectItem[] = [];

    get items(): readonly RespectItem[] { return this.items_; }
    get value(): number { return sumFun(this.items_, i => i.value); }

    updateFor(subject: Clan, object: Clan): void {
        this.items_ = [
            RespectItem.forRelationships(subject, object),
            //RespectItem.forSeniority(rv),
            //RespectItem.forTenure(rv),
            //RespectItem.forFace(rv),
            //RespectItem.forVisibleWealth(rv),
            //RespectItem.forSkill(rv),
            //RespectItem.forPopulation(rv),
        ];
    }    

    clone(): Respect {
        const a = new Respect();
        a.items_ = [...this.items_];
        return a;
    }
}

export class RespectItem {
    constructor(
        readonly label: string,
        readonly baseValue: number,
        readonly informationModifier: number,
        readonly explanation: string,
    ) {}

    get value(): number {
        return this.baseValue * this.informationModifier;
    }

    static forRelationships(subject: Clan, object: Clan): RespectItem {
        // TODO - Have respect influence how much respect relationships
        //        generate
        // TODO - Have the strength of the relationship influence how
        //        much respect it generates
        const world = subject.world;
        const objectConnections = [...world.connections.entriesForHasUUID(object)];
        const base = sumFun(
            objectConnections, 
            ([other, connections]) => 0.1);
        return new RespectItem(
            'Relationships',
            base,
            world.perceptions.get(subject.uuid, object.uuid)?.information.value ?? 0,
            `${objectConnections.length} clans`
        );
    }
}

export function getRespect(subject: Clan|ClanDTO, object: Clan|ClanDTO): number {
    return subject.world.perceptions.get(subject.uuid, object.uuid)?.respect.value ?? 0;
}

// Average respect weighted by population.
export function getRespectInScope(object: Clan|ClanDTO, scope: (Clan|ClanDTO)[]): number {
    return weightedAverage(
        scope, 
        subject => getRespect(subject, object), 
        subject => subject.population);
}

export function getRespectInScopeDetail(object: Clan|ClanDTO, scope: (Clan|ClanDTO)[]) {
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

export function averageRespectInScope(scope: (Clan|ClanDTO)[]): number {
    return weightedAverage(
        scope,
        object => getRespectInScope(object, scope),
        object => object.population
    );
}

// Respect within settlement relative to weighted average respect.
export function getPrestigeInScope(clan: Clan|ClanDTO, scope: (Clan|ClanDTO)[]): number {
    return getRespectInScope(clan, scope) - averageRespectInScope(scope);
}

export function getLocalRespect(clan: Clan|ClanDTO): number {
    const settlement = clan.settlement;
    if (!settlement) return 0;
    return getRespectInScope(clan, settlement.clans);
}

export function getLocalPrestige(clan: Clan|ClanDTO): number {
    const settlement = clan.settlement;
    if (!settlement) return 0;
    return getPrestigeInScope(clan, settlement.clans);
}

export function getAreaPrestige(clan: Clan|ClanDTO): number {
    const cluster = clan.settlement.cluster;
    if (!cluster) return 0;
    return getPrestigeInScope(clan, cluster.clans);
}