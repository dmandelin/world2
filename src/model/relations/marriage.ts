import { remove, shuffled, sortedByKey } from "../lib/basics";
import { weightedRandInt } from "../lib/distributions";
import type { World } from "../world";
import type { Clan } from "../people/people";
import { MarriageConnection } from "./connection";

export class MarriageDecisions {
    constructor(
        readonly potentialWives: PotentialPartnerSet[],
        readonly pairingCounts: PairingCounts,
    ) { }
}

function getMarriageAppeal(world: World, subject: Clan, object: Clan): number {
    return world.perceptions.get(subject.uuid, object.uuid)?.marriageInterest?.value ?? 0;
}

class ClanMarriageState {
    unmatchedHusbands: number;
    unmatchedWives: number;
    // Map of wifeClan -> count of provisionally matched wives from that wifeClan to this husbandClan
    provisionalMarriages: Map<Clan, number> = new Map();

    constructor(readonly clan: Clan) {
        const count = clan.slices[1][0];
        this.unmatchedHusbands = count;
        this.unmatchedWives = count;
    }

    addProvisionalMarriage(wifeClan: Clan, count: number) {
        this.provisionalMarriages.set(
            wifeClan,
            (this.provisionalMarriages.get(wifeClan) ?? 0) + count
        );
    }
}

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
// The algorithm is a variant of Gale-Shapley. In each round, unmatched
// husbands propose to potential wives, who pick the best of the
// proposals or their current option.
export function marry(world: World): void {
    const decisions = getMarriageDecisions(world);
    world.lastMarriageDecisions = decisions;
    applyMarriageDecisions(world, decisions);
}

export function getMarriageDecisions(world: World): MarriageDecisions {
    const states = new Map<Clan, ClanMarriageState>();
    for (const clan of world.allClans) {
        states.set(clan, new ClanMarriageState(clan));
    }

    const maxRounds = 20;
    for (let round = 0; round < maxRounds; round++) {
        const proposingHusbandStates = [...states.values()].filter(
            s => s.unmatchedHusbands > 0
        );
        if (proposingHusbandStates.length === 0) break;

        const candidateWifeStates = [...states.values()].filter(
            s => s.unmatchedWives > 0
        );
        if (candidateWifeStates.length === 0) break;

        const proposalsToWives = new Map<Clan, ClanMarriageState[]>();
        let totalProposalsMade = 0;

        for (const hState of proposingHusbandStates) {
            const validWifeCandidates = candidateWifeStates.filter(
                w => w.clan !== hState.clan
            );
            if (validWifeCandidates.length === 0) continue;

            const sortedWives = sortedByKey(
                validWifeCandidates,
                w => -getMarriageAppeal(world, hState.clan, w.clan)
            );

            const top3Wives = sortedWives.slice(0, 3);
            for (const wState of top3Wives) {
                let proposals = proposalsToWives.get(wState.clan);
                if (!proposals) {
                    proposals = [];
                    proposalsToWives.set(wState.clan, proposals);
                }
                proposals.push(hState);
                totalProposalsMade++;
            }
        }

        if (totalProposalsMade === 0) break;

        let matchesMadeThisRound = 0;

        for (const [wifeClan, proposingHStates] of proposalsToWives.entries()) {
            const wState = states.get(wifeClan)!;
            if (wState.unmatchedWives <= 0) continue;

            const sortedHProposals = sortedByKey(
                proposingHStates,
                h => -getMarriageAppeal(world, wifeClan, h.clan)
            );

            for (const hState of sortedHProposals) {
                if (wState.unmatchedWives <= 0) break;
                if (hState.unmatchedHusbands <= 0) continue;

                const count = Math.min(hState.unmatchedHusbands, wState.unmatchedWives);
                if (count > 0) {
                    hState.unmatchedHusbands -= count;
                    wState.unmatchedWives -= count;
                    hState.addProvisionalMarriage(wifeClan, count);
                    matchesMadeThisRound += count;
                }
            }
        }

        if (matchesMadeThisRound === 0) break;
    }

    const pairingCounts = new PairingCounts();
    const potentialWives: PotentialPartnerSet[] = [];

    for (const [clan, state] of states.entries()) {
        const initialCount = clan.slices[1][0];
        const wifeSet = new PotentialPartnerSet(clan, initialCount);

        for (const [husbandClan, hState] of states.entries()) {
            const count = hState.provisionalMarriages.get(clan) ?? 0;
            if (count > 0) {
                wifeSet.addMarriage(husbandClan, count);
                pairingCounts.add(husbandClan, clan, count);
            }
        }

        potentialWives.push(wifeSet);
    }

    return new MarriageDecisions(potentialWives, pairingCounts);
}

export function applyMarriageDecisions(world: World, decisions: MarriageDecisions): void {
    const { potentialWives, pairingCounts } = decisions;

    // Update clan marriage relationships:
    // - New marriages increase thickness by the fraction of the generation
    //   married to that clan.
    // - Existing marriage relationships decay. They should cease to have
    //   any effect within 3-6 generations if there are no new marriages.
    for (const [pairID, connections] of world.connections.entries()) {
        for (const connection of connections) {
            if (connection instanceof MarriageConnection) {
                connection.relatedness *= 0.5;
                if (connection.relatedness < 0.03) {
                    world.connections.remove(pairID, connection);
                }
            }
        }
    }
    for (const [c1, m] of pairingCounts.counts) {
        for (const [c2, count] of m) {
            const relatednessIncrement = count / c1.population;
            if (relatednessIncrement < 0.03) continue;
            const connection = world.connections.getOrCreate(c1, c2, MarriageConnection);
            connection.relatedness += relatednessIncrement;
            if (connection.relatedness > 1) {
                connection.relatedness = 1;
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

export class PotentialPartnerSet {
    marriedTo: Map<Clan, number> = new Map();
    taken = 0;

    constructor(readonly clan: Clan, readonly count: number) {
    }

    addMarriage(clan: Clan, count: number = 1) {
        this.marriedTo.set(clan, (this.marriedTo.get(clan) ?? 0) + count);
        this.taken += count;
    }

    get available() { return this.count - this.taken; }
}

export class PairingCounts {
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