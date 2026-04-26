import { remove } from "../lib/basics";
import { weightedRandInt } from "../lib/distributions";
import type { World } from "../world";
import type { Clan } from "./people";
import { MarriagePartners } from "./relationships";

// Marry people in the 20-40 age range in the given region.
//
// This is intended to be run just before advancing the population,
// so that it represents the people having children in the current
// turn having gotten married at some point.
//
// This will move people from one clan to another and affect
// relatedness of clans. One key reason to have this is that
// otherwise, once a clan randomly has few young women, it will
// rapidly die out.
//
// For now, we assume patrilocality, where women move to their 
// husband's clan, but we don't necessarily simulate every last 
// marriage to that level of detail. Variances can be chalked up
// to adoption, matrilocal marriage in individual cases, and so on.
//
// For pairings, the model is that potential husbands and their
// clans "offer" and potential wives and their clans "choose".
// We won't go so detailed to give different appeal for individuals,
// but there could be some variable factors about clans.
export function marry(world: World): void {
    const clans = world.allClans;
    const pairingCounts = new PairingCounts();

    const potentialHusbands = clans.map(clan => {
        const count = clan.slices[1][0];
        return new PotentialPartnerSet(clan, clan.averagePrestige, count);
    });

    // Gather potential wives and set them up to act in order of appeal.
    const potentialWives = clans.map(clan => {
        const count = clan.slices[1][0];
        return new PotentialPartnerSet(clan, clan.averagePrestige, count);
    });
    potentialWives.sort((a, b) => b.appeal - a.appeal);

    // Let each potential wife choose from available offers. Here we only
    // record the wedding, but don't update populations yet.
    for (const wifeSet of potentialWives) {
        // Assume offers from clans in the same village, and some
        // probability of offers from others. Include the clan itself
        // as a "woman doesn't move away for whatever reason" option.
        const offers: PotentialPartnerSet[] = [];
        for (const husbandSet of potentialHusbands) {
            if (husbandSet.clan.settlement === wifeSet.clan.settlement ||
                (Math.random() < 0.25 && 
                 husbandSet.clan.settlement.milesTo(wifeSet.clan.settlement) < 12)) {
                offers.push(husbandSet);
            }
        }

        for (let i = 0; i < wifeSet.count; ++i) {
            if (offers.length === 0) break;
            const choiceIndex = weightedRandInt(offers, o => Math.pow(10, o.appeal / 100));
            const chosenHusbandSet = offers[choiceIndex];
            if (chosenHusbandSet.clan === wifeSet.clan) {
                continue;
            }

            chosenHusbandSet.addMarriage(wifeSet.clan);
            wifeSet.addMarriage(chosenHusbandSet.clan);
            pairingCounts.add(chosenHusbandSet.clan, wifeSet.clan);

            if (chosenHusbandSet.available === 0) {
                remove(potentialHusbands, chosenHusbandSet);
                offers.splice(choiceIndex, 1);
            }
        }
    }

    // Update clan marriage relationships:
    // - New marriages increase thickness by the fraction of the generation
    //   married to that clan.
    // - Existing marriage relationships decay. They should cease to have
    //   any effect within 3-6 generations if there are no new marriages.
    for (const c1 of clans) {
        for (const [rv, ic] of c1.relationships.withInteractionChain(MarriagePartners)) {
            rv.relatedness *= 0.5;
            if (rv.relatedness < 0.03) {
                c1.relationships.removeInteractionChainWith(rv.object, MarriagePartners);
            }
        }
    }
    for (const [c1, m] of pairingCounts.counts) {
        for (const [c2, count] of m) {
            const rv = c1.relationships.ensureInteractionChainWith(c2, MarriagePartners);
            rv.relatedness += count / c1.population;
            if (rv.relatedness > 1) {
                rv.relatedness = 1;
            }
        }
    }

    // Move wives to their husbands' clans. We do the moves last so that population
    // counts are fixed during the computations above.
    for (const wifeSet of potentialWives) {
        for (const [husbandClan, count] of wifeSet.marriedTo) {
            wifeSet.clan.slices[1][0] -= count;
            wifeSet.clan.population -= count;
            husbandClan.slices[1][0] += count;
            husbandClan.population += count;
        }
    }
}

class PotentialPartnerSet {
    marriedTo: Map<Clan, number> = new Map();
    taken = 0;

    constructor(readonly clan: Clan, readonly appeal: number, readonly count: number) {
    }

    addMarriage(clan: Clan, count: number = 1) {
        this.marriedTo.set(clan, (this.marriedTo.get(clan) ?? 0) + count);
        this.taken += count;
    }

    get available() { return this.count - this.taken; }
}

class PairingCounts {
    counts: Map<Clan, Map<Clan, number>> = new Map();

    add(clan1: Clan, clan2: Clan, count: number = 1) {
        this.addOneWay(clan1, clan2, count);
        this.addOneWay(clan2, clan1, count);
    }

    addOneWay(subject: Clan, object: Clan, count: number) {
        let m = this.counts.get(subject);
        if (!m) {
            m = new Map();
            this.counts.set(subject, m);
        }
        m.set(object, (m.get(object) ?? 0) + count);
    }
}