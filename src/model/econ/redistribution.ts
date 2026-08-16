import type { Clan } from "../people/people";
import { TradeGoods } from "../trade";
import { getAlignment } from "../relations/alignment";
import { sumFun } from "../lib/basics";
import { connectedClans } from "../relations/connection";
import { getRelativeAttention } from "../relations/basicinteraction";
import { recordFoodAid } from "../relations/information";

export const AID_ALIGNMENT_THRESHOLD = -0.5;
export const AID_FOOD_THRESHOLD = 0.8;
export const AID_BUDGET_FOOD_THRESHOLD = 0.8;

export interface FoodAidBidRecord {
    requesterUuid: string;
    requesterName: string;
    donorUuid: string;
    donorName: string;
    alignment: number;
    mutualRelativeAttention: number;
    weight: number;
    normalizedShare: number;
    unconstrainedRequestedAbs: number;
    eligibleAidBudgetAbs: number;
    requestedAbs: number;
    receivedAbs: number;
    requestedPerCapita: number; // In per capita of receiving clan
    receivedPerCapita: number;  // In per capita of receiving clan
}

export interface ClanRedistributionSummary {
    clanUuid: string;
    clanName: string;
    population: number;
    initialFood: number;
    initialFoodPerCapita: number;
    initialStock: number;
    initialStockPerCapita: number;
    totalRequestedAbs: number;
    totalReceivedAbs: number;
    totalGivenAbs: number;
    totalRequestedFromAbs: number;
    totalRequestedPerCapita: number;     // In per capita of receiving clan
    totalReceivedPerCapita: number;      // In per capita of receiving clan
    totalGivenPerCapita: number;         // In per capita of giving clan
    totalRequestedFromPerCapita: number; // In per capita of giving clan
    aidBudget: number;
    aidBudgetPerCapita: number;
    surplusProd: number;
    halfStock: number;
    prodCereals: number;
    prodCerealsPerCapita: number;
    prodCerealsUsed: number;
    prodCerealsUsedPerCapita: number;
    availSurplusProd: number;
    availSurplusProdPerCapita: number;
}

export class FoodRedistributionResult {
    readonly bids: FoodAidBidRecord[] = [];
    readonly clanSummaries = new Map<string, ClanRedistributionSummary>();

    addBid(bid: FoodAidBidRecord): void {
        this.bids.push(bid);
    }

    setClanSummary(summary: ClanRedistributionSummary): void {
        this.clanSummaries.set(summary.clanUuid, summary);
    }

    getBid(requesterUuid: string, donorUuid: string): FoodAidBidRecord | undefined {
        return this.bids.find(
            (b) => b.requesterUuid === requesterUuid && b.donorUuid === donorUuid
        );
    }

    getClanSummary(clanUuid: string): ClanRedistributionSummary | undefined {
        return this.clanSummaries.get(clanUuid);
    }
}

