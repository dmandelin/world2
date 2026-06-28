import type { Clan } from "../people/people";
import type { World } from "../world";
import { Alignment2 } from "./alignment";
import { clanRefsOfPairID, Connection, ConnectionGraph, type PairID, type UUID } from "./connection";
import type { Interaction } from "./interaction";

// A clan's perceptions of another.
export class Perceptions {
    readonly alignment = new Alignment2();

    updateFor(subject: Clan, object: Clan, connections: Connection[], interactions: Interaction[]): void {
        this.alignment.updateFor(subject, object, connections, interactions);
    }
}

// Directed graph of clans' perceptions of each other.
export class PerceptionsGraph {
    // subject -> object -> perceptions
    private readonly m_ = new Map<UUID, Map<UUID, Perceptions>>();
    // object -> subject -> perceptions
    private readonly r_ = new Map<UUID, Map<UUID, Perceptions>>();

    get(subject: UUID, object: UUID): Perceptions | undefined {
        let subjectMap = this.m_.get(subject);
        if (!subjectMap) return undefined;
        return subjectMap.get(object);
    }

    getOrCreate(subject: UUID, object: UUID): Perceptions {
        let perceptions = this.get(subject, object);
        if (!perceptions) {
            perceptions = new Perceptions();
            this.add(subject, object, perceptions);
        }
        return perceptions;
    }

    add(subject: UUID, object: UUID, perceptions: Perceptions): void {
        let subjectMap = this.m_.get(subject);
        if (!subjectMap) {
            subjectMap = new Map();
            this.m_.set(subject, subjectMap);
        }
        subjectMap.set(object, perceptions);

        let objectMap = this.r_.get(object);
        if (!objectMap) {
            objectMap = new Map();
            this.r_.set(object, objectMap);
        }
        objectMap.set(subject, perceptions);
    }

    keepOnlyIn(connections: ConnectionGraph) {
        for (const [subject, subjectMap] of this.m_) {
            for (const [object, _] of subjectMap) {
                if (!connections.areConnected(subject, object)) {
                    subjectMap.delete(object);
                    const objectMap = this.r_.get(object);
                    if (objectMap) {
                        objectMap.delete(subject);
                    }
                }
            }
        }
    }

    clone(): PerceptionsGraph {
        const g = new PerceptionsGraph();
        for (const [subject, subjectMap] of this.m_) {
            for (const [object, perceptions] of subjectMap) {
                g.add(subject, object, perceptions);
            }
        }
        return g;
    }
}

export function updatePerceptions(world: World): void {
    world.perceptions.keepOnlyIn(world.connections);

    for (const [pairID, connections] of world.connections.entries()) {
        const [c1, c2] = clanRefsOfPairID(pairID, world);
        const interactions = world.interactions.get(c1, c2);
        const perceptions = world.perceptions.getOrCreate(c1.uuid, c2.uuid);
        perceptions.updateFor(c1, c2, connections, interactions);
        const perceptions2 = world.perceptions.getOrCreate(c2.uuid, c1.uuid);
        perceptions2.updateFor(c2, c1, connections, interactions);
    }
}