// Simulation constants that headless tuning runs are allowed to sweep.
//
// The model reads these at call time rather than capturing them at module
// load, so a batch can set them, run, and put them back. Everything here is
// process-global: the tuning worker gets its own module instance, but the
// main-thread fallback shares this one with the live world, so callers there
// must restore the previous values (see withTuning).

import { Processes } from "./econ/econdefs";
import { FESTIVAL_TIME_COMPENSATION } from "./festivals";

export type TuningParams = {
    // Annual births per childbearing-age woman, before modifiers.
    baseBirthRate: number;
    // Global multiplier on every death rate, all causes and age slices.
    deathRateAdjustmentFactor: number;
    // Base output per worker-year, before productivity modifiers.
    fishingOutputPerWorker: number;
    agricultureOutputPerWorker: number;
};

export type TuningParamSpec = {
    readonly key: keyof TuningParams;
    readonly label: string;
    readonly step: number;
    readonly min: number;
    readonly max: number;
};

export const TUNING_PARAM_SPECS: readonly TuningParamSpec[] = [
    { key: 'baseBirthRate', label: 'Base birth rate', step: 0.01, min: 0, max: 2 },
    { key: 'deathRateAdjustmentFactor', label: 'Death rate adjustment', step: 0.01, min: 0, max: 5 },
    { key: 'fishingOutputPerWorker', label: 'Fishing output / worker', step: 0.1, min: 0, max: 20 },
    { key: 'agricultureOutputPerWorker', label: 'Agriculture output / worker', step: 0.1, min: 0, max: 20 },
];

export const DEFAULT_TUNING: Readonly<TuningParams> = {
    baseBirthRate: 0.25,
    deathRateAdjustmentFactor: 0.88,
    // Scaled up with the process defaults, for the same reason: festival
    // time has been taken out of production and the rest has to cover it.
    fishingOutputPerWorker: 3.3 * FESTIVAL_TIME_COMPENSATION,
    agricultureOutputPerWorker: 3.3 * FESTIVAL_TIME_COMPENSATION,
};

// Live values. Read these, don't copy them into module-level constants.
export const tuning: TuningParams = { ...DEFAULT_TUNING };

export function readTuning(): TuningParams {
    return { ...tuning };
}

export function applyTuning(params: Partial<TuningParams>): void {
    Object.assign(tuning, params);
    // The two output rates live on the shared Process objects, which the
    // economy reads directly.
    Processes.Fishing.outputPerWorker = tuning.fishingOutputPerWorker;
    Processes.Agriculture.outputPerWorker = tuning.agricultureOutputPerWorker;
}

// Run fn with the given parameters in effect, restoring the previous ones
// afterwards even if it throws.
export async function withTuning<T>(
    params: Partial<TuningParams>,
    fn: () => Promise<T>,
): Promise<T> {
    const previous = readTuning();
    applyTuning(params);
    try {
        return await fn();
    } finally {
        applyTuning(previous);
    }
}
