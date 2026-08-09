// Captures entity snapshots into a recording session.
//
// One call to record() writes one row per live entity into that entity
// type's stream, tagged with the current year. The world calls it once at
// the start and once after each advance phase.

import { CLAN_FIELDS, SETTLEMENT_FIELDS, type FieldSpec } from "./snapshotfields";
import type { RecordingSession, SnapshotRow } from "./sessions";
import type { World } from "../world";

export const SETTLEMENT_STREAM = 'settlement';
export const CLAN_STREAM = 'clan';

export class SnapshotRecorder {
    // Entities without a UUID can't be tracked across time, so we refuse to
    // snapshot them. Warn once rather than once per entity per year.
    private warnedTypes = new Set<string>();

    constructor(readonly session: RecordingSession) { }

    record(world: World): void {
        const year = world.year.value;
        this.recordStream(SETTLEMENT_STREAM, year, world.allSettlements, SETTLEMENT_FIELDS);
        this.recordStream(CLAN_STREAM, year, world.allClans, CLAN_FIELDS);
    }

    private recordStream<T extends { uuid?: string }>(
        entityType: string,
        year: number,
        entities: readonly T[],
        fields: readonly FieldSpec<T>[],
    ): void {
        const stream = this.session.stream(entityType, fields.map(f => f.name));
        for (const entity of entities) {
            const uuid = entity.uuid;
            if (typeof uuid !== 'string' || !uuid) {
                if (!this.warnedTypes.has(entityType)) {
                    this.warnedTypes.add(entityType);
                    console.warn(`Refusing to snapshot ${entityType}: entity has no UUID`);
                }
                continue;
            }
            const row = { year, uuid } as SnapshotRow;
            for (const field of fields) {
                row[field.name] = field.get(entity);
            }
            stream.rows.push(row);
        }
    }
}
