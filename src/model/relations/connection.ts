import { GenericItem, type HasOrIsUUID, type UUID } from "../records/basicdata";
import { ClanPairListGraph } from "./clanpairgraph";
import { pct } from "../lib/format";
import type { Clan } from "../people/people";
import type { ClanDTO } from "../records/dtos";
import type { World } from "../world";

export abstract class Connection {
    abstract debugString(): string;
    abstract clone(): Connection;

    abstract alignmentItem(subject: Clan, object: Clan): GenericItem;
}

const relatednessText = (d: { relatedness: number }) => `${pct(d.relatedness)}`;

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
            relatednessText,
            { relatedness: this.relatedness }
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
            0.05,
            'Neighbors'
        );
    }
}

export class ConnectionGraph extends ClanPairListGraph<Connection> {
    areConnected(c1: HasOrIsUUID, c2: HasOrIsUUID): boolean {
        return this.has(c1, c2);
    }

    getForType<T extends Connection>(
        c1: HasOrIsUUID, c2: HasOrIsUUID,
        type: new (...args: any[]) => T): T | undefined {
        return this.getOfType(c1, c2, type);
    }

    // Drop every connection of a kind that no longer holds. The callback gets
    // the clans rather than their uuids, since deciding usually means looking
    // at where they live or who they are.
    keepOnlyForType<T extends Connection>(
        keepFn: (c1: Clan, c2: Clan, connection: Connection) => boolean,
        type: new () => T,
        world: World) {
        const doomed: [UUID, UUID, Connection][] = [];
        for (const [u1, u2, connections] of this.pairs()) {
            const [c1, c2] = world.clansFrom(u1, u2);
            for (const connection of connections) {
                if (connection instanceof type && !keepFn(c1, c2, connection)) {
                    doomed.push([u1, u2, connection]);
                }
            }
        }
        for (const [u1, u2, connection] of doomed) {
            this.removeItem(u1, u2, connection);
        }
    }

    clone(): ConnectionGraph {
        const g = new ConnectionGraph();
        g.fillFrom(this, connections => connections.map(c => c.clone()));
        return g;
    }
}

export function* connectionsOf<T extends Clan | ClanDTO>(clan: T): IterableIterator<[T, Connection[]]> {
    for (const [otherID, connections] of clan.world.connections.getFor(clan)) {
        yield [clan.world.clanFrom(otherID) as T, connections];
    }
}

export function* connectedClans<T extends Clan | ClanDTO>(clan: T): IterableIterator<T> {
    for (const [otherID] of clan.world.connections.getFor(clan)) {
        yield clan.world.clanFrom(otherID) as T;
    }
}

export function* connectionsOfType<T extends Clan | ClanDTO, U extends Connection>(
    clan: T,
    type: new (...args: any[]) => U): IterableIterator<[T, U]> {
    for (const [otherID, connections] of clan.world.connections.getFor(clan)) {
        for (const connection of connections) {
            if (connection instanceof type) {
                yield [clan.world.clanFrom(otherID) as T, connection as U];
            }
        }
    }
}
