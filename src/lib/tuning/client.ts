// Client-side driver for tuning batch runs.
//
// Prefers a worker so the page stays responsive; falls back to a
// timer-chunked run on the main thread when one isn't available.

import type { TuningParams } from "../../model/tuning";
import { runTuningBatch } from "./run";
import type {
    BatchConfig,
    BatchRequest,
    BatchResponse,
    YearFrame,
} from "./protocol";

export type BatchHandlers = {
    onSetup(worldsReady: number, worldsTotal: number): void;
    onFrames(frames: YearFrame[], yearsDone: number, liveRuns: number): void;
    onDone(phase: 'done' | 'stopped', elapsedMs: number, onWorker: boolean): void;
    onError(message: string): void;
};

export interface BatchHandle {
    pause(): void;
    resume(): void;
    stop(): void;
    readonly onWorker: boolean;
}

export function startBatch(
    config: BatchConfig,
    tuning: TuningParams,
    handlers: BatchHandlers,
): BatchHandle {
    let worker: Worker | undefined;
    try {
        worker = new Worker(new URL('./tuning.worker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
        console.warn('Worker unavailable, tuning on the main thread:', e);
        return startOnMainThread(config, tuning, handlers);
    }

    const w = worker;
    let finished = false;

    w.onmessage = (event: MessageEvent<BatchResponse>) => {
        const message = event.data;
        if (message.type === 'setup') {
            handlers.onSetup(message.worldsReady, message.worldsTotal);
        } else if (message.type === 'progress') {
            handlers.onFrames(message.frames, message.yearsDone, message.liveRuns);
        } else if (message.type === 'done') {
            finished = true;
            w.terminate();
            handlers.onDone(message.phase, message.elapsedMs, true);
        } else {
            finished = true;
            w.terminate();
            handlers.onError(message.message);
        }
    };
    w.onerror = (event) => {
        finished = true;
        w.terminate();
        handlers.onError(event.message || 'Tuning worker failed');
    };

    const send = (request: BatchRequest) => {
        if (!finished) w.postMessage(request);
    };

    send({ type: 'start', config, tuning });

    return {
        onWorker: true,
        pause: () => send({ type: 'pause' }),
        resume: () => send({ type: 'resume' }),
        stop: () => send({ type: 'stop' }),
    };
}

function startOnMainThread(
    config: BatchConfig,
    tuning: TuningParams,
    handlers: BatchHandlers,
): BatchHandle {
    const startedAt = Date.now();
    let paused = false;
    let stopped = false;

    runTuningBatch(
        config,
        tuning,
        { shouldPause: () => paused, shouldStop: () => stopped },
        {
            onFrames: (frames, yearsDone, liveRuns) =>
                handlers.onFrames(frames, yearsDone, liveRuns),
            onSetupProgress: (ready, total) => handlers.onSetup(ready, total),
        },
    ).then(
        (phase) => handlers.onDone(phase, Date.now() - startedAt, false),
        (e) => handlers.onError(e instanceof Error ? e.message : String(e)),
    );

    return {
        onWorker: false,
        pause: () => { paused = true; },
        resume: () => { paused = false; },
        stop: () => { stopped = true; paused = false; },
    };
}
