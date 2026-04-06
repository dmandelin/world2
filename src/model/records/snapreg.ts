// Snapshot registry
//
// For display purposes, especially displaying changes, we
// need to be able to navigate among snapshots efficiently.

import type { ClanDTO, StandaloneSettlementDTO } from "./dtos";

// The first thing we need is to be able to find the snapshot
// history for a clan that is now in the settlement, but may
// not have been previously. The obvious solution is a map
// from clan UUID to snapshot history.

const clanSnapshotHistories: Map<string, ClanSnapshotHistory> = new Map();

const maxSnapshotsPerClan = 5;

class ClanSnapshotHistory {
    recentSnapshots: ClanDTO[] = [];
}

export function registerClanEndOfTurnSnapshot(clan: ClanDTO): void {
    // Get or create the snapshot history for this clan.
    let history = clanSnapshotHistories.get(clan.uuid);
    if (!history) {
        history = new ClanSnapshotHistory();
        clanSnapshotHistories.set(clan.uuid, history);
    }

    // Add the new snapshot to the end of the history, and trim if necessary.
    history.recentSnapshots.push(clan);
    if (history.recentSnapshots.length > maxSnapshotsPerClan) {
        history.recentSnapshots.shift();
    }
}

export function getClanLastTurnSnapshots(settlement: StandaloneSettlementDTO): 
    Map<string, {p?: ClanDTO, e: ClanDTO}> {

    const result: Map<string, {p?: ClanDTO, e: ClanDTO}> = new Map();
    for (const clan of settlement.clans) {
        const history = clanSnapshotHistories.get(clan.uuid);
        if (history && history.recentSnapshots.length > 0) {
            const recentSnapshots = history.recentSnapshots;
            const lastSnapshot = recentSnapshots.length > 0 ? recentSnapshots[recentSnapshots.length - 1] : undefined;
            const secondLastSnapshot = recentSnapshots.length > 1 ? recentSnapshots[recentSnapshots.length - 2] : undefined;
            result.set(clan.uuid, {p: secondLastSnapshot, e: lastSnapshot!});
        }
    }
    return result;
}

export function getClanSnapshotHistories(settlement: StandaloneSettlementDTO): Map<string, ClanDTO[]> {
    const result: Map<string, ClanDTO[]> = new Map();
    for (const clan of settlement.clans) {
        const history = clanSnapshotHistories.get(clan.uuid);
        if (history) {
            result.set(clan.uuid, history.recentSnapshots);
        }
    }
    return result;
}

export function getClanSnapshotHistory(uuid: string): ClanDTO[] {
    const history = clanSnapshotHistories.get(uuid);
    return history ? history.recentSnapshots : [];
}