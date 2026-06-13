import { sum } from "../lib/basics";
import type { Clan } from "../people/people";

export class HelpAllocation {
    // Fraction of effort allocated to helping each clan.
    private m: Map<Clan, number> = new Map();

    [Symbol.iterator](): Iterator<[Clan, number]> {
        return this.m.entries();
    }

    clear() {
        this.m.clear();
    }

    get(clan: Clan): number {
        return this.m.get(clan) ?? 0;
    }

    set(clan: Clan, fraction: number) {
        if (fraction == 0) {
            this.m.delete(clan);
        } else {
            this.m.set(clan, fraction);
        }
    }

    get total(): number {
        return sum(this.m.values());
    }
}