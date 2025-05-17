import { normal } from "./distributions";
import type { Clan } from "./people";

export class OwnPrestigeCalc {
    readonly items: [string, number][];

    constructor(readonly clan: Clan, readonly other: Clan) {
        if (clan.settlement!.size > 300) {
            this.items = [['Strangers!', 35]];
        } else {
            this.items = [
                ['Neighbors', 50],
                [`Size ${other.size}`, Math.log2(other.size / 50) * 5],
                [`Strength ${other.strength}`, (other.strength - 50) / 10],
                [`Intelligence ${other.intelligence}`, (other.intelligence - 50) / 20],
                [`Skill ${other.skill.toFixed()}`, (other.skill - 50) / 10],
                [`Random`, normal(0, 2)],
            ];
        }
    }

    get value(): number {
        return this.items.reduce((acc, [_, v]) => acc + v, 0);
    }

    get tooltip(): string[][] {
        return this.items.map(([k, v]) => [k, v.toFixed(1)]);
    }
}

export class PrestigeCalc {
    readonly imitiationRatio: number = 0.5;

    ownPrestige_: OwnPrestigeCalc;
    imitatedPrestige_: number|undefined;

    constructor(readonly clan: Clan, readonly other: Clan) {
        this.ownPrestige_ = new OwnPrestigeCalc(clan, other);
    }

    updateOwnPrestige() {
        this.ownPrestige_ = new OwnPrestigeCalc(this.clan, this.other);
    }
    
    get value(): number {
        if (this.imitatedPrestige_ === undefined) {
            return this.ownPrestige_.value;
        } else {
            return this.imitatedPrestige_ * this.imitiationRatio + this.ownPrestige_.value * (1 - this.imitiationRatio);
        }
    }

    get tooltip(): string[][] {
        const items = this.ownPrestige_.tooltip;
        if (this.imitatedPrestige_ !== undefined) {
            items.push(['Imitated', this.imitatedPrestige_.toFixed(1)]);
        }
        return items;
    }
}
