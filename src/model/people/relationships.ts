import { normal } from "../lib/distributions";
import { clamp, product, productFun, sumFun, sumValues, weightedGeometricMean } from "../lib/basics";
import type { Clan } from "./people";
import { SkillDefs, type SkillDef } from "./skills";

const REFERENCE_COMMUNITY_SIZE = 150;

export class CalcBase {
    value: number = 0;
}

export class Relationships implements Iterable<[Clan, Relationship]> {
    private m: Map<Clan, Relationship> = new Map();

    constructor(readonly subject: Clan) {}

    [Symbol.iterator](): Iterator<[Clan, Relationship]> {
        return this.m.entries();
    }

    get(object: Clan): Relationship | undefined {
        return this.m.get(object);
    }

    add(object: Clan, relationship: Relationship): void {
        this.m.set(object, relationship);
        object.relationships.m.set(this.subject, relationship);
    }

    ensureInteractionChainWith(object: Clan, ctor: new (subject: Clan, object: Clan) => InteractionChain): void {
        // Make sure a relationship exists.
        let relationship = this.m.get(object);
        if (!relationship) {
            relationship = new Relationship(this.subject, object);
            this.m.set(object, relationship);
            object.relationships.m.set(this.subject, relationship);
        }

        // Make sure the interaction chain exists.
        if (!relationship.interactionChains.some(interaction => interaction instanceof ctor)) {
            relationship.interactionChains.push(new ctor(this.subject, object));
        }
    }

    removeInteractionChainWith(object: Clan, ctor: new (subject: Clan, object: Clan) => InteractionChain): void {
        const relationship = this.m.get(object);
        if (relationship && relationship instanceof ctor) {
            const stillHasInteractions = relationship.removeInteractionChain(ctor);
            if (!stillHasInteractions) {
                this.m.delete(object);
                object.relationships.m.delete(this.subject);
            }
        }
    }

    update() {
        for (const relationship of this.m.values()) {
            relationship.update();
        }
    }

    alignmentToward(object: Clan): number {
        const relationship = this.m.get(object);
        return relationship ? relationship.alignment.value : 0;
    }
}

export enum Stance {
    Generous = 'Generous',
    Stingy = 'Stingy',
};

export class Relationship {
    private coresidenceFraction_ = 0;

    interactionChains: InteractionChain[] = [];
    alignment: Alignment;

    stance: Stance = Stance.Generous;

    // Implementation notes on stance:
    // - Turns are 20 years so we can assume clans respond to each other.
    //   A generous clan will get burned by a stingy clan a little bit,
    //   but will then change their behavior to protect themselves for
    //   most of a turn.
    // - Stance interactions:
    //   - Generous vs Generous: both interact in high-trust ways, full
    //     benefits.
    //   - Stingy vs Stingy: interaction is reduced and more guarded, so
    //     lower benefits. Could be applied at both volume and effect levels.
    //   - Generous vs Stingy: result is similar to stingy vs stingy,
    //     except that there is slightly more interaction and also a
    //     small zero-sum transfer from generous to stingy.

    constructor(
        readonly subject: Clan,
        readonly object: Clan) 
    {
        this.interactionChains = [];
        this.alignment = new Alignment(subject, object);
    }

    cloneFor(newSubject: Clan): Relationship {
        const newRelationship = new Relationship(newSubject, this.object);
        newRelationship.stance = this.stance;
        newRelationship.alignment = this.alignment.clone();
        newRelationship.interactionChains = this.interactionChains
            .map(interaction => interaction.cloneFor(newSubject));
        return newRelationship;
    }

    get coresidenceFraction(): number {
        return this.coresidenceFraction_;
    }

    // Returns whether there are still interactions left.
    removeInteractionChain(ctor: new (subject: Clan, object: Clan) => InteractionChain): boolean {
        this.interactionChains = this.interactionChains.filter(interaction => !(interaction instanceof ctor));
        return this.interactionChains.length > 0;
    }

    update() {
        this.coresidenceFraction_ = this.subject.settlement === this.object.settlement
            ? Math.min(this.subject.residenceFraction, this.object.residenceFraction)
            : 0;

        for (const interaction of this.interactionChains) {
            interaction.update(this.coresidenceFraction_);
        }
        this.alignment.update();
    }

    get cooperationLevel(): number {
        if (this.alignment.value > 0) {
            return 0.4 + 0.6 * this.alignment.value;
        } else if (this.alignment.value > -0.2) {
            return 2 * (this.alignment.value + 0.2);
        } else {
            return 1 / .8 * (this.alignment.value + 0.2);
        }
    }
}

// A typed chain of interactions between two clans.
export abstract class InteractionChain {
    constructor(
        readonly name: string,
        readonly subject: Clan,
        readonly object: Clan,
    ) {
    }

    abstract cloneFor(newSubject: Clan): InteractionChain;
    abstract update(coresidenceFraction: number): void;
}

export class Neighbors extends InteractionChain {
    constructor(subject: Clan, object: Clan) {
        super('Neighbors', subject, object);
    }

    cloneFor(newSubject: Clan): Neighbors {
        return new Neighbors(newSubject, this.object);
    }

    update(coresidenceFraction: number) {
        // TODO - Implement something
    }
}

export class Alignment extends CalcBase {
    items: Record<string, number> = {};

    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
        super();
        this.update();
    }

    clone(): Alignment {
        const a = new Alignment(this.subject, this.object);
        a.items = { ...this.items };
        a.value = this.value;
        return a;
    }

    update() {
        // TODO - Bring back alignment effect of interactions.
        //this.items['Society'] = this.subject.relationships.get(this.object)?.interactionVolume.value ?? 0;
        this.items['Kinship'] = this.subject.kinshipTo(this.object);
        this.items['Marriage'] = this.subject.marriagePartners.get(this.object) ?? 0;
        if (this.subject !== this.object) {
            this.items['Random'] = normal(0, 0.1);
        }
        this.value = sumValues(this.items, v => v);
    }
}