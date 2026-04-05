// Snapshot registry
//
// For display purposes, especially displaying changes, we
// need to be able to navigate among snapshots efficiently.

import type { ClanDTO } from "./dtos";

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