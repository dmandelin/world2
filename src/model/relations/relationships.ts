import { average, clamp, sum } from "../lib/basics";
import type { Clan } from "../people/people";
import type { World } from "../world";
import { Alignment, updateAlignment } from "./alignment";
import { Respect } from "./respect";

export class Relationships implements Iterable<[Clan, RelationshipView]> {
    private m: Map<Clan, RelationshipView> = new Map();

    constructor(readonly subject: Clan) {}

    [Symbol.iterator](): Iterator<[Clan, RelationshipView]> {
        return this.m.entries();
    }

    *inverted(): Iterable<[Clan, RelationshipView]> {
        for (const [other, rv] of this) {
            yield [other, other.relationships.get(this.subject)!];
        }
    }

    get(object: Clan): RelationshipView | undefined {
        return this.m.get(object);
    }

    strongTies(): RelationshipView[] {
        const result: RelationshipView[] = [];
        for (const [_, rv] of this.m) {
            if (rv.relationship.interactionChains.some(ic => !ic.isWeakTie)) {
                result.push(rv);
            }
        }
        return result;
    }

    weakTies(): RelationshipView[] {
        const result: RelationshipView[] = [];
        for (const [_, rv] of this) {
            if (rv.relationship.interactionChains.every(ic => ic.isWeakTie)) {
                result.push(rv);
            }
        }
        return result;
    }

    get prestige(): number {
        return average(
            [...this.inverted()].map(([other, rv]) => rv.respect.value * other.population),
        )
    }

    get prestigeItems() {
        const totalWeight = sum([...this.inverted()].map(([other, rv]) => other.population));
        return [...this.inverted()].map(([other, rv]) => ({
            label: other.name,
            respect: rv.respect.value,
            weight: other.population / totalWeight,
            weightedValue: rv.respect.value * other.population / totalWeight,
        }));
    }

    ensureInteractionChainWith<T extends InteractionChain>(object: Clan, ctor: new (clan1: Clan, clan2: Clan) => T, attention1?: number, attention2?: number): RelationshipView {
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

        // Set attention if given.
        if (attention1 !== undefined) {
            if (isNaN(attention1)) debugger;
            rv.attention = attention1;
        }
        if (attention2 !== undefined) {
            if (isNaN(attention2)) debugger;
            const rv2 = object.relationships.get(this.subject)!;
            rv2.attention = attention2;
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
    attention = 0;

    alignment: Alignment;
    respect: Respect;
    stance: Stance = Stance.Generous;

    // Relatedness by marriage, 0-1.
    relatedness = 0;

    constructor(readonly subject: Clan, readonly object: Clan, readonly relationship: Relationship) {
        this.alignment = new Alignment(subject, object);
        this.respect = new Respect(subject, object);
    }

    update() {
        // Hack to make sure we update each relationship only once, assuming we update
        // all RelationshipViews: Update only if subject UUID is less than object UUID.
        if (this.subject.uuid < this.object.uuid) {
            this.relationship.update();
        }
        
        this.alignment.update(this);
        this.respect.update(this);
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

    // The amount of attention the subject gives to the object,
    // relative to the amount needed for full gossip-network
    // connection. 0-1.
    get relativeAttention(): number {
        return this.object.population > 0
            ? this.attention / this.object.population
            : 0;
    }

    // The amount of information the subject has about the object
    // based only attention (not including information from other 
    // sources). 0-1.
    get informationFromAttention(): number {
        // Information flows relatively easily; it doesn't take a
        // ton of attention to know basic facts.
        return Math.pow(this.relativeAttention, 1/3);
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
    abstract readonly isWeakTie: boolean;
    abstract alignmentModifier(rv: RelationshipView): number;
    abstract clone(): InteractionChain;
}

export class MarriagePartners extends InteractionChain {
    readonly name = 'Marriage';
    readonly isWeakTie = false;

    clone() {
        return new MarriagePartners();
    }

    alignmentModifier(rv: RelationshipView): number {
        return clamp(1 + 2 * rv.relatedness, 1, 1.5);
    }
}

// A relationship that includes:
// - Regular visits
// - Gift exchange
// - Aid when needed
// - Expectation of reciprocity
export class Friends extends InteractionChain {
    readonly name = 'Friends';
    readonly isWeakTie = false;

    clone() {
        return new Friends();
    }

    alignmentModifier(rv: RelationshipView): number {
        return 1.25;
    }
}

export class Neighbors extends InteractionChain {
    readonly name = 'Neighbors';
    readonly isWeakTie = true;

    clone() {
        return new Neighbors();
    }

    alignmentModifier(rv: RelationshipView): number {
        return 1;
    }
}

export function updateRelationships(world: World): void {
    updateRelationshipsGraph(world);
    updateAlignment(world);
}

export function updateRelationshipsGraph(world: World): void {
    // This is a matching process: to have a relationship, two clans must
    // spend A attention on each other. Algorithm:
    // - For each clan, calculate the relationship appeal of each clan
    //   it's in contact with.
    // - Offer attention proportionally to some function of appeal.
    // - Match offers.
    // - Optionally go again to use up remaining attention.

    // TODO - friends
    // TODO - marriage partners
    // TODO - more texture on relationship appeal

    // Build offers map.
    const offers = new Map<Clan, Map<Clan, number>>();
    for (const c1 of world.allClans.filter(c => c.population > 0)) {
        const budget = 150 - c1.population;

        const appealMap = new Map<Clan, number>();
        let totalAppeal = 0;
        for (const c2 of c1.settlement.clans) {
            if (c1 === c2) continue;
            const appeal = 1;
            totalAppeal += appeal;
            appealMap.set(c2, appeal);
        }

        const offerMap = new Map<Clan, number>();
        let unallocatedBudget = budget;
        const remainingClans = new Set(appealMap.keys());
        
        while (unallocatedBudget > 0.001 && remainingClans.size > 0) {
            let currentTotalAppeal = 0;
            for (const c2 of remainingClans) {
                currentTotalAppeal += appealMap.get(c2)!;
            }
            if (currentTotalAppeal === 0) break;

            const budgetToDistribute = unallocatedBudget;
            let budgetUsedThisRound = 0;
            let cappedAny = false;

            for (const c2 of remainingClans) {
                const appeal = appealMap.get(c2)!;
                const share = (appeal / currentTotalAppeal) * budgetToDistribute;
                const currentOffer = offerMap.get(c2) ?? 0;
                let newOffer = currentOffer + share;

                if (newOffer >= c2.population) {
                    newOffer = c2.population;
                    remainingClans.delete(c2);
                    cappedAny = true;
                }
                
                budgetUsedThisRound += (newOffer - currentOffer);
                offerMap.set(c2, newOffer);
            }
            unallocatedBudget -= budgetUsedThisRound;
            if (!cappedAny) {
                break;
            }
        }
        offers.set(c1, offerMap);
    }

    // Match offers and ensure relationships exist.
    const acceptedOffers = new Map<Clan, Set<Clan>>();
    for (const [c1, offerMap] of offers) {
        for (const [c2, offer1to2] of offerMap) {
            if (c1.uuid > c2.uuid) continue; // Avoid duplicate processing
            const offer2to1 = offers.get(c2)?.get(c1) || 0;
            if (offer2to1 === 0) continue;

            // Offers match on the amount of relative attention, so that a
            // clan of size N that offers 2N to a clan of size 2N that offers
            // back N is an exact full match on both sides.
            const relativeOffer1to2 = offer1to2 / c2.population;
            const relativeOffer2to1 = offer2to1 / c1.population;
            const matchedRelativeOffer = Math.min(relativeOffer1to2, relativeOffer2to1);
            const matchedOffer1to2 = matchedRelativeOffer * c2.population;
            const matchedOffer2to1 = matchedRelativeOffer * c1.population;
            if (isNaN(matchedOffer1to2) || isNaN(matchedOffer2to1)) debugger;
            c1.relationships.ensureInteractionChainWith(c2, Neighbors, matchedOffer1to2, matchedOffer2to1);

            if (!acceptedOffers.has(c1)) {
                acceptedOffers.set(c1, new Set());
            }
            acceptedOffers.get(c1)!.add(c2);
        }
    }

    // Prune relationships that weren't given attention.
    for (const c1 of world.allClans) {
        for (const [c2, rv] of [...c1.relationships]) {
            if (c1.uuid > c2.uuid) continue; // Avoid duplicate processing
            if (!acceptedOffers.get(c1)?.has(c2)) {
                c1.relationships.removeInteractionChainWith(c2, Neighbors);
            }
        }
    }
}
