import { sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";

// Information a clan has about another.
export class ClanInformation {
    value: number = 0;

    updateFor(subject: Clan, object: Clan, connections: Connection[], interactions: Interaction[]): void {
        this.value = sumFun(interactions, interaction => interaction.information(subject, object));
    }
}