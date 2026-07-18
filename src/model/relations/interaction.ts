import { GenericItem, pairIDOf, uuidOf, type HasOrIsUUID, type PairID, type UUID } from "../records/basicdata";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import type { World } from "../world";

export abstract class Interaction {
    constructor(
        readonly c1: UUID,
        readonly c2: UUID,
    ) {}

    abstract alignmentItem(subject: Clan, object: Clan): GenericItem;
    abstract information(subject: Clan, object: Clan): number;
}

export class BasicInteraction extends Interaction {
    amount1to2: number = 0;
    amount2to1: number = 0;
    
    constructor(c1: UUID, c2: UUID) {
        super(c1, c2);
    }

    directedRelativeAttention(subject: Clan|ClanDTO, object: Clan|ClanDTO): number {
        const amount = subject.uuid === this.c1 ? this.amount1to2 : this.amount2to1;
        return amount / object.population;
    }

    relativeAttention(subject: Clan|ClanDTO, object: Clan|ClanDTO): number {
        return Math.min(
            this.directedRelativeAttention(subject, object),
            this.directedRelativeAttention(object, subject)
        );
    }

    information(subject: Clan|ClanDTO, object: Clan|ClanDTO): number {
        return this.relativeAttention(subject, object);
    }

    alignmentItem(subject: Clan|ClanDTO, object: Clan|ClanDTO): GenericItem {
        const relativeAttention = this.relativeAttention(subject, object);
        return new GenericItem(
            'Interaction',
            0.2 * relativeAttention,
            `From ${pct(relativeAttention)}`,
        )
    }
}

export class InteractionGraph {
    private m_: Map<PairID, Interaction[]> = new Map();
    private a_: Map<string, Set<PairID>> = new Map();

    clear(): void {
        this.m_.clear();
        this.a_.clear();
    }

    get(c1: HasOrIsUUID, c2: HasOrIsUUID): Interaction[]  {
        const pairID = pairIDOf(c1, c2);
        return this.m_.get(pairID) ?? [];
    }

    getFor(c: HasOrIsUUID): Iterable<[string, Interaction[]]> {
        const pairIDs = this.a_.get(uuidOf(c));
        if (!pairIDs) return [];
        return [...pairIDs].map(pairID => {
            const [c1, c2] = pairID.split('|');
            const other = c1 === uuidOf(c) ? c2 : c1;
            return [other, this.m_.get(pairID)!] as [string, Interaction[]];
        });
    }

    addBasic(c1: HasOrIsUUID, c2: HasOrIsUUID, amount1to2: number, amount2to1: number): void {
        const pairID = pairIDOf(c1, c2);
        let interactions = this.m_.get(pairID);
        if (!interactions) {
            interactions = [];
            this.m_.set(pairID, interactions);

            let s1 = this.a_.get(uuidOf(c1));
            if (!s1) {
                s1 = new Set<PairID>();
                this.a_.set(uuidOf(c1), s1);
            }
            s1.add(pairID);
            let s2 = this.a_.get(uuidOf(c2));
            if (!s2) {
                s2 = new Set<PairID>();
                this.a_.set(uuidOf(c2), s2);
            }
            s2.add(pairID);
        }
        let interaction = interactions.find(i => i instanceof BasicInteraction) as BasicInteraction | undefined;
        if (!interaction) {
            interaction = new BasicInteraction(uuidOf(c1), uuidOf(c2));
            interactions.push(interaction);
        }
        interaction.amount1to2 = amount1to2;
        interaction.amount2to1 = amount2to1;
    }

    clone(): InteractionGraph {
        const g = new InteractionGraph();
        for (const [pairID, interactions] of this.m_) {
            g.m_.set(pairID, [...interactions]);
        }
        for (const [uuid, pairIDs] of this.a_) {
            g.a_.set(uuid, new Set(pairIDs));
        }
        return g;
    }
}

export function updateBasicInteractions(world: World): void {
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

    // Clear previous interactions.
    world.interactions.clear();

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
            world.interactions.addBasic(c1, c2, matchedOffer1to2, matchedOffer2to1);

            if (!acceptedOffers.has(c1)) {
                acceptedOffers.set(c1, new Set());
            }
            acceptedOffers.get(c1)!.add(c2);
        }
    }
}

export function getRelativeAttention<T extends Clan|ClanDTO>(subject: T, object: T): number {
    const interactions = subject.world.interactions.get(subject, object);
    let relativeAttention = 0;
    for (const interaction of interactions) {
        if (!(interaction instanceof BasicInteraction)) continue;
        relativeAttention += interaction.relativeAttention(subject, object);
    }
    return relativeAttention;
}