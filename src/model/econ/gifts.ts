import type { Clan } from "../people/people";
import { TradeGoods } from "../trade";
import { getPrestige } from "../relations/prestige";
import { connectedClans } from "../relations/connection";

export interface FoodGiftRecord {
    donorUuid: string;
    donorName: string;
    recipientUuid: string;
    recipientName: string;
    prestige: number;
    factor: number; // 0.2 (local), 0.05 (cluster), 0.01 (other)
    totalFoodProd: number;
    scaleFactor: number; // 1.0 if uncapped, < 1.0 if donor gifts were scaled down
    giftAbs: number;
    giftPerCapita: number; // per capita of recipient
    donorPerCapita: number; // per capita of donor
}

export interface ClanGiftSummary {
    clanUuid: string;
    clanName: string;
    population: number;
    totalGiftsGivenAbs: number;
    totalGiftsGivenPerCapita: number;
    totalGiftsReceivedAbs: number;
    totalGiftsReceivedPerCapita: number;
}

export class FoodGiftsResult {
    readonly records: FoodGiftRecord[] = [];
    readonly clanSummaries = new Map<string, ClanGiftSummary>();

    addRecord(rec: FoodGiftRecord): void {
        this.records.push(rec);
    }

    getGift(donorUuid: string, recipientUuid: string): FoodGiftRecord | undefined {
        return this.records.find(
            (r) => r.donorUuid === donorUuid && r.recipientUuid === recipientUuid,
        );
    }

    getClanSummary(clanUuid: string): ClanGiftSummary | undefined {
        return this.clanSummaries.get(clanUuid);
    }
}

interface RawGiftEntry {
    donor: Clan;
    recipient: Clan;
    prestige: number;
    factor: number;
    totalFoodProd: number;
    rawGiftAbs: number;
}

export function shareFoodGifts(allClans: Clan[]): FoodGiftsResult {
    const result = new FoodGiftsResult();

    // Pass 1: compute raw (uncapped) gifts per donor
    const rawGiftsByDonor = new Map<string, RawGiftEntry[]>();

    for (const donor of allClans) {
        if (donor.population <= 0) continue;
        const totalFoodProd = donor.production.totalFood();
        if (totalFoodProd <= 0) continue;

        for (const recipient of connectedClans(donor)) {
            if (recipient.uuid === donor.uuid || recipient.population <= 0) continue;
            const prestige = getPrestige(donor, recipient);
            if (prestige <= 0) continue;

            let factor = 0.01;
            if (
                donor.settlement &&
                recipient.settlement &&
                donor.settlement.uuid === recipient.settlement.uuid
            ) {
                factor = 0.2;
            } else if (
                donor.settlement?.cluster &&
                recipient.settlement?.cluster &&
                donor.settlement.cluster === recipient.settlement.cluster
            ) {
                factor = 0.05;
            }

            const rawGiftAbs = factor * prestige * totalFoodProd;
            if (rawGiftAbs <= 0) continue;

            let entries = rawGiftsByDonor.get(donor.uuid);
            if (!entries) {
                entries = [];
                rawGiftsByDonor.set(donor.uuid, entries);
            }
            entries.push({ donor, recipient, prestige, factor, totalFoodProd, rawGiftAbs });
        }
    }

    // Pass 2: cap total gifts per donor at 80% of cereal production, then apply
    const giftsGivenMap = new Map<string, number>();
    const giftsReceivedMap = new Map<string, number>();

    for (const [donorUuid, entries] of rawGiftsByDonor) {
        const donor = entries[0].donor;
        const cerealProd = donor.production.forGood(TradeGoods.Cereals);
        const cap = cerealProd * 0.8;
        const rawTotal = entries.reduce((sum, e) => sum + e.rawGiftAbs, 0);
        const scaleFactor = rawTotal > cap && cap > 0 ? cap / rawTotal : 1.0;

        for (const entry of entries) {
            const giftAbs = entry.rawGiftAbs * scaleFactor;

            donor.distribution.addGift(entry.recipient, TradeGoods.Cereals, giftAbs);
            entry.recipient.consumption.addGift(donor, TradeGoods.Cereals, giftAbs);

            const recPop = entry.recipient.population || 1;
            const donorPop = donor.population || 1;

            result.addRecord({
                donorUuid: donor.uuid,
                donorName: donor.name,
                recipientUuid: entry.recipient.uuid,
                recipientName: entry.recipient.name,
                prestige: entry.prestige,
                factor: entry.factor,
                totalFoodProd: entry.totalFoodProd,
                scaleFactor,
                giftAbs,
                giftPerCapita: giftAbs / recPop,
                donorPerCapita: giftAbs / donorPop,
            });

            giftsGivenMap.set(
                donorUuid,
                (giftsGivenMap.get(donorUuid) ?? 0) + giftAbs,
            );
            giftsReceivedMap.set(
                entry.recipient.uuid,
                (giftsReceivedMap.get(entry.recipient.uuid) ?? 0) + giftAbs,
            );
        }
    }

    for (const clan of allClans) {
        if (clan.population <= 0) continue;
        const pop = clan.population || 1;
        const givenAbs = giftsGivenMap.get(clan.uuid) ?? 0;
        const receivedAbs = giftsReceivedMap.get(clan.uuid) ?? 0;

        result.clanSummaries.set(clan.uuid, {
            clanUuid: clan.uuid,
            clanName: clan.name,
            population: pop,
            totalGiftsGivenAbs: givenAbs,
            totalGiftsGivenPerCapita: givenAbs / pop,
            totalGiftsReceivedAbs: receivedAbs,
            totalGiftsReceivedPerCapita: receivedAbs / pop,
        });
    }

    return result;
}
