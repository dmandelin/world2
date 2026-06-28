import { GenericItem, pairIDOf, uuidOf, type HasOrIsUUID, type PairID } from "../records/basicdata";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import type { World } from "../world";

export abstract class Connection {
    abstract debugString(): string;
    abstract clone(): Connection;

    abstract alignmentItem(subject: Clan, object: Clan): GenericItem;
}

export class MarriageConnection extends Connection {
    relatedness: number = 0.0;

    debugString(): string {
        return `marriages: ${pct(this.relatedness)}`;
    }

    clone(): MarriageConnection {
        const c = new MarriageConnection();
        c.relatedness = this.relatedness;
        return c;
    }

    alignmentItem(subject: Clan, object: Clan): GenericItem {
        return new GenericItem(
            'Marriages',
            this.relatedness,
            `${pct(this.relatedness)}`
        );
    }
}

export class KinConnection extends Connection {
    readonly senior: string;
    readonly cadet: string;

    constructor(senior: string, cadet: string) {
        super();
        this.senior = senior;
        this.cadet = cadet;
    }
    
    debugString(): string {
        return `kin: ${this.senior} -> ${this.cadet}`;
    }

    clone(): KinConnection {
        return new KinConnection(this.senior, this.cadet);
    }

    alignmentItem(subject: Clan, object: Clan): GenericItem {
        return new GenericItem(
            'Kin',
            0.125,
            'Kinship'
        );
    }
}

export class FriendshipConnection extends Connection {
    debugString(): string {
        return "friendship";
    }

    clone(): FriendshipConnection {
        return new FriendshipConnection();
    }

    alignmentItem(subject: Clan, object: Clan): GenericItem {
        return new GenericItem(
            'Friendship',
            0.25,
            'Friendship'
        );
    }
}

export class NeighborConnection extends Connection {
    debugString(): string {
        return "neighbors";
    }

    clone(): NeighborConnection {
        return new NeighborConnection();
    }

    alignmentItem(subject: Clan, object: Clan): GenericItem {
        return new GenericItem(
            'Neighbors',
            -.1,
            'Inevitable annoyances'
        );
    }
}

export class ConnectionGraph {
    readonly m_: Map<PairID, Connection[]> = new Map();
    readonly a_: Map<string, Set<PairID>> = new Map();

    areConnected(c1: HasOrIsUUID, c2: HasOrIsUUID): boolean {
        const pairID = pairIDOf(c1, c2);
        return this.m_.has(pairID);
    }

    entries(): Iterable<[PairID, Connection[]]> {
        return this.m_.entries();
    }

    getForType<T extends Connection>(c1: HasOrIsUUID, c2: HasOrIsUUID, type: new (...args: any[]) => T): T | undefined {
        const pairID = pairIDOf(c1, c2);
        const connections = this.m_.get(pairID);
        if (!connections) return undefined;
        return connections.find(c => c instanceof type) as T | undefined;
    }

    entriesForHasUUID(c: HasOrIsUUID) : Iterable<[PairID, Connection[]]> {
        const pairIDs = this.a_.get(uuidOf(c));
        if (!pairIDs) return [];
        return [...pairIDs].map(pairID => [pairID, this.m_.get(pairID)!] as [PairID, Connection[]]);
    }

    getOrCreate<T extends Connection>(
        c1: HasOrIsUUID, 
        c2: HasOrIsUUID, 
        type: new (...args: any[]) => T,
        provider?: () => T): T {
        const pairID = pairIDOf(c1, c2);
        let connections = this.m_.get(pairID);
        if (!connections) {
            connections = [];
            this.m_.set(pairID, connections);

            let s1 = this.a_.get(uuidOf(c1));
            if (!s1) {
                s1 = new Set<PairID>();
                this.a_.set(uuidOf(c1), s1);
            }
            s1.add(pairID);
            let s2 = this.a_.get(uuidOf(c2));
            if (!s2) {
                s2 = new Set<PairID>();
                this.a_.set(uuidOf(c2), s2);
            }
            s2.add(pairID);
        }
        let connection = connections.find(c => c instanceof type) as T | undefined;
        if (type && !connection) {
            connection = connections.find(c => c instanceof type) as T | undefined;
        }

        if (!connection) {
            connection = provider ? provider() : new type();
            connections.push(connection);
        }
        return connection;
    }
    
    keepOnlyForType<T extends Connection>(
        keepFn: (c1: Clan, c2: Clan, connection: Connection) => boolean, 
        type: new () => T,
        world: World) {
        for (const [pairID, connections] of this.m_) {
            const [c1, c2] = world.clansFromPairID(pairID);
            for (const connection of connections) {
                if (connection instanceof type) {
                    if (!keepFn(c1, c2, connection)) {
                        this.remove(pairID, connection);
                    }
                }
            }
        }
    }

    remove(pairID: PairID, connection: Connection) {
        const connections = this.m_.get(pairID);
        if (!connections) return;
        const index = connections.indexOf(connection);
        if (index !== -1) {
            connections.splice(index, 1);
            if (connections.length === 0) {
                this.m_.delete(pairID);

                const [uuid1, uuid2] = pairID.split('|');
                const set1 = this.a_.get(uuid1);
                const set2 = this.a_.get(uuid2);
                if (set1) {
                    set1.delete(pairID);
                }
                if (set2) {
                    set2.delete(pairID);
                }
            }
        }
    }

    clone(): ConnectionGraph {
        const g = new ConnectionGraph();
        for (const [pairID, connections] of this.m_) {
            g.m_.set(pairID, connections.map(c => c.clone()));
        }
        for (const [uuid, set] of this.a_) {
            g.a_.set(uuid, new Set(set));
        }
        return g;
    }
}

export function *connectionsOf<T extends Clan|ClanDTO>(clan: T): IterableIterator<[T, Connection[]]> {
    for (const [pairID, connections] of clan.world.connections.entriesForHasUUID(clan)) {
        const [c1, c2] = clan.world.clansFromPairID(pairID);
        yield [(c1 === clan ? c2 : c1) as T, connections];
    }
}

export function *connectedClans<T extends Clan|ClanDTO>(clan: T): IterableIterator<T> {
    for (const [pairID, _] of clan.world.connections.entriesForHasUUID(clan)) {
        const [c1, c2] = clan.world.clansFromPairID(pairID);
        yield (c1 === clan ? c2 : c1) as T;
    }
}

export function *connectionsOfType<T extends Clan|ClanDTO, U extends Connection>(
    clan: T, 
    type: new (...args: any[]) => U): IterableIterator<[T, U]> 
{
    for (const [pairID, connection] of clan.world.connections.entriesForHasUUID(clan)) {
        if (connection instanceof type) {
            const [c1, c2] = clan.world.clansFromPairID(pairID);
            yield [(c1 === clan ? c2 : c1) as T, connection as U];
        }
    }
}
