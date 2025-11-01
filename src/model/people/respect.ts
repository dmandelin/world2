import { randInt, sumValues } from "../lib/basics";
import type { Clan } from "./people";

export class RespectCalc {
    informationLevel: number = 0;
    readonly items: Record<string, RespectCalcItem> = {};

    // clan is the clan being respected or not.
    constructor(readonly respector: Clan, readonly clan: Clan) {
    }

    get value(): number {
        return sumValues(this.items, item => item.value);
    }

    update(interactionFactor: number): void {
        const previousValue = this.value;

        this.informationLevel = informationLevel(this.respector, this.clan, interactionFactor);

        this.add('Memory', previousValue / 2);
        this.add('Events', randInt(10 * interactionFactor) - randInt(10 * interactionFactor));
        if (this.clan.consumption.perCapitaSubsistence() > 0) {
            this.add('Prosperity', 
                Math.sqrt(this.informationLevel) * 20 * Math.log2(this.clan.consumption.perCapitaSubsistence()));
        }
    }

    private add(name: string, value: number): RespectCalcItem {
        const item = new RespectCalcItem(name, value);
        this.items[name] = item;
        return item;
    }
}

export class RespectCalcItem {
    constructor(
        readonly name: string,
        readonly value: number) {}
}

function informationLevel(respector: Clan, clan: Clan, interactionFactor: number): number {
    return Math.max(
        Math.sqrt(interactionFactor) * informationFromProximity(respector, clan),
        informationFromRelationships(clan, respector),
    );
}

function informationFromProximity(respector: Clan, clan: Clan): number {
    if (respector === clan) {
        return 1;
    } else if (respector.settlement === clan.settlement) {
        return Math.min(1, 2 / (1 + clan.settlement.population / 150));
    } else if (respector.settlement.cluster === clan.settlement.cluster) {
        return Math.min(1, 1 / (1 + clan.settlement.population / 150));
    }
    return 0;
}

function informationFromRelationships(respector: Clan, clan: Clan): number {
    let base;
    if (respector === clan) {
        base = 1;
    } else {
        base = (respector.marriagePartners.get(clan) ?? 0);
    }
    
    let proximityFactor;
    if (respector.settlement === clan.settlement) {
        proximityFactor = 1;
    } else if (respector.settlement.cluster === clan.settlement.cluster) {
        proximityFactor = 0.5;
    } else {
        proximityFactor = 0.1;
    }

    return base * proximityFactor;
}