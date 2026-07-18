import { sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { Connection } from "./connection";
import { BasicInteraction, type Interaction } from "./interaction";
import { pct } from "../lib/format";

export class ClanInformationItem {
    constructor(
        readonly label: string,
        readonly value: number,
        readonly explanation: string,
    ) { }
}

// Information a clan has about another.
export class ClanInformation {
    items: ClanInformationItem[] = [];

    get value(): number {
        return sumFun(this.items, item => item.value);
    }

    updateFor(subject: Clan, object: Clan, connections: Connection[], interactions: Interaction[]): void {
        this.items = [];
        for (const interaction of interactions) {
            const infoVal = interaction.information(subject, object);
            const isBasic = interaction instanceof BasicInteraction;
            const explanation = isBasic ? `${pct(infoVal)} attention` : "";

            this.items.push(new ClanInformationItem(
                isBasic ? "Basic Interaction" : interaction.constructor.name,
                infoVal,
                explanation,
            ));
        }
    }

    clone(): ClanInformation {
        const ci = new ClanInformation();
        ci.items = [...this.items];
        return ci;
    }
}