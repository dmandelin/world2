import { clamp, maxbyWithValue, sumFun } from "../lib/basics";
import type { Clan } from "../people/people";
import type { GenericItem } from "../records/basicdata";
import type { ClanDTO } from "../records/dtos";
import type { World } from "../world";
import type { Connection } from "./connection";
import type { Interaction } from "./interaction";

export class Alignment {
    items: GenericItem[] = [];

    updateFor(
        subject: Clan,
        object: Clan,
        connections: Connection[],
        interactions: Interaction[]): void {

        this.items = [
            ...connections.map(connection => connection.alignmentItem(subject, object)),
            ...interactions.map(interaction => interaction.alignmentItem(subject, object))
        ];
    }

    clone(): Alignment {
        const a = new Alignment();
        a.items = [...this.items];
        return a;
    }

    get value(): number {
        return clamp(sumFun(this.items, item => item.value), -1, 1);
    }
}

export function getAlignment(subject: Clan | ClanDTO, object: Clan | ClanDTO): number {
    return subject.world.perceptions.get(subject.uuid, object.uuid)?.alignment.value ?? 0;
}