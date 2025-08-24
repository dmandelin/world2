import { sumFun } from "../lib/basics";
import type { Clan } from "./people";

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
        // TODO - variable expectations
        // TODO - positive network effects
        // TODO - disease load

        if (!empty) {
            const subsistenceAppeal = 50 * Math.log2(this.clan.consumption.perCapitaSubsistence());
            this.subsistenceItems.push(new HappinessCalcItem('Subsistence', 0, subsistenceAppeal));
            this.items.push(new HappinessCalcItem('Subsistence', 0, subsistenceAppeal));

            const shelterAppeal = this.clan.housing.shelter;
            this.subsistenceItems.push(new HappinessCalcItem('Shelter', 1, shelterAppeal));
            this.items.push(new HappinessCalcItem('Shelter', 1, shelterAppeal));

            const floodAppeal = -this.clan.settlement.floodLevel.damageFactor * 20;
            this.items.push(new HappinessCalcItem('Flooding', 0, floodAppeal));

            // These define our relationship with powerful beings, so we are 
            // definitely happier if we've done well for them.
            const ritualAppeal = this.clan.settlement.clans.rites.appeal;
            this.items.push(new HappinessCalcItem('Rituals', 0, ritualAppeal));

            // In everyone-knows-everyone societies, status is determined by
            // our relationships.
            const statusAppeal = this.clan.averagePrestige;
            this.items.push(new HappinessCalcItem('Status', 0, statusAppeal));

            // "Village society": We like everyone to know everyone, so the fraction
            // not covered by our gossip network is a disamenity.
            const population = this.clan.settlement.population;
            const limit = 300;
            const societyAppeal = population <= limit ? 0 : -20 * (population - limit) / population;
            this.items.push(new HappinessCalcItem('Anonymity', 0, societyAppeal));
        }

        this.subsistenceTotal = new HappinessCalcItem(
            'Total', 
            sumFun(this.subsistenceItems, item => item.expectation),
            sumFun(this.subsistenceItems, item => item.value),
        );

        this.total = new HappinessCalcItem(
            'Total', 
            sumFun(this.items, item => item.expectation),
            sumFun(this.items, item => item.value),
        );

        this.rows = [...this.items, this.total];
    }
}