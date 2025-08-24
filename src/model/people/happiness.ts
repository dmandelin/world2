import { sumFun } from "../lib/basics";
import { createTwoSidedQuadratic } from "../lib/modelbasics";
import { TradeGoods } from "../trade";
import type { Clan } from "./people";

// Food variety
// - "Fish" represents a balanced hunter-gather diet and has base appeal.
// - Adding some cereals typically has higher appeal:
//   - Ritual emphasis, including direct usage
//   - Beer
//   - Storable food
// - A high percentage of cereals only in the diet has lower appeal and health.

const foodVarietyAppealFun = createTwoSidedQuadratic(0, -10, 0.7, 5, 1, 0);

function fishRatio(clan: Clan): number {
    const cereals = clan.consumption.perCapita(TradeGoods.Cereals);
    const fish = clan.consumption.perCapita(TradeGoods.Fish);
    return fish / (cereals + fish);
}

export function foodVarietyAppeal(clan: Clan): number {
    return foodVarietyAppealFun(fishRatio(clan));
}

export function foodVarietyHealthFactor(clan: Clan): number {
    const p = 1 - fishRatio(clan);
    return 1 - 0.25 * p * p;
}

export class Expectations {
    readonly map_ = new Map<string, number>();
    readonly alpha = 0.5;

    constructor() {
        this.map_.set('Food Quantity', 0);
        this.map_.set('Food Quality', 0);
        this.map_.set('Shelter', 1);
        this.map_.set('Flood', 0);
        this.map_.set('Rituals', 10);
    }

    get(label: string): number {
        return this.map_.get(label) ?? 0;
    }

    updateFrom(happiness: HappinessCalc): void {
        for (const [label, current] of this.map_.entries()) {
            const recent = happiness.getAppeal(label);
            if (recent !== undefined) {
                const updated = this.alpha * current + (1 - this.alpha) * recent;
                this.map_.set(label, updated);
            }
        }
    }
}

export class HappinessCalcItem {
    constructor(
        readonly label: string,
        readonly expectation: number,
        readonly appeal: number,
    ) {}

    get value(): number {
        return this.appeal - this.expectation;
    }
}

export class HappinessCalc {
    readonly items: HappinessCalcItem[] = [];
    readonly total: HappinessCalcItem;
    readonly rows: HappinessCalcItem[];

    readonly subsistenceItems: HappinessCalcItem[] = [];
    readonly subsistenceTotal: HappinessCalcItem;

    constructor(readonly clan: Clan, empty = false) {
        // TODO - positive network effects
        // TODO - disease load
        // TODO - trade goods

        if (!empty) {
            const foodAppeal = 50 * Math.log2(this.clan.consumption.perCapitaSubsistence());
            this.add('Food Quantity', foodAppeal, true);

            const foodQualityAppeal = foodVarietyAppeal(this.clan);
            this.add('Food Quality', foodQualityAppeal, true);

            const shelterAppeal = this.clan.housing.shelter;
            this.add('Shelter', shelterAppeal, true);

            const floodAppeal = -this.clan.settlement.floodLevel.damageFactor * 20;
            this.add('Flood', floodAppeal);

            // These define our relationship with powerful beings, so we are 
            // definitely happier if we've done well for them.
            const ritualAppeal = this.clan.settlement.clans.rites.appeal;
            this.add('Rituals', ritualAppeal);

            // In everyone-knows-everyone societies, status is determined by
            // our relationships.
            const statusAppeal = this.clan.averagePrestige;
            this.add('Status', statusAppeal);

            // "Village society": We like everyone to know everyone, so the fraction
            // not covered by our gossip network is a disamenity.
            const population = this.clan.settlement.population;
            const limit = 300;
            const societyAppeal = population <= limit ? 0 : -20 * (population - limit) / population;
            this.add('Society', societyAppeal);
        }

        this.subsistenceTotal = new HappinessCalcItem(
            'Total', 
            sumFun(this.subsistenceItems, item => item.expectation),
            sumFun(this.subsistenceItems, item => item.appeal),
        );

        this.total = new HappinessCalcItem(
            'Total', 
            sumFun(this.items, item => item.expectation),
            sumFun(this.items, item => item.appeal),
        );

        this.rows = [...this.items, this.total];
    }

    private add(label: string, appeal: number, isSubsistence = false): void {
        const item = new HappinessCalcItem(label, this.clan.expectations.get(label), appeal);
        this.items.push(item);
        if (isSubsistence) {
            this.subsistenceItems.push(item);
        }
    }

    get(label: string): HappinessCalcItem | undefined {
        return this.items.find(item => item.label === label);
    }

    getAppeal(label: string): number|undefined {
        return this.get(label)?.appeal;
    }
}