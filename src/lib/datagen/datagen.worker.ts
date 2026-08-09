// Background thread for simulation data generation.

import { serializeSession } from "../../model/data/sessions";
import { runGeneration } from "./run";
import type { GenerateRequest, GenerateResponse } from "./protocol";

function post(message: GenerateResponse) {
    (self as unknown as Worker).postMessage(message);
}

self.onmessage = (event: MessageEvent<GenerateRequest>) => {
    const { name, params } = event.data;
    const startedAt = Date.now();

    try {
        // Report roughly 100 times over the run, and at least every year
        // for short runs.
        const reportEvery = Math.max(1, Math.floor(params.years / 100));

        const run = runGeneration(name, params);
        let step = run.next();
        while (!step.done) {
            const yearsDone = step.value;
            if (yearsDone % reportEvery === 0 || yearsDone === params.years) {
                post({ type: 'progress', yearsDone, yearsTotal: params.years });
            }
            step = run.next();
        }

        post({
            type: 'done',
            session: serializeSession(step.value),
            elapsedMs: Date.now() - startedAt,
        });
    } catch (e) {
        post({ type: 'error', message: e instanceof Error ? e.message : String(e) });
    }
};
