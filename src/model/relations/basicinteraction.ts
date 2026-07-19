import { GenericItem, uuidOf, type HasOrIsUUID, type UUID } from "../records/basicdata";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import type { World } from "../world";
import { Interaction } from "./interaction";

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
            
            const interaction = world.interactions.getOrCreate(c1, c2, BasicInteraction);
            interaction.amount1to2 = matchedOffer1to2;
            interaction.amount2to1 = matchedOffer2to1;

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
