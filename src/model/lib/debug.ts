import type { SettlementDTO } from "../records/dtos";

let enabled = true;

// Logging

export function loggingEnabled(): boolean {
    return enabled;
}

// Batch runs (e.g. data generation) turn logging off: console output for
// hundreds of turns is both slow and useless.
export function setLoggingEnabled(value: boolean) {
    enabled = value;
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
