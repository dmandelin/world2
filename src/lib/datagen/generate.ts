// Client-side entry point for data generation.
//
// Runs on a worker thread when the browser gives us one; otherwise falls
// back to a timer-chunked run on the main thread so the UI still responds.

import {
    deserializeSession,
    sessionStore,
    type GenerationParams,
    type RecordingSession,
} from "../../model/data/sessions";
import { runGeneration } from "./run";
import type { GenerateRequest, GenerateResponse } from "./protocol";

export type GenerationResult = {
    session: RecordingSession;
    elapsedMs: number;
    onWorker: boolean;
};

export type ProgressCallback = (yearsDone: number, yearsTotal: number) => void;

export function generateSession(
    name: string,
    params: GenerationParams,
    onProgress: ProgressCallback,
): Promise<GenerationResult> {
    let worker: Worker;
    try {
        worker = new Worker(new URL('./datagen.worker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
        console.warn('Worker unavailable, generating on the main thread:', e);
        return generateOnMainThread(name, params, onProgress);
    }

    return new Promise<GenerationResult>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<GenerateResponse>) => {
            const message = event.data;
            if (message.type === 'progress') {
                onProgress(message.yearsDone, message.yearsTotal);
            } else if (message.type === 'done') {
                worker.terminate();
                resolve({
                    session: sessionStore.add(deserializeSession(message.session)),
                    elapsedMs: message.elapsedMs,
                    onWorker: true,
                });
            } else {
                worker.terminate();
                reject(new Error(message.message));
            }
        };
        worker.onerror = (event) => {
            worker.terminate();
            reject(new Error(event.message || 'Data generation worker failed'));
        };

        const request: GenerateRequest = { name, params };
        worker.postMessage(request);
    });
}

// Fallback: advance in small slices, returning to the event loop between
// them so the page keeps painting.
function generateOnMainThread(
    name: string,
    params: GenerationParams,
    onProgress: ProgressCallback,
): Promise<GenerationResult> {
    const startedAt = Date.now();
    const run = runGeneration(name, params);

    return new Promise<GenerationResult>((resolve, reject) => {
        const sliceMs = 30;

        const step = () => {
            try {
                const sliceEnd = Date.now() + sliceMs;
                let current = run.next();
                while (!current.done && Date.now() < sliceEnd) {
                    current = run.next();
                }

                if (current.done) {
                    onProgress(params.years, params.years);
                    resolve({
                        session: sessionStore.add(current.value),
                        elapsedMs: Date.now() - startedAt,
                        onWorker: false,
                    });
                    return;
                }

                onProgress(current.value, params.years);
                setTimeout(step, 0);
            } catch (e) {
                run.return(undefined as never);
                reject(e instanceof Error ? e : new Error(String(e)));
            }
        };

        setTimeout(step, 0);
    });
}
