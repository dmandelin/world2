import { normal } from "./distributions";
import { pct, signed, spct } from "./format";
import type { Clan } from "./people";
import type { Rites } from "./rites";

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
        } else if (clan.settlement!.size > 300) {
            this.items.push(new DirectPrestigeCalcItem('Strangers', -25));
            return;
        } else {
            this.items.push(new DirectPrestigeCalcItem('Neighbors', 0));
        }

        const averageSize = other.settlement!.clans.reduce((acc, c) => acc + c.size, 0) / other.settlement!.clans.length;
        const averageStrength = other.settlement!.clans.reduce((acc, c) => acc + c.strength, 0) / other.settlement!.clans.length;
        const averageIntelligence = other.settlement!.clans.reduce((acc, c) => acc + c.intelligence, 0) / other.settlement!.clans.length;
        const averageHorticulture = other.settlement!.clans.reduce((acc, c) => acc + c.skill, 0) / other.settlement!.clans.length;
        const averageEffectiveRitualSkill = other.settlement!.clans.reduce((acc, c) => acc + c.ritualEffectivenessCalc.effectiveSkill, 0) / other.settlement!.clans.length;
        this.items.push(
            new DiffBasedPrestigeCalcItem('Seniority', 5, clan.seniority, other.seniority),
            new RatioBasedPrestigeCalcItem('Size', 5, averageSize, other.size),
            new DiffBasedPrestigeCalcItem('Strength', 0.1, averageStrength, other.strength),
            new DiffBasedPrestigeCalcItem('Intelligence', 0.1, averageIntelligence, other.intelligence),
            new DiffBasedPrestigeCalcItem('Horticulture', 0.1, averageHorticulture, other.skill),
            new DiffBasedPrestigeCalcItem(
                'Ritual',
                0.5, 
                averageEffectiveRitualSkill,
                other.ritualEffectivenessCalc.effectiveSkill),
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
               (other.ritualEffectivenessCalc.effectiveSkill 
               - baselineEffectiveSkill) / 2;
        return {weight, value};
    }
}

export class PrestigeCalc {
    readonly prestigeOfInheritance = 0;
    readonly prestigeOfInference = 0;

    private inferredPrestige_: OwnPrestigeCalc;
    private previousPrestige_: number|undefined;

    private items_: [string, number, number, number, number][];
    private bufferedItems_: [string, number, number, number, number][] = [];

    constructor(readonly clan: Clan, readonly other: Clan) {
        this.inferredPrestige_ = new OwnPrestigeCalc(clan, other);
        this.items_ = [PrestigeCalc.createItem(
            'Inferred', this.inferredPrestige_.value, this.prestigeOfInference)];
    }

    private buffer(name: string, value: number, sourcePrestige: number) {
        this.bufferedItems_.push(PrestigeCalc.createItem(name, value, sourcePrestige));
    }

    private static createItem(name: string, value: number, sourcePrestige: number): [string, number, number, number, number] {
        const weight = Math.pow(1.02, sourcePrestige);
        return [name, value, sourcePrestige, weight, value * weight];
    }

    startUpdate() {
        this.previousPrestige_ = this.value;
        this.inferredPrestige_ = new OwnPrestigeCalc(this.clan, this.other);

        this.bufferedItems_ = [];
        if (this.previousPrestige_ !== undefined) {
            this.buffer('Inherited', this.previousPrestige_, this.prestigeOfInheritance);
        }
        this.buffer('Inferred', this.inferredPrestige_.value, this.prestigeOfInference);

        if (this.clan.settlement!.size < 300) {
            for (const model of this.clan.prestigeViews.keys()) {
                if (model === this.other || model === this.clan) continue;
                this.buffer(model.name, model.prestigeViewOf(this.other)!.value, this.clan.prestigeViewOf(model)!.value);
            }
        }
    }

    commitUpdate() {
        // Normalize weights.
        const totalWeight = this.bufferedItems_.reduce((acc, [_, __, ___, w]) => acc + w, 0);
        for (const [i, [_, __, ___, w]] of this.bufferedItems_.entries()) {
            this.bufferedItems_[i][3] = w / totalWeight;
            this.bufferedItems_[i][4] = this.bufferedItems_[i][1] * this.bufferedItems_[i][3];
        }

        this.items_ = this.bufferedItems_;
        this.bufferedItems_ = [];
    }

    get value(): number {
        return this.items_.reduce((acc, [_, __, ___, ____, v]) => acc + v, 0);
    }

    get tooltip(): string[][] {
        const data = this.items_.map(([s, t, u, v, w]) => 
            [s, t.toFixed(0), u.toFixed(0), v.toFixed(2), w.toFixed(1)]);
        return [['Source', 'P', 'SP', 'w', 'wP'], ...data];
    }

    get inferenceTooltip(): string[][] {
        return this.inferredPrestige_.tooltip;
    }
}
