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
//     *   Beauty/health: For now, based on nutrition
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
    value: number = 0.5;

    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
    }

    clone(): Respect {
        const a = new Respect(this.subject, this.object);
        a.value = this.value;
        return a;
    }

    update(rv: RelationshipView) {
    }    
}