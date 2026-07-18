import { Alignment } from "./alignment";
import { ClanInformation } from "./information";
import { Connection, ConnectionGraph } from "./connection";
import { Respect } from "./respect";
import { MarriageInterest } from "./marriageInterest";
import type { Clan } from "../people/people";
import type { Interaction } from "./interaction";
import type { World } from "../world";
import { uuidOf, type HasOrIsUUID, type UUID } from "../records/basicdata";

// A clan's perceptions of another.
export class Perceptions {
    readonly information = new ClanInformation();
    readonly alignment = new Alignment();
    readonly respect = new Respect();
    readonly marriageInterest = new MarriageInterest();

    constructor(
        information: ClanInformation = new ClanInformation(),
        alignment: Alignment = new Alignment(),
        respect: Respect = new Respect(),
        marriageInterest: MarriageInterest = new MarriageInterest()
    ) {
        this.information = information;
        this.alignment = alignment;
        this.respect = respect;
        this.marriageInterest = marriageInterest;
    }

    updateFor(subject: Clan, object: Clan, connections: Connection[], interactions: Interaction[]): void {
        this.information.updateFor(subject, object, connections, interactions);
        this.alignment.updateFor(subject, object, connections, interactions);
        this.respect.updateFor(subject, object);
        this.marriageInterest.updateFor(subject, object, this.information.value);
    }

    clone(): Perceptions {
        return new Perceptions(
            this.information.clone(),
            this.alignment.clone(),
            this.respect.clone(),
            this.marriageInterest.clone()
        );
    }
}

// Directed graph of clans' perceptions of each other.
export class PerceptionsGraph {
    // subject -> object -> perceptions
    private readonly m_ = new Map<UUID, Map<UUID, Perceptions>>();
    // object -> subject -> perceptions
    private readonly r_ = new Map<UUID, Map<UUID, Perceptions>>();

    getFor(subject: HasOrIsUUID): Iterable<[UUID, Perceptions]> {
        const subjectMap = this.m_.get(uuidOf(subject));
        if (!subjectMap) return [];
        return subjectMap.entries();
    }

    getRegarding(object: HasOrIsUUID): Iterable<[UUID, Perceptions]> {
        const objectMap = this.r_.get(uuidOf(object));
        if (!objectMap) return [];
        return objectMap.entries();
    }

    get(subject: HasOrIsUUID, object: HasOrIsUUID): Perceptions | undefined {
        let subjectMap = this.m_.get(uuidOf(subject));
        if (!subjectMap) return undefined;
        return subjectMap.get(uuidOf(object));
    }

    getOrCreate(subject: HasOrIsUUID, object: HasOrIsUUID): Perceptions {
        let perceptions = this.get(subject, object);
        if (!perceptions) {
            perceptions = new Perceptions();
            this.add(uuidOf(subject), uuidOf(object), perceptions);
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
                g.add(subject, object, perceptions.clone());
            }
        }
        return g;
    }
}

export function updatePerceptions(world: World): void {
    world.perceptions.keepOnlyIn(world.connections);

    for (const [pairID, connections] of world.connections.entries()) {
        const [c1, c2] = world.clansFromPairID(pairID);
        const interactions = world.interactions.get(c1, c2);
        const perceptions = world.perceptions.getOrCreate(c1.uuid, c2.uuid);
        perceptions.updateFor(c1, c2, connections, interactions);
        const perceptions2 = world.perceptions.getOrCreate(c2.uuid, c1.uuid);
        perceptions2.updateFor(c2, c1, connections, interactions);
    }
}