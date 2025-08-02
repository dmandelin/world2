import { normal } from "../lib/distributions";
import { pct, signed, spct } from "../lib/format";
import type { Clan } from "./people";
import type { Rites } from "../rites";
import { averageFun, sumFun } from "../lib/basics";
import { AttitudeCalc } from "./attitude";

interface PrestigeCalcItem {
    name: string;
    value: number;

    baselineValue?: number;
    theirValue?: number;
    relativeValue?: number;
}

class DirectPrestigeCalcItem implements PrestigeCalcItem {
    constructor(
        readonly name: string,
        readonly label: string,
        readonly value: number) {}
}

class DiffBasedPrestigeCalcItem implements PrestigeCalcItem {
    readonly name: string;
    readonly relativeValue: number;
    readonly value: number;

    constructor(
        name: string,
        readonly multiplier: number,
        readonly baselineValue: number,
        readonly theirValue: number,
        readonly weight: number = 1) {

        this.name = this.weight != 1 ? `${name} (${pct(weight)})` : name;
        this.relativeValue = (theirValue - baselineValue);
        this.value = this.relativeValue * multiplier * weight;
    }
}

class RatioBasedPrestigeCalcItem implements PrestigeCalcItem {
    readonly relativeValue: number;
    readonly value: number;

    constructor(
        readonly name: string,
        readonly multiplier: number,
        readonly baselineValue: number,
        readonly theirValue: number) {

        this.relativeValue = theirValue / baselineValue;
        this.value = Math.log2(this.relativeValue) * multiplier;
    }
}

export class OwnPrestigeCalc {
    readonly itemMap: Map<string, PrestigeCalcItem> = new Map<string, PrestigeCalcItem>();

    constructor(readonly clan: Clan, readonly other: Clan) {
        let relItem;
        if (clan === other) {
            relItem = new DirectPrestigeCalcItem('Relationship', 'Self', 5);
        } else if (clan.settlement!.population > 300) {
            relItem = new DirectPrestigeCalcItem('Relationship', 'Strangers', -25);
        } else {
            relItem = new DirectPrestigeCalcItem('Relationship', 'Neighbors', 0);
        }
        this.itemMap.set('Relationship', relItem);

        const averageSeniority = averageFun(clan.settlement!.clans, c => c.seniority);
        const averageHousing = averageFun(clan.settlement!.clans, c => c.housing.basePrestige);
        const averageSize = averageFun(clan.settlement!.clans, c => c.population);
        const averageStrength = averageFun(clan.settlement!.clans, c => c.strength);
        const averageIntelligence = averageFun(clan.settlement!.clans, c => c.intelligence);
        const averageHorticulture = averageFun(clan.settlement!.clans, c => c.skill);
        const averageEffectiveRitualSkill = averageFun(clan.settlement!.clans, c => c.ritualEffectiveness);
        for (const item of [
            new DiffBasedPrestigeCalcItem('Seniority', 3, averageSeniority, clan.seniority),
            new DiffBasedPrestigeCalcItem('Housing', 1, averageHousing, 
                // A clan's own housing has an extra effect of increasing internal solidarity
                // since people will spend more time within the clan.
                other === clan ? 2 * clan.housing.basePrestige : other.housing.basePrestige),
            new RatioBasedPrestigeCalcItem('Size', 5, averageSize, other.population),
            new DiffBasedPrestigeCalcItem('Strength', 0.1, averageStrength, other.strength),
            new DiffBasedPrestigeCalcItem('Intelligence', 0.1, averageIntelligence, other.intelligence),
            // TODO - Make this based on the data structures.
            new DiffBasedPrestigeCalcItem('Agriculture', 0.1, averageHorticulture, other.skill),
            new DiffBasedPrestigeCalcItem(
                'Ritual',
                0.5, 
                averageEffectiveRitualSkill,
                other.ritualEffectiveness),
            new DirectPrestigeCalcItem('Random', '', normal(0, 2)),
        ]) {
            this.itemMap.set(item.name, item);
        }
    }

    get items(): PrestigeCalcItem[] {
        return [...this.itemMap.values()];
    }

    get value(): number {
        return sumFun(this.items, item => item.value);
    }

    get tooltip(): string[][] {
        const header = ['Item', 'Base', 'Them', 'Rel', 'Value'];
        const rows = this.items.map(item => [
            item.name, 
            item.baselineValue?.toFixed(1) ?? '',
            item.theirValue?.toFixed(1) ?? '',
            item.relativeValue?.toFixed(1) ?? '',
            signed(item.value, 1),
        ]);
        return [header, ...rows];
    }

    static prestigeFromRitual(baselineEffectiveSkill: number, other: Clan, rites: Rites): {weight: number, value: number} {
        const weight = 0.1; //rites.weights.get(other) ?? 0.1;
        const value = weight *  
               (other.ritualEffectiveness, 
               - baselineEffectiveSkill) / 2;
        return {weight, value};
    }
}

export class PrestigeCalc extends AttitudeCalc<OwnPrestigeCalc> {
    createInferenceCalc(): OwnPrestigeCalc {
        return new OwnPrestigeCalc(this.clan, this.other);
    }

    modelViewOf(model: Clan, other: Clan): PrestigeCalc {
        return model.prestigeViewOf(other)!;
    }
}
