import { GenericItem, type UUID } from "../records/basicdata";
import { ClanPairListGraph } from "./clanpairgraph";
import type { Clan } from "../people/people";

export abstract class Interaction {
    constructor(
        readonly c1: UUID,
        readonly c2: UUID,
    ) {}

    abstract alignmentItem(subject: Clan, object: Clan): GenericItem;
    abstract information(subject: Clan, object: Clan): number;
}

export class InteractionGraph extends ClanPairListGraph<Interaction> {
    clone(): InteractionGraph {
        const g = new InteractionGraph();
        // Interactions themselves are shared rather than copied, as they were
        // before: a snapshot points at the same interaction objects.
        g.fillFrom(this, items => [...items]);
        return g;
    }
}
