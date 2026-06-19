import { maxbyWithValue } from "../lib/basics";
import type { Clan } from "../people/people";
import type { World } from "../world";
import { type RelationshipView } from "./relationships";

export class Alignment {
    interactionType: string = '';
    interactionTypeModifier: number = 1;

    attention: number = 0;
    objectPopulation: number = 1;
    base: number = 0;
    value: number = 0;

    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
    }

    clone(): Alignment {
        const a = new Alignment(this.subject, this.object);
        a.interactionType = this.interactionType;
        a.interactionTypeModifier = this.interactionTypeModifier;
        a.attention = this.attention;
        a.objectPopulation = this.objectPopulation;
        a.base = this.base;
        a.value = this.value;
        return a;
    }

    update(rv: RelationshipView) {
        const [ic, mod] = maxbyWithValue(
            rv.interactionChains,
            interactionChain => interactionChain.alignmentModifier(rv)
        );
        this.interactionType = ic ? ic.name : '';
        this.interactionTypeModifier = mod ?? 1;

        this.attention = rv.attention;
        this.objectPopulation = rv.object.population;
        this.base = this.attention / this.objectPopulation;
        this.value = this.base * this.interactionTypeModifier;
    }
}

export function updateAlignment(world: World): void {
    for (const clan of world.allClans) {
        // TODO - Clean this up a bit. Right now this call pretty much just
        // updates alignment but it's not an exact match.
        clan.relationships.update();
    }
}