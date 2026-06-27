import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO, WorldDTO } from "../records/dtos";
import type { World } from "../world";

export abstract class Connection {
    abstract debugString(): string;
    abstract clone(): Connection;
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
}

export class FriendshipConnection extends Connection {
    debugString(): string {
        return "friendship";
    }

    clone(): FriendshipConnection {
        return new FriendshipConnection();
    }
}

export class NeighborConnection extends Connection {
    debugString(): string {
        return "neighbors";
    }

    clone(): NeighborConnection {
        return new NeighborConnection();
    }
}

export type PairID = string;

export type HasUUID = { uuid: string };

export function pairIDOf(c1: HasUUID, c2: HasUUID): PairID {
    const [uuid1, uuid2] = [c1.uuid, c2.uuid].sort();
    return `${uuid1}|${uuid2}`;
}

export function clansOfPairID(pairID: PairID, world: WorldDTO): [ClanDTO, ClanDTO] {
    const [uuid1, uuid2] = pairID.split('|');
    const c1 = world.allClans.find(c => c.uuid === uuid1);
    const c2 = world.allClans.find(c => c.uuid === uuid2);
    return [c1!, c2!];
}

function clanRefsOfPairID(pairID: PairID, world: World): [Clan, Clan] {
    const [uuid1, uuid2] = pairID.split('|');
    const c1 = world.allClans.find(c => c.uuid === uuid1);
    const c2 = world.allClans.find(c => c.uuid === uuid2);
    return [c1!, c2!];
}

export class ConnectionGraph {
    readonly m_: Map<PairID, Connection[]> = new Map();

    entries(): Iterable<[PairID, Connection[]]> {
        return this.m_.entries();
    }

    getForType<T extends Connection>(c1: HasUUID, c2: HasUUID, type: new () => T): T | undefined {
        const pairID = pairIDOf(c1, c2);
        const connections = this.m_.get(pairID);
        if (!connections) return undefined;
        return connections.find(c => c instanceof type) as T | undefined;
    }

    getOrCreate<T extends Connection>(
        c1: HasUUID, 
        c2: HasUUID, 
        type: new (...args: any[]) => T,
        provider?: () => T): T {
        const pairID = pairIDOf(c1, c2);
        let connections = this.m_.get(pairID);
        if (!connections) {
            connections = [];
            this.m_.set(pairID, connections);
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
            const [c1, c2] = clanRefsOfPairID(pairID, world);
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
            }
        }
    }

    // Clones the map but not the Connection instances.
    clone(): ConnectionGraph {
        const g = new ConnectionGraph();
        for (const [pairID, connections] of this.m_) {
            g.m_.set(pairID, connections.map(c => c.clone()));
        }
        return g;
    }
}