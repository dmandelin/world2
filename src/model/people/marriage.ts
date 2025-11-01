import { remove } from "../lib/basics";
import { weightedRandInt } from "../lib/distributions";
import type { World } from "../world";
import type { Clan } from "./people";

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
                Math.random() < 0.1) {
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

            if (chosenHusbandSet.available === 0) {
                remove(potentialHusbands, chosenHusbandSet);
                offers.splice(choiceIndex, 1);
            }
        }
    }

    // Move wives to their husbands' clans.
    for (const wifeSet of potentialWives) {
        for (const [husbandClan, count] of wifeSet.marriedTo) {
            wifeSet.clan.slices[1][0] -= count;
            wifeSet.clan.population -= count;
            husbandClan.slices[1][0] += count;
            husbandClan.population += count;
        }
    }

    // Update relatedness:
    // - Maintain Clan.marriagePartners as moving averages of how many
    //   spouses are from each clan.
    const husbandsMap = new Map<Clan, PotentialPartnerSet>();
    for (const husbandSet of potentialHusbands) {
        husbandsMap.set(husbandSet.clan, husbandSet);
    }
    const wivesMap = new Map<Clan, PotentialPartnerSet>();
    for (const wifeSet of potentialWives) {
        wivesMap.set(wifeSet.clan, wifeSet);
    }
    for (const clan of clans) {
        const husbandSet = husbandsMap.get(clan);
        const wifeSet = wivesMap.get(clan);
        const totalSpouses = (husbandSet?.taken ?? 0) + (wifeSet?.taken ?? 0);
        // Compute marriage relatedness for this generation.
        const newGenerationRelatedness = new Map<Clan, number>();
        if (husbandSet) {
            for (const [spouseClan, count] of husbandSet.marriedTo) {
                newGenerationRelatedness.set(spouseClan, count / totalSpouses);
            }
        }
        if (wifeSet) {
            for (const [spouseClan, count] of wifeSet.marriedTo) {
                newGenerationRelatedness.set(spouseClan, (newGenerationRelatedness.get(spouseClan) ?? 0) + count / totalSpouses);
            }
        }
        // Average into existing relatedness with a 50% weight.
        for (const spouseClan of new Set([...clan.marriagePartners.keys(), ...newGenerationRelatedness.keys()])) {
            const existing = clan.marriagePartners.get(spouseClan) ?? 0;
            const added = newGenerationRelatedness.get(spouseClan) ?? 0;
            const updated = 0.5 * existing + 0.5 * added;
            if (updated >= 0.03) {
                clan.marriagePartners.set(spouseClan, updated);
            } else {
                clan.marriagePartners.delete(spouseClan);
            }
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