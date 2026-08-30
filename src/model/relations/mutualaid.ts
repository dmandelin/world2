import { GenericItem, type UUID } from "../records/basicdata";
import type { Clan } from "../people/people";
import type { ClanDTO, WorldDTO } from "../records/dtos";
import type { World } from "../world";
import { Interaction } from "./interaction";
import { Trust } from "./trust";
import { unsigned } from "../lib/format";

const mutualAidText = (d: { value: number }) =>
    `Mutual aid value: ${unsigned(d.value, 2)}`;

export class MutualAidInteraction extends Interaction {
    readonly trustModel: Trust = new Trust();
    amount: number = 0;
    distance: number = 0; // in miles

    constructor(c1: UUID, c2: UUID) {
        super(c1, c2);
    }

    get trust(): number {
        return this.trustModel.value;
    }

    get icebergCost(): number {
        // TODO - This should probably be superlinear.
        return 0.045 * this.distance;
    }

    information(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
        return 0;
    }

    alignmentItem(subject: Clan | ClanDTO, object: Clan | ClanDTO): GenericItem {
        return new GenericItem(
            'Mutual Aid',
            0.05 * (1 - this.icebergCost) * this.trust * this.amount,
            mutualAidText,
            { value: (1 - this.icebergCost) * this.trust * this.amount },
        );
    }
}

export function clanHelpDemand(population: number): number {
    if (population <= 0) return 0;
    return population * Math.sqrt(10 / population);
}

export function updateMutualAidInteractions(world: World): void {
    // 1. Ensure MutualAidInteraction exists between connected pairs of clans
    for (const [u1, u2, connections] of world.connections.pairs()) {
        if (connections.length > 0) {
            const [c1, c2] = world.clansFrom(u1, u2);
            const interaction = world.interactions.getOrCreate(c1, c2, MutualAidInteraction);
            if (c1.settlement && c2.settlement) {
                interaction.distance = c1.settlement.milesTo(c2.settlement);
            } else {
                interaction.distance = 0;
            }
            interaction.trustModel.update(c1, c2);
        }
    }

    // Get all clans with population > 0 in the world
    const clans = world.allClans.filter(c => c.population > 0);

    // Initialize/Reset matching amounts of all MutualAidInteractions to 0
    const mutualAidInteractions: MutualAidInteraction[] = [];
    for (const c1 of clans) {
        for (const [otherRef, interactions] of world.interactions.getFor(c1)) {
            const other = world.allClans.find(c => c.uuid === otherRef);
            if (!other || c1.uuid >= other.uuid) continue; // Process each unique pair once
            for (const interaction of interactions) {
                if (interaction instanceof MutualAidInteraction) {
                    interaction.amount = 0;
                    mutualAidInteractions.push(interaction);
                }
            }
        }
    }

    // 2. Distributed ask/answer algorithm for help matching
    // Run for 20 rounds for better convergence
    for (let round = 0; round < 20; round++) {
        // Calculate remaining demand for each clan
        const remainingDemands = new Map<string, number>();
        for (const clan of clans) {
            const totalHelpReceived = getHelpReceivedFromMutualAid(world, clan);
            const demand = clanHelpDemand(clan.population);
            const remaining = Math.max(0, demand - totalHelpReceived);
            remainingDemands.set(clan.uuid, remaining);
        }

        // Count connected active neighbors and sum their trust values for each clan
        const connectedNeighborCounts = new Map<string, number>();
        const connectedNeighborTrustSums = new Map<string, number>();
        for (const clan of clans) {
            let count = 0;
            let trustSum = 0;
            for (const [otherRef, interactions] of world.interactions.getFor(clan)) {
                const ma = interactions.find(i => i instanceof MutualAidInteraction) as MutualAidInteraction | undefined;
                if (ma && ma.icebergCost < 1.0) {
                    const otherRemaining = remainingDemands.get(otherRef) ?? 0;
                    if (otherRemaining > 0.001) {
                        count++;
                        trustSum += Math.max(0, ma.trust);
                    }
                }
            }
            connectedNeighborCounts.set(clan.uuid, count);
            connectedNeighborTrustSums.set(clan.uuid, trustSum);
        }

        // Calculate proposals and apply increments
        let totalDelta = 0;
        for (const interaction of mutualAidInteractions) {
            const c1UUID = interaction.c1;
            const c2UUID = interaction.c2;

            const netFactor = 1 - interaction.icebergCost;
            const t = Math.max(0, interaction.trust);

            const r1 = remainingDemands.get(c1UUID) ?? 0;
            const count1 = connectedNeighborCounts.get(c1UUID) ?? 0;
            const trustSum1 = connectedNeighborTrustSums.get(c1UUID) ?? 0;
            let proposal1 = 0;
            if (count1 > 0 && r1 > 0 && netFactor > 0) {
                if (trustSum1 > 0) {
                    proposal1 = (r1 * (t / trustSum1)) / netFactor;
                } else {
                    proposal1 = (r1 / count1) / netFactor;
                }
            }

            const r2 = remainingDemands.get(c2UUID) ?? 0;
            const count2 = connectedNeighborCounts.get(c2UUID) ?? 0;
            const trustSum2 = connectedNeighborTrustSums.get(c2UUID) ?? 0;
            let proposal2 = 0;
            if (count2 > 0 && r2 > 0 && netFactor > 0) {
                if (trustSum2 > 0) {
                    proposal2 = (r2 * (t / trustSum2)) / netFactor;
                } else {
                    proposal2 = (r2 / count2) / netFactor;
                }
            }

            const delta = Math.min(proposal1, proposal2);
            if (delta > 0.001) {
                interaction.amount += delta;
                totalDelta += delta;
            }
        }

        // If no meaningful matching occurred in this round, we can break early
        if (totalDelta < 0.001) {
            break;
        }
    }
}

// Helper to calculate help total for a clan
function getHelpReceivedFromMutualAid(world: World | WorldDTO, clan: Clan | ClanDTO): number {
    let total = 0;
    for (const [otherRef, interactions] of world.interactions.getFor(clan)) {
        for (const interaction of interactions) {
            if (interaction instanceof MutualAidInteraction) {
                total += interaction.amount * (1 - interaction.icebergCost);
            }
        }
    }
    return total;
}

export function getHelpReceivedValueFromMutualAid(world: World | WorldDTO, clan: Clan | ClanDTO): number {
    let total = 0;
    for (const [otherRef, interactions] of world.interactions.getFor(clan)) {
        for (const interaction of interactions) {
            if (interaction instanceof MutualAidInteraction) {
                total += interaction.amount * (1 - interaction.icebergCost) * interaction.trust;
            }
        }
    }
    return total;
}

export function getHelpProductivityModifier(help: number, demand: number): number {
    if (demand <= 0) return 1.0;
    const r = help / demand;
    // f(r) = 0.6 + 0.7 * (1 - e^(-0.8473 * r))
    return 0.6 + 0.7 * (1 - Math.exp(-0.8473 * r));
}
