import { normal } from "./distributions";
import { signed } from "./format";
import type { Clan } from "./people";

export class OwnPrestigeCalc {
    readonly items: [string, number][];

    constructor(readonly clan: Clan, readonly other: Clan) {
        if (clan.settlement!.size > 300) {
            this.items = [['Strangers!', 35]];
        } else {
            this.items = [
                ['Neighbors', 50],
                this.seniorityItem,
                [`Size ${other.size}`, Math.log2(other.size / 50) * 5],
                [`Strength ${other.strength}`, (other.strength - 50) / 10],
                [`Intelligence ${other.intelligence}`, (other.intelligence - 50) / 20],
                [`Skill ${other.skill.toFixed()}`, (other.skill - 50) / 10],
                [`Random`, normal(0, 2)],
            ];
        }
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
    readonly imitiationRatio: number = 0.33;
    readonly persistenceRatio: number = 0.33;

    inferredPrestige_: OwnPrestigeCalc;
    imitatedPrestige_: number|undefined;
    bufferedImitatedPrestige_: number|undefined;
    previousPrestige_: number|undefined;

    constructor(readonly clan: Clan, readonly other: Clan) {
        this.inferredPrestige_ = new OwnPrestigeCalc(clan, other);
    }

    startUpdate() {
        // Start the turn: set the previous value, clear things to be updated.
        this.previousPrestige_ = this.value;
        this.imitatedPrestige_ = undefined;
        this.bufferedImitatedPrestige_ = undefined;

        this.updateInferredPrestige();
    }

    private updateInferredPrestige() {
        this.inferredPrestige_ = new OwnPrestigeCalc(this.clan, this.other);
    }

    bufferImitatedPrestigeUpdate() {
        // Calculate the average prestige assigned by other clans
        // weighted by how much prestige we assign them.
        let totalWeight = 0;
        let total = 0;
        for (const model of this.clan.prestigeViews.keys()) {
            if (model === this.other || model === this.clan) continue;
            const weight = Math.pow(1.02, this.clan.prestigeViewOf(model)!.value - 50);
            totalWeight += weight;
            total += model.prestigeViewOf(this.other)!.value * weight;
        }
        const imitatedPrestige = totalWeight ? total / totalWeight : undefined;

        this.bufferedImitatedPrestige_ = imitatedPrestige;
    }

    commitBufferedImitatedPrestigeUpdate() {
        this.imitatedPrestige_ = this.bufferedImitatedPrestige_;
        this.bufferedImitatedPrestige_ = undefined;
    }

    get value(): number {
        if (this.clan.settlement!.size > 300) {
            return 35;
        }

        let w = 1 - this.imitiationRatio - this.persistenceRatio;
        let s = this.inferredPrestige_.value * (1 - this.imitiationRatio - this.persistenceRatio);

        if (this.previousPrestige_ !== undefined) {
            w += this.persistenceRatio;
            s += this.previousPrestige_ * this.persistenceRatio;
        }

        if (this.imitatedPrestige_ !== undefined) {
            w += this.imitiationRatio;
            s += this.imitatedPrestige_ * this.imitiationRatio;
        }

        return s / w;
    }

    get tooltip(): string[][] {
        const items = this.inferredPrestige_.tooltip;
        if (this.imitatedPrestige_ !== undefined) {
            items.push(['Inherited',
                 this.previousPrestige_ === undefined ? '-' : this.previousPrestige_.toFixed(1)]);
            items.push(['Inferred', this.inferredPrestige_.value.toFixed(1)]);
            items.push(['Imitated', this.imitatedPrestige_.toFixed(1)]);
        }
        return items;
    }
}
