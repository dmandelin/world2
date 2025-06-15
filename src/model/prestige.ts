import { normal } from "./distributions";
import { pct, signed } from "./format";
import type { Clan } from "./people";

export class OwnPrestigeCalc {
    readonly items: [string, number][];

    constructor(readonly clan: Clan, readonly other: Clan) {
        this.items = [];
        if (clan === other) {
            this.items.push(['Self', 55]);
        } else if (clan.settlement!.size > 300) {
            this.items.push(['Strangers!', 35]);
            return;
        } else {
            this.items.push(['Neighbors', 50]);
        }

        this.items.push(this.seniorityItem);
        const otherRitualWeight = clan.settlement!.clans.rites.weights.get(other) ?? 0.1;
        const otherItems: [string, number][] = [
            [`Size ${other.size}`, Math.log2(other.size / 50) * 5],
            [`Strength ${other.strength}`, (other.strength - 50) / 10],
            [`Intelligence ${other.intelligence}`, (other.intelligence - 50) / 10],
            [`Horticulture ${other.skill.toFixed()}`, (other.skill - 50) / 10],
            [`Ritual ${other.ritualSkill.toFixed()} (${pct(otherRitualWeight)})`, 
                otherRitualWeight * (other.ritualSkill - 50)],
            [`Random`, normal(0, 2)],
        ];
        this.items.push(...otherItems);
    }

    private get seniorityItem(): [string, number] {
        const diff = this.clan.seniority - this.other.seniority;
        return [`Seniority ${signed(diff)}`, diff * 5];
    }

    get value(): number {
        return this.items.reduce((acc, [_, v]) => acc + v, 0);
    }

    get tooltip(): string[][] {
        return this.items.map(([k, v]) => [k, v.toFixed(1)]);
    }
}

export class PrestigeCalc {
    readonly prestigeOfInheritance = 50;
    readonly prestigeOfInference = 50;

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
        const weight = Math.pow(1.02, sourcePrestige - 50);
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
