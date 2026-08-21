import { Alignment } from "./alignment";
import { ClanInformation } from "./information";
import { Connection, ConnectionGraph } from "./connection";
import { Respect } from "./respect";
import { Holiness } from "./holiness";
import type { Clan } from "../people/people";
import type { Interaction } from "./interaction";
import type { World } from "../world";
import { uuidOf, type HasOrIsUUID, type UUID } from "../records/basicdata";

// A clan's perceptions of another.
export class Perceptions {
    readonly information = new ClanInformation();
    readonly alignment = new Alignment();
    readonly respect = new Respect();
    readonly holiness = new Holiness();

    constructor(
        information: ClanInformation = new ClanInformation(),
        alignment: Alignment = new Alignment(),
        respect: Respect = new Respect(),
        holiness: Holiness = new Holiness(),
    ) {
        this.information = information;
        this.alignment = alignment;
        this.respect = respect;
        this.holiness = holiness;
    }

    updateFor(subject: Clan, object: Clan, connections: Connection[], interactions: Interaction[]): void {
        this.information.updateFor(subject, object, connections, interactions);
        this.respect.updateFor(subject, object, this.information.value);
        this.holiness.updateFor(subject, object, this.information.value);
        this.alignment.updateFor(subject, object, connections, interactions);
    }

    // A clan appraising itself. Full information, unqualified goodwill, and
    // its own observations of its own conduct.
    updateForSelf(subject: Clan): void {
        this.information.updateForSelf(subject);
        this.respect.updateFor(subject, subject, 1);
        this.holiness.updateFor(subject, subject, 1);
        this.alignment.updateForSelf(subject);
    }

    clone(): Perceptions {
        return new Perceptions(
            this.information.clone(),
            this.alignment.clone(),
            this.respect.clone(),
            this.holiness.clone(),
        );
    }
}

// Directed graph of clans' perceptions of each other.
export class PerceptionsGraph {
    // subject -> object -> perceptions
    private readonly m_ = new Map<UUID, Map<UUID, Perceptions>>();
    // object -> subject -> perceptions
    private readonly r_ = new Map<UUID, Map<UUID, Perceptions>>();
    // What each clan makes of itself. Kept apart from the pair graph so that
    // everything walking the graph -- gossip, information levels, the
    // relationship tables -- goes on seeing only pairs of different clans,
    // while get(c, c) still answers.
    private readonly self_ = new Map<UUID, Perceptions>();

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
        const subjectID = uuidOf(subject);
        const objectID = uuidOf(object);
        if (subjectID === objectID) return this.self_.get(subjectID);
        let subjectMap = this.m_.get(subjectID);
        if (!subjectMap) return undefined;
        return subjectMap.get(objectID);
    }

    getOrCreate(subject: HasOrIsUUID, object: HasOrIsUUID): Perceptions {
        let perceptions = this.get(subject, object);
        if (!perceptions) {
            perceptions = new Perceptions();
            if (uuidOf(subject) === uuidOf(object)) {
                this.self_.set(uuidOf(subject), perceptions);
            } else {
                this.add(uuidOf(subject), uuidOf(object), perceptions);
            }
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

    // Drop self-views belonging to clans that no longer exist.
    keepSelfOnly(clanIDs: Set<UUID>) {
        for (const id of [...this.self_.keys()]) {
            if (!clanIDs.has(id)) this.self_.delete(id);
        }
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
        for (const [subject, perceptions] of this.self_) {
            g.self_.set(subject, perceptions.clone());
        }
        return g;
    }
}

// What a clan makes of itself. It has no gaps in its information about its
// own doings, it is on its own side, and it credits itself with whatever
// Pride it was born with on top of the plain facts.
function updateSelfPerceptions(world: World): void {
    world.perceptions.keepSelfOnly(new Set(world.allClans.map(c => c.uuid)));
    for (const clan of world.allClans) {
        const perceptions = world.perceptions.getOrCreate(clan, clan);
        perceptions.updateForSelf(clan);
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

    updateSelfPerceptions(world);
}