import { randInt, sumValues } from "../lib/basics";
import type { Clan } from "./people";

export class RespectCalc {
    readonly items: Record<string, RespectCalcItem> = {};

    // clan is the clan being respected or not.
    constructor(readonly clan: Clan) {
    }

    get value(): number {
        return sumValues(this.items, item => item.value);
    }

    update(interactionFactor: number): void {
        const previousValue = this.value;

        this.add('Memory', previousValue / 2);
        this.add('Events', randInt(10 * interactionFactor) - randInt(10 * interactionFactor));
    }

    private add(name: string, value: number): RespectCalcItem {
        const item = new RespectCalcItem(name, value);
        this.items[name] = item;
        return item;
    }
}

class RespectCalcItem {
    constructor(
        readonly name: string,
        readonly value: number) {}
}