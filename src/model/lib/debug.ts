import type { SettlementDTO } from "../records/dtos";

const enabled = true;

// Logging

export function loggingEnabled(): boolean {
    return enabled;
}

export function log(...args: any[]) {
    if (!enabled) return;
    console.log(...args);
}

// Specific experiments

let exemplarSettlementUUID: string | undefined = undefined;
export function setExemplarSettlementUUID(uuid: string) {
    exemplarSettlementUUID = uuid;
}

let exemplarClanUID: string | undefined = undefined;
export function setExemplarClanUID(uid: string) {
    exemplarClanUID = uid;
}
export function getExemplarClan<T extends { uuid: string }>(clans: T[]): T | undefined {
    return clans.find(c => c.uuid === exemplarClanUID);
}
export function isExemplarClan(clan: { uuid: string }): boolean {
    return clan.uuid === exemplarClanUID;
}

// Log exemplar settlement snapshots.
export function logExperiment1(
    beginningOfTurnSnapshot?: SettlementDTO, 
    endOfTurnSnapshot?: SettlementDTO) {
    if (!enabled) return;
    
    if (endOfTurnSnapshot?.uuid !== exemplarSettlementUUID) {
        return;
    }

    console.log(`Experiment 1 (${beginningOfTurnSnapshot?.name}):`, {
        beginningOfTurnSnapshot,
        endOfTurnSnapshot,
    });
}
