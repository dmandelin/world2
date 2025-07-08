import { normal } from "../lib/distributions";
import { pct, signed, spct } from "../lib/format";
import type { Clan } from "./people";
import type { Rites } from "../rites";
import { averageFun } from "../lib/basics";
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
    readonly items: PrestigeCalcItem[];

    constructor(readonly clan: Clan, readonly other: Clan) {
        this.items = [];
        if (clan === other) {
            this.items.push(new DirectPrestigeCalcItem('Self', 5));
        } else if (clan.settlement!.population > 300) {
            this.items.push(new DirectPrestigeCalcItem('Strangers', -25));
            return;
        } else {
            this.items.push(new DirectPrestigeCalcItem('Neighbors', 0));
        }

        const averageSeniority = averageFun(clan.settlement!.clans, c => c.seniority);
        const averageHousing = averageFun(clan.settlement!.clans, c => c.housing.qol);
        const averageSize = averageFun(clan.settlement!.clans, c => c.population);
        const averageStrength = averageFun(clan.settlement!.clans, c => c.strength);
        const averageIntelligence = averageFun(clan.settlement!.clans, c => c.intelligence);
        const averageHorticulture = averageFun(clan.settlement!.clans, c => c.skill);
        const averageEffectiveRitualSkill = averageFun(clan.settlement!.clans, c => c.ritualEffectiveness);
        this.items.push(
            new DiffBasedPrestigeCalcItem('Seniority', 3, averageSeniority, clan.seniority),
            new DiffBasedPrestigeCalcItem('Housing', 1, averageHousing, other.housing.qol),
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
            new DirectPrestigeCalcItem('Random', normal(0, 2)),
        );
    }

    get value(): number {
        return this.items.reduce((acc, item) => acc + item.value, 0);
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
        const weight = rites.weights.get(other) ?? 0.1;
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
}
