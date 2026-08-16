// Background thread for tuning batch runs.
//
// The run loop hands the event loop back every few dozen milliseconds, which
// is what lets pause and stop arrive mid-run.

import { runTuningBatch } from "./run";
import type { BatchRequest, BatchResponse } from "./protocol";

function post(message: BatchResponse) {
    (self as unknown as Worker).postMessage(message);
}

let paused = false;
let stopped = false;
let running = false;

self.onmessage = async (event: MessageEvent<BatchRequest>) => {
    const message = event.data;

    if (message.type === 'pause') { paused = true; return; }
    if (message.type === 'resume') { paused = false; return; }
    if (message.type === 'stop') { stopped = true; paused = false; return; }
    if (message.type !== 'start' || running) return;

    running = true;
    paused = false;
    stopped = false;
    const startedAt = Date.now();

    try {
        const phase = await runTuningBatch(
            message.config,
            message.tuning,
            { shouldPause: () => paused, shouldStop: () => stopped },
            {
                onFrames: (frames, yearsDone, liveRuns) => {
                    post({
                        type: 'progress',
                        yearsDone,
                        yearsTotal: message.config.years,
                        liveRuns,
                        frames,
                    });
                },
                onSetupProgress: (worldsReady, worldsTotal) => {
                    post({ type: 'setup', worldsReady, worldsTotal });
                },
            },
        );
        post({ type: 'done', phase, elapsedMs: Date.now() - startedAt });
    } catch (e) {
        post({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
        running = false;
    }
};