export function redistributeFood(allClans: Clan[]): FoodRedistributionResult {
    const result = new FoodRedistributionResult();

    // Step 1: Initial state & compute aid budgets for all clans
    const initialFoodMap = new Map<string, { food: number; perCapita: number; stock: number; stockPerCapita: number }>();
    const donorBudgets = new Map<string, { prodCereals: number; prodCerealsUsed: number; surplusProd: number; halfStock: number; budget: number }>();

    for (const clan of allClans) {
        const pop = clan.population || 1;
        const food = clan.consumption.totalFood;
        const perCapita = food / pop;
        const stock = clan.stock.getAmount(TradeGoods.Cereals);
        const stockPerCapita = stock / pop;
        initialFoodMap.set(clan.uuid, { food, perCapita, stock, stockPerCapita });

        const prodCereals = clan.production.forGood(TradeGoods.Cereals);
        const prodCerealsUsed = prodCereals - clan.distribution.undistributed(TradeGoods.Cereals);
        const availSurplusProd = clan.distribution.undistributed(TradeGoods.Cereals);

        const stockOutflowCereals = clan.stockOutflow.totalOutflow(TradeGoods.Cereals);
        const availStock = Math.max(0, stock - stockOutflowCereals);
        const halfStock = availStock / 2;

        // A clan retains enough food for this threshold and can use any
        // remaining food for aid.
        const budget = Math.max(0, food - AID_BUDGET_FOOD_THRESHOLD * pop);
        donorBudgets.set(clan.uuid, { prodCereals, prodCerealsUsed, surplusProd: availSurplusProd, halfStock, budget });
    }

    // Step 2: Determine requesters and generate bids
    interface BidRequest {
        requester: Clan;
        donor: Clan;
        alignment: number;
        mutualRelativeAttention: number;
        weight: number;
        normalizedShare: number;
        unconstrainedRequestedAbs: number;
        eligibleAidBudgetAbs: number;
        requestedAbs: number;
        requestedPerCapita: number;
    }

    const bidsByDonor = new Map<string, BidRequest[]>();
    const totalRequestedByRequester = new Map<string, number>();

    for (const requester of allClans) {
        const init = initialFoodMap.get(requester.uuid)!;
        if (init.perCapita >= AID_FOOD_THRESHOLD) continue;

        const neededPerCapita = AID_FOOD_THRESHOLD - init.perCapita;
        const totalNeeded = neededPerCapita * (requester.population || 1);
        totalRequestedByRequester.set(requester.uuid, totalNeeded);

        // Find candidate donors with budget > 0 and alignment > AID_ALIGNMENT_THRESHOLD
        const candidateDonors: {
            donor: Clan;
            alignment: number;
            mutualRelativeAttention: number;
            weight: number;
        }[] = [];
        let sumWeight = 0;

        for (const donor of connectedClans(requester)) {
            if (donor.uuid === requester.uuid) continue;
            const donorBudget = donorBudgets.get(donor.uuid)?.budget ?? 0;
            if (donorBudget <= 0) continue;

            const alignment = getAlignment(donor, requester);
            const mutualRelativeAttention = getRelativeAttention(donor, requester);
            if (alignment > AID_ALIGNMENT_THRESHOLD && mutualRelativeAttention > 0) {
                const weight = (1 + alignment) * donorBudget;
                candidateDonors.push({ donor, alignment, weight, mutualRelativeAttention });
                sumWeight += weight;
            }
        }

        if (sumWeight > 0) {
            for (const cand of candidateDonors) {
                const frac = cand.weight / sumWeight;
                const unconstrainedRequestedAbs = totalNeeded * frac;
                const eligibleAidBudgetAbs =
                    donorBudgets.get(cand.donor.uuid)!.budget * cand.mutualRelativeAttention;
                const requestedAbs = Math.min(unconstrainedRequestedAbs, eligibleAidBudgetAbs);
                const reqPerCapita = requestedAbs / (requester.population || 1);
                const bid: BidRequest = {
                    requester,
                    donor: cand.donor,
                    alignment: cand.alignment,
                    mutualRelativeAttention: cand.mutualRelativeAttention,
                    weight: cand.weight,
                    normalizedShare: frac,
                    unconstrainedRequestedAbs,
                    eligibleAidBudgetAbs,
                    requestedAbs,
                    requestedPerCapita: reqPerCapita,
                };
                const list = bidsByDonor.get(cand.donor.uuid) ?? [];
                list.push(bid);
                bidsByDonor.set(cand.donor.uuid, list);
            }
        }
    }

    // Step 3: Allocate aid
    const allocatedAidMap = new Map<string, Map<string, { receivedAbs: number; receivedPerCapita: number }>>();
    const totalGivenByDonor = new Map<string, number>();

    for (const donor of allClans) {
        const donorBudgetInfo = donorBudgets.get(donor.uuid)!;
        const budget = donorBudgetInfo.budget;

        const requests = bidsByDonor.get(donor.uuid) ?? [];
        const totalRequested = sumFun(requests, r => r.requestedAbs);

        const donorAllocations = new Map<string, { receivedAbs: number; receivedPerCapita: number }>();
        allocatedAidMap.set(donor.uuid, donorAllocations);

        if (requests.length === 0) {
            totalGivenByDonor.set(donor.uuid, 0);
            continue;
        }

        if (totalRequested <= budget) {
            // Satisfy all requests fully
            for (const req of requests) {
                donorAllocations.set(req.requester.uuid, {
                    receivedAbs: req.requestedAbs,
                    receivedPerCapita: req.requestedPerCapita,
                });
            }
            totalGivenByDonor.set(donor.uuid, totalRequested);
        } else {
            // Minimize "maximum request amount unfulfilled":
            const reqAmounts = requests.map(r => r.requestedAbs).sort((a, b) => a - b);
            let u = 0;
            let sumHigher = totalRequested;
            let countHigher = requests.length;

            for (let i = 0; i < reqAmounts.length; i++) {
                const current = reqAmounts[i];
                const remainingIfCap = sumHigher - countHigher * current;
                if (remainingIfCap <= budget) {
                    u = (sumHigher - budget) / countHigher;
                    break;
                }
                sumHigher -= current;
                countHigher -= 1;
            }
            if (countHigher === 0) {
                u = 0;
            }

            let totalGiven = 0;
            for (const req of requests) {
                const receivedAbs = Math.max(0, req.requestedAbs - u);
                const receivedPerCapita = receivedAbs / (req.requester.population || 1);
                donorAllocations.set(req.requester.uuid, { receivedAbs, receivedPerCapita });
                totalGiven += receivedAbs;
            }
            totalGivenByDonor.set(donor.uuid, totalGiven);
        }
    }

    // Step 4: Execute transfers & record bid records
    const totalReceivedByRequester = new Map<string, number>();

    for (const donor of allClans) {
        const requests = bidsByDonor.get(donor.uuid) ?? [];
        const donorAllocations = allocatedAidMap.get(donor.uuid)!;
        const donorBudgetInfo = donorBudgets.get(donor.uuid)!;
        let currentSurplusProd = donorBudgetInfo.surplusProd;

        for (const req of requests) {
            const alloc = donorAllocations.get(req.requester.uuid) ?? { receivedAbs: 0, receivedPerCapita: 0 };
            const amount = alloc.receivedAbs;

            if (amount > 0) {
                const prodDonation = Math.min(currentSurplusProd, amount);
                if (prodDonation > 0) {
                    donor.distribution.addDonation(req.requester, TradeGoods.Cereals, prodDonation);
                    currentSurplusProd -= prodDonation;
                }

                const stockDonation = amount - prodDonation;
                if (stockDonation > 0) {
                    const retrievalCost = stockDonation * 0.20;
                    donor.stockOutflow.addDonation(req.requester, TradeGoods.Cereals, stockDonation, retrievalCost);
                }

                req.requester.consumption.addDonation(donor, TradeGoods.Cereals, amount, 0);
                recordFoodAid(donor, req.requester, amount);

                const prevRec = totalReceivedByRequester.get(req.requester.uuid) ?? 0;
                totalReceivedByRequester.set(req.requester.uuid, prevRec + amount);
            }

            result.addBid({
                requesterUuid: req.requester.uuid,
                requesterName: req.requester.name,
                donorUuid: donor.uuid,
                donorName: donor.name,
                alignment: req.alignment,
                mutualRelativeAttention: req.mutualRelativeAttention,
                weight: req.weight,
                normalizedShare: req.normalizedShare,
                unconstrainedRequestedAbs: req.unconstrainedRequestedAbs,
                eligibleAidBudgetAbs: req.eligibleAidBudgetAbs,
                requestedAbs: req.requestedAbs,
                receivedAbs: alloc.receivedAbs,
                requestedPerCapita: req.requestedPerCapita,
                receivedPerCapita: alloc.receivedPerCapita,
            });
        }
    }

    // Step 5: Save clan summaries
    for (const clan of allClans) {
        const init = initialFoodMap.get(clan.uuid)!;
        const pop = clan.population || 1;
        const bInfo = donorBudgets.get(clan.uuid)!;

        const totalRequestedAbs = totalRequestedByRequester.get(clan.uuid) ?? 0;
        const totalReceivedAbs = totalReceivedByRequester.get(clan.uuid) ?? 0;
        const totalGivenAbs = totalGivenByDonor.get(clan.uuid) ?? 0;

        const requestsForDonor = bidsByDonor.get(clan.uuid) ?? [];
        const totalRequestedFromAbs = sumFun(requestsForDonor, r => r.requestedAbs);

        result.setClanSummary({
            clanUuid: clan.uuid,
            clanName: clan.name,
            population: pop,
            initialFood: init.food,
            initialFoodPerCapita: init.perCapita,
            initialStock: init.stock,
            initialStockPerCapita: init.stockPerCapita,
            totalRequestedAbs,
            totalReceivedAbs,
            totalGivenAbs,
            totalRequestedFromAbs,
            totalRequestedPerCapita: totalRequestedAbs / pop,
            totalReceivedPerCapita: totalReceivedAbs / pop,
            totalGivenPerCapita: totalGivenAbs / pop,
            totalRequestedFromPerCapita: totalRequestedFromAbs / pop,
            aidBudget: bInfo.budget,
            aidBudgetPerCapita: bInfo.budget / pop,
            surplusProd: bInfo.surplusProd,
            halfStock: bInfo.halfStock,
            prodCereals: bInfo.prodCereals,
            prodCerealsPerCapita: bInfo.prodCereals / pop,
            prodCerealsUsed: bInfo.prodCerealsUsed,
            prodCerealsUsedPerCapita: bInfo.prodCerealsUsed / pop,
            availSurplusProd: bInfo.surplusProd,
            availSurplusProdPerCapita: bInfo.surplusProd / pop,
        });
    }

    return result;
}
