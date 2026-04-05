import type { StandaloneSettlementDTO } from "../records/dtos";

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

// Logs exemplar settlement snapshots.
export function logExperiment1(
    beginningOfTurnSnapshot?: StandaloneSettlementDTO, 
    endOfTurnSnapshot?: StandaloneSettlementDTO) {
    if (!enabled) return;
    
    if (endOfTurnSnapshot?.uuid !== exemplarSettlementUUID) {
        return;
    }

    console.log(`Experiment 1 (${beginningOfTurnSnapshot?.name}):`, {
        beginningOfTurnSnapshot,
        endOfTurnSnapshot,
    });
}
