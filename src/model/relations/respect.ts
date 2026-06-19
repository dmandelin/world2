import { sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { RelationshipView } from "./relationships";

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
    items_: RespectItem[] = [];

    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
    }

    get items(): readonly RespectItem[] { return this.items_; }
    get value(): number { return sumFun(this.items_, i => i.value); }

    clone(): Respect {
        const a = new Respect(this.subject, this.object);
        a.items_ = [...this.items_];
        return a;
    }

    update(rv: RelationshipView) {
        this.items_ = [
            RespectItem.forRelationships(rv),
            //RespectItem.forSeniority(rv),
            //RespectItem.forTenure(rv),
            //RespectItem.forFace(rv),
            //RespectItem.forVisibleWealth(rv),
            //RespectItem.forSkill(rv),
            //RespectItem.forPopulation(rv),
        ];
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

    static forRelationships(rv: RelationshipView): RespectItem {
        // TODO - Have respect influence how much respect relationships
        //        generate
        // TODO - Have the strength of the relationship influence how
        //        much respect it generates
        const base = sumFun(rv.object.relationships, ([other, otherRv]) => 0.1);
        return new RespectItem(
            'Relationships',
            base,
            rv.informationFromAttention,
            `${[...rv.object.relationships].length} clans`
        );
    }
}