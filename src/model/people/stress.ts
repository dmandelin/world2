import { sumFun } from "../lib/basics";
import { GenericItem } from "../records/basicdata";
import type { Clan } from "./people";

export class Stress {
    items: GenericItem[];

    constructor(items?: GenericItem[]) {
        this.items = items ?? [];
    }

    clone(): Stress {
        return new Stress(this.items.map(item => item));
    }

    get value(): number {
        return sumFun(this.items, item => item.value);
    }

    update(clan: Clan): void {
        this.items = [
            new GenericItem(
                'Life',
                -10,
                'Life stress',
            ),
            new GenericItem(
                'Conflicts',
                clan.conflictPayoff(),
                'Conflicts',
            )
        ];
    }
}