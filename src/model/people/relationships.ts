import { normal } from "../lib/distributions";
import { clamp, product, productFun, sumFun, sumValues, weightedGeometricMean } from "../lib/basics";
import type { Clan } from "./people";
import { SkillDefs, type SkillDef } from "./skills";

const REFERENCE_COMMUNITY_SIZE = 150;

export class CalcBase {
    value: number = 0;
}

export class Relationships implements Iterable<[Clan, RelationshipView]> {
    private m: Map<Clan, RelationshipView> = new Map();

    constructor(readonly subject: Clan) {}

    [Symbol.iterator](): Iterator<[Clan, RelationshipView]> {
        return this.m.entries();
    }

    get(object: Clan): RelationshipView | undefined {
        return this.m.get(object);
    }

    ensureInteractionChainWith<T extends InteractionChain>(object: Clan, ctor: new (clan1: Clan, clan2: Clan) => T): RelationshipView {
        // Make sure a relationship exists.
        let rv = this.m.get(object);
        if (!rv) {
            const r = new Relationship(this.subject, object);
            rv = new RelationshipView(this.subject, object, r);
            
            this.m.set(object, rv);
            object.relationships.m.set(
                this.subject, 
                new RelationshipView(object, this.subject, r));
        }

        // Make sure the interaction chain exists.
        let interaction = rv.relationship.interactionChains.find(interaction => interaction instanceof ctor) as T | undefined;
        if (!interaction) {
            interaction = new ctor(this.subject, object);
            rv.relationship.interactionChains.push(interaction);
        }
        return rv;
    }

    removeInteractionChainWith<T extends InteractionChain>(object: Clan, ctor: new (clan1: Clan, clan2: Clan) => T): void {
        const rv = this.m.get(object);
        if (rv) {
            const stillHasInteractions = rv.relationship.removeInteractionChain(ctor);
            if (!stillHasInteractions) {
                this.m.delete(object);
                object.relationships.m.delete(this.subject);
            }
        }
    }

    removeAllInteractionChainsOfType<T extends InteractionChain>(ctor: new (clan1: Clan, clan2: Clan) => T): void {
        for (const [_, rv] of this.m) {
            this.removeInteractionChainWith(rv.object, ctor);
        }
    }

    withInteractionChain<T extends InteractionChain>(ctor: new (clan1: Clan, clan2: Clan) => T): 
            ReadonlyArray<[RelationshipView, T]> {
        const result: [RelationshipView, T][] = [];
        for (const [_, rv] of this.m) {
            for (const interaction of rv.relationship.interactionChains) {
                if (interaction instanceof ctor) {
                    result.push([rv, interaction]);
                }
            }
        }
        return result;
    }

    // Initialize this clan's relationships to be a copy of another clan's relationships.
    // This should only be called on a fresh Relationships.
    initializeFrom(other: Relationships): void {
        for (const [object, rv] of other) {
            const r = rv.relationship.cloneFor(this.subject, object);
            const newRv = new RelationshipView(this.subject, object, r);
            this.m.set(object, newRv);
            object.relationships.m.set(this.subject, new RelationshipView(object, this.subject, r));
        }
    }


    update() {
        for (const rv of this.m.values()) {
            rv.update();
        }
    }

    alignmentToward(object: Clan): number {
        const rv = this.m.get(object);
        return rv ? rv.alignment.value : 0;
    }
}

// One clan's view of its relationship to another clan.
// - Properties are values for the directed relations from subject to object
// - The Relationship object carries undirected shared information about the
//   relationship.
export class RelationshipView {
    alignment: Alignment;
    stance: Stance = Stance.Generous;

    // Relatedness by marriage, 0-1.
    relatedness = 0;

    constructor(readonly subject: Clan, readonly object: Clan, readonly relationship: Relationship) {
        this.alignment = new Alignment(subject, object);
    }

    update() {
        // Hack to make sure we update each relationship only once, assuming we update
        // all RelationshipViews: Update only if subject UUID is less than object UUID.
        if (this.subject.uuid < this.object.uuid) {
            this.relationship.update();
        }
        
        this.alignment.update(this);
    }

    get coresidenceFraction(): number {
        return this.relationship.coresidenceFraction;
    }

    // TODO - Do something real with this
    get cooperationLevel(): number {
        return 0.8;
    }

    get interactionChains(): InteractionChain[] {
        return this.relationship.interactionChains;
    }
}

export enum Stance {
    Generous = 'Generous',
    Stingy = 'Stingy',
};

export class Relationship {
    interactionChains: InteractionChain[] = [];
    private coresidenceFraction_ = 0;

    constructor(readonly clan1: Clan, readonly clan2: Clan) {
        this.interactionChains = [];
    }

    get coresidenceFraction(): number {
        return this.coresidenceFraction_;
    }

    cloneFor(newSubject: Clan, newObject: Clan): Relationship {
        const r = new Relationship(newSubject, newObject);
        r.interactionChains = this.interactionChains.map(interaction => interaction.clone());
        return r;
    }

    // Returns whether there are still interactions left.
    removeInteractionChain(ctor: new (subject: Clan, object: Clan) => InteractionChain): boolean {
        this.interactionChains = this.interactionChains.filter(interaction => !(interaction instanceof ctor));
        return this.interactionChains.length > 0;
    }

    update() {
        this.coresidenceFraction_ = this.clan1.settlement === this.clan2.settlement
            ? Math.min(this.clan1.residenceFraction, this.clan2.residenceFraction)
            : 0;
    }
}

// A typed chain of interactions between two clans.
export abstract class InteractionChain {
    abstract readonly name: string;
    abstract alignmentEffect(rv: RelationshipView): number;
    abstract clone(): InteractionChain;
}

export class MarriagePartners extends InteractionChain {
    readonly name = 'Marriage';

    clone() {
        return new MarriagePartners();
    }

    alignmentEffect(rv: RelationshipView): number {
        return rv.relatedness;
    }
}

// A relationship that includes:
// - Regular visits
// - Gift exchange
// - Aid when needed
// - Expectation of reciprocity
export class Friends extends InteractionChain {
    readonly name = 'Friends';

    clone() {
        return new Friends();
    }

    alignmentEffect(rv: RelationshipView): number {
        return 0.1;
    }
}

export class Neighbors extends InteractionChain {
    readonly name = 'Neighbors';

    clone() {
        return new Neighbors();
    }

    alignmentEffect(rv: RelationshipView): number {
        // There is a small alignment effect for regular neighbors who
        // live near each other. If they don't live together, we'll still
        // give them a tiny bump, but not much.
        return Math.max(0.01, 0.05 * rv.coresidenceFraction);
    }
}

export class Alignment extends CalcBase {
    items: Record<string, number> = {};

    constructor(
        readonly subject: Clan,
        readonly object: Clan
    ) {
        super();
    }

    clone(): Alignment {
        const a = new Alignment(this.subject, this.object);
        a.items = { ...this.items };
        a.value = this.value;
        return a;
    }

    update(rv: RelationshipView) {
        this.items['Kinship'] = this.subject.kinshipTo(this.object);
        for (const interactionChain of rv.relationship.interactionChains) {
            this.items[interactionChain.name] = 
                interactionChain.alignmentEffect(rv);
        }
        if (this.subject !== this.object) {
            this.items['Random'] = normal(0, 0.1);
        }
        this.value = sumValues(this.items, v => v);
    }
}