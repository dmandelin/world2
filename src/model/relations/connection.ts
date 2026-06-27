export abstract class Connection {
    abstract debugString(): string;
}

export class MarriageConnection extends Connection {
    relatedness: number = 0.0;

    debugString(): string {
        return "MarriageConnection";
    }
}

export class KinConnection extends Connection {
    debugString(): string {
        return "KinConnection";
    }
}

export class FriendshipConnection extends Connection {
    debugString(): string {
        return "FriendshipConnection";
    }
}

export class NeighborConnection extends Connection {
    debugString(): string {
        return "NeighborConnection";
    }
}

export type PairID = string;

export type HasUUID = { uuid: string };

export function pairIDOf(c1: HasUUID, c2: HasUUID): PairID {
    const [uuid1, uuid2] = [c1.uuid, c2.uuid].sort();
    return `${uuid1}|${uuid2}`;
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

    getOrCreateForType<T extends Connection>(c1: HasUUID, c2: HasUUID, type: new () => T): T {
        const pairID = pairIDOf(c1, c2);
        let connections = this.m_.get(pairID);
        if (!connections) {
            connections = [];
            this.m_.set(pairID, connections);
        }
        let connection = connections.find(c => c instanceof type) as T | undefined;
        if (!connection) {
            connection = new type();
            connections.push(connection);
        }
        return connection;
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
    shallowClone(): ConnectionGraph {
        const g = new ConnectionGraph();
        for (const [pairID, connections] of this.m_) {
            g.m_.set(pairID, [...connections]);
        }
        return g;
    }
}