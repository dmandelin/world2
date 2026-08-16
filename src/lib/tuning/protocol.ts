// Shared types for tuning batch runs, and the messages exchanged with the
// tuning worker.

import type { TuningParams } from "../../model/tuning";

export type BatchConfig = {
    runs: number;
    settlementCount: number;
    clansPerSettlement: number;
    years: number;
};

export const METRIC_KEYS = [
    'settlements',
    'clans',
    'people',
    'foodProduction',
    'foodConsumption',
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export type MetricSpec = {
    readonly key: MetricKey;
    readonly label: string;
    readonly precision: number;
};

export const METRIC_SPECS: readonly MetricSpec[] = [
    { key: 'settlements', label: 'Settlements', precision: 0 },
    { key: 'clans', label: 'Clans', precision: 0 },
    { key: 'people', label: 'People', precision: 0 },
    { key: 'foodProduction', label: 'Food produced / capita', precision: 2 },
    { key: 'foodConsumption', label: 'Food consumed / capita', precision: 2 },
];

// One metric's distribution across the runs at a single year.
export type Summary = {
    year: number;
    count: number;
    mean: number;
    min: number;
    max: number;
    p25: number;
    median: number;
    p75: number;
};

// Every metric summarized for one year.
export type YearFrame = {
    year: number;
    summaries: Record<MetricKey, Summary>;
};

export type BatchPhase = 'setup' | 'running' | 'paused' | 'done' | 'stopped' | 'error';

// ---- worker messages ----

export type StartRequest = {
    type: 'start';
    config: BatchConfig;
    tuning: TuningParams;
};

export type ControlRequest =
    | { type: 'pause' }
    | { type: 'resume' }
    | { type: 'stop' };

export type BatchRequest = StartRequest | ControlRequest;

// Worlds are built before any of them advances, which takes a moment.
export type BatchSetup = {
    type: 'setup';
    worldsReady: number;
    worldsTotal: number;
};

export type BatchProgress = {
    type: 'progress';
    // Years finished, and the frames produced since the last message.
    yearsDone: number;
    yearsTotal: number;
    // Runs still advancing; a run whose population dies out stops early.
    liveRuns: number;
    frames: YearFrame[];
};

export type BatchDone = {
    type: 'done';
    // 'stopped' when the user ended it early.
    phase: 'done' | 'stopped';
    elapsedMs: number;
};

export type BatchError = {
    type: 'error';
    message: string;
};

export type BatchResponse = BatchSetup | BatchProgress | BatchDone | BatchError;

// ---- statistics ----

// Linear-interpolated percentile of an already-sorted array.
export function percentile(sorted: number[], q: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function summarize(year: number, values: number[]): Summary {
    if (values.length === 0) {
        return { year, count: 0, mean: 0, min: 0, max: 0, p25: 0, median: 0, p75: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    let total = 0;
    for (const v of sorted) total += v;
    return {
        year,
        count: sorted.length,
        mean: total / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p25: percentile(sorted, 0.25),
        median: percentile(sorted, 0.5),
        p75: percentile(sorted, 0.75),
    };
}
