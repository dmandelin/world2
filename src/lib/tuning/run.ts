// The tuning batch run, shared by the worker and the main-thread fallback.
//
// Runs are advanced in lockstep — every world takes one year, then that
// year's spread across runs is summarized — so the charts can show a real
// distribution from the first year rather than filling in run by run.

import { sumFun } from "../../model/lib/basics";
import { loggingEnabled, setLoggingEnabled } from "../../model/lib/debug";
import { applyTuning, readTuning, type TuningParams } from "../../model/tuning";
import { World } from "../../model/world";
import {
    METRIC_KEYS,
    summarize,
    type BatchConfig,
    type MetricKey,
    type Summary,
    type YearFrame,
} from "./protocol";

export type BatchControl = {
    shouldPause(): boolean;
    shouldStop(): boolean;
};

export type BatchCallbacks = {
    // Called with the frames accumulated since the last call.
    onFrames(frames: YearFrame[], yearsDone: number, liveRuns: number): void;
    onSetupProgress?(worldsReady: number, worldsTotal: number): void;
};

// How long to run before handing the event loop back, so control messages
// (pause/stop) get seen and — on the main thread — the page keeps painting.
const SLICE_MS = 24;

function yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function sample(world: World, key: MetricKey): number {
    switch (key) {
        case 'settlements':
            return world.allSettlements.length;
        case 'clans':
            return world.allClans.length;
        case 'people':
            return world.totalPopulation;
        case 'foodProduction': {
            const people = world.totalPopulation;
            if (people <= 0) return 0;
            return sumFun(world.allClans, (c) => c.production.totalFood()) / people;
        }
        case 'foodConsumption': {
            const people = world.totalPopulation;
            if (people <= 0) return 0;
            return sumFun(world.allClans, (c) => c.consumption.totalFood) / people;
        }
    }
}

function frameFor(year: number, worlds: World[]): YearFrame {
    const summaries = {} as Record<MetricKey, Summary>;
    for (const key of METRIC_KEYS) {
        summaries[key] = summarize(year, worlds.map((w) => sample(w, key)));
    }
    return { year, summaries };
}

export async function runTuningBatch(
    config: BatchConfig,
    params: TuningParams,
    control: BatchControl,
    callbacks: BatchCallbacks,
): Promise<'done' | 'stopped'> {
    // Hundreds of turns of console output is slow and useless. The main-thread
    // fallback shares these globals with the live world, so put both back.
    const wasLogging = loggingEnabled();
    const previousTuning = readTuning();
    setLoggingEnabled(false);
    applyTuning(params);

    try {
        const worlds: World[] = [];
        // A run whose population dies out stops advancing but keeps
        // contributing its (zero) values, so the averages stay honest.
        const alive: boolean[] = [];

        for (let i = 0; i < config.runs; i++) {
            if (control.shouldStop()) return 'stopped';
            const world = new World({
                settlementCount: config.settlementCount,
                clansPerSettlement: config.clansPerSettlement,
                headless: true,
            });
            world.initialize();
            worlds.push(world);
            alive.push(true);
            callbacks.onSetupProgress?.(i + 1, config.runs);
            await yieldToEventLoop();
        }

        let pending: YearFrame[] = [frameFor(0, worlds)];
        let sliceStart = Date.now();

        const flush = (yearsDone: number) => {
            if (!pending.length) return;
            callbacks.onFrames(pending, yearsDone, alive.filter(Boolean).length);
            pending = [];
        };

        for (let year = 1; year <= config.years; year++) {
            for (let i = 0; i < worlds.length; i++) {
                if (!alive[i]) continue;
                worlds[i].advanceHeadless();
                if (worlds[i].totalPopulation <= 0) alive[i] = false;
            }
            pending.push(frameFor(year, worlds));

            if (Date.now() - sliceStart >= SLICE_MS) {
                flush(year);
                await yieldToEventLoop();
                sliceStart = Date.now();
            }

            while (control.shouldPause() && !control.shouldStop()) {
                flush(year);
                await new Promise((resolve) => setTimeout(resolve, 60));
                sliceStart = Date.now();
            }
            if (control.shouldStop()) {
                flush(year);
                return 'stopped';
            }

            // Nothing left to simulate.
            if (!alive.some(Boolean)) {
                flush(year);
                return 'done';
            }
        }

        flush(config.years);
        return 'done';
    } finally {
        setLoggingEnabled(wasLogging);
        applyTuning(previousTuning);
    }
}
