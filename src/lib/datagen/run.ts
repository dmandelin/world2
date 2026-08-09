// The generation run itself, shared by the worker and the main-thread
// fallback. Yields control back to the caller between years so that
// progress can be reported (and, on the main thread, so the UI can breathe).

import { RecordingSession, type GenerationParams } from "../../model/data/sessions";
import { loggingEnabled, setLoggingEnabled } from "../../model/lib/debug";
import { World } from "../../model/world";

export function* runGeneration(
    name: string,
    params: GenerationParams,
): Generator<number, RecordingSession, void> {
    // Hundreds of turns of console output is slow and useless. Restore the
    // previous setting on the way out, since the main-thread fallback shares
    // this module with the live world.
    const wasLogging = loggingEnabled();
    setLoggingEnabled(false);
    try {
        const session = new RecordingSession(name, 'generated', params);
        const world = new World({
            settlementCount: params.settlementCount,
            clansPerSettlement: params.clansPerSettlement,
            session,
            headless: true,
        });
        world.initialize();

        for (let year = 0; year < params.years; year++) {
            world.advanceHeadless();
            yield year + 1;
        }

        return session;
    } finally {
        setLoggingEnabled(wasLogging);
    }
}
