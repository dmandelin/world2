// Recording sessions: the well-defined home for simulation data.
//
// A session owns one stream of entity snapshots per entity type. There is
// always a "live" session fed by the world the main route is showing; each
// click of Generate on the sessions route adds another.

export type SnapshotValue = number | string | null;

// Every row carries at least a year coordinate and the entity's UUID.
export type SnapshotRow = {
    year: number;
    uuid: string;
} & Record<string, SnapshotValue>;

export type GenerationParams = {
    settlementCount: number;
    clansPerSettlement: number;
    years: number;
};

export type SessionKind = 'live' | 'generated';

export class SnapshotStream {
    readonly rows: SnapshotRow[] = [];

    constructor(
        readonly entityType: string,
        readonly fields: readonly string[],
    ) { }

    get rowCount(): number {
        return this.rows.length;
    }

    get entityCount(): number {
        return new Set(this.rows.map(r => r.uuid)).size;
    }

    get yearRange(): [number, number] | undefined {
        if (!this.rows.length) return undefined;
        let lo = this.rows[0].year;
        let hi = lo;
        for (const row of this.rows) {
            if (row.year < lo) lo = row.year;
            if (row.year > hi) hi = row.year;
        }
        return [lo, hi];
    }
}

export class RecordingSession {
    readonly streams = new Map<string, SnapshotStream>();

    constructor(
        public name: string,
        readonly kind: SessionKind = 'generated',
        readonly params?: GenerationParams,
        readonly createdAt: Date = new Date(),
        readonly id: string = crypto.randomUUID(),
    ) { }

    // Get the stream for an entity type, creating it on first use.
    stream(entityType: string, fields: readonly string[]): SnapshotStream {
        let stream = this.streams.get(entityType);
        if (!stream) {
            stream = new SnapshotStream(entityType, fields);
            this.streams.set(entityType, stream);
        }
        return stream;
    }

    get totalRows(): number {
        let total = 0;
        for (const stream of this.streams.values()) total += stream.rowCount;
        return total;
    }

    get yearRange(): [number, number] | undefined {
        let range: [number, number] | undefined;
        for (const stream of this.streams.values()) {
            const r = stream.yearRange;
            if (!r) continue;
            range = range
                ? [Math.min(range[0], r[0]), Math.max(range[1], r[1])]
                : r;
        }
        return range;
    }
}

class SessionStore {
    readonly sessions: RecordingSession[] = [];

    private readonly listeners = new Set<() => void>();

    add(session: RecordingSession): RecordingSession {
        this.sessions.push(session);
        this.notify();
        return session;
    }

    get(id: string): RecordingSession | undefined {
        return this.sessions.find(s => s.id === id);
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(): void {
        for (const listener of this.listeners) listener();
    }
}

// The one place generated and live data lives. Any route can import this.
export const sessionStore = new SessionStore();

// ----------------------------------------------------------------
// Transfer across a worker boundary (structured-cloneable plain data).

export type SerializedSession = {
    id: string;
    name: string;
    kind: SessionKind;
    params?: GenerationParams;
    createdAtMs: number;
    streams: { entityType: string; fields: string[]; rows: SnapshotRow[] }[];
};

export function serializeSession(session: RecordingSession): SerializedSession {
    return {
        id: session.id,
        name: session.name,
        kind: session.kind,
        params: session.params,
        createdAtMs: session.createdAt.getTime(),
        streams: [...session.streams.values()].map(s => ({
            entityType: s.entityType,
            fields: [...s.fields],
            rows: s.rows,
        })),
    };
}

export function deserializeSession(data: SerializedSession): RecordingSession {
    const session = new RecordingSession(
        data.name,
        data.kind,
        data.params,
        new Date(data.createdAtMs),
        data.id,
    );
    for (const s of data.streams) {
        const stream = session.stream(s.entityType, s.fields);
        stream.rows.push(...s.rows);
    }
    return session;
}
