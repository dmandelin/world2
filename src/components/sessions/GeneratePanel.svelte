<script lang="ts">
    import { generateSession, type GenerationResult } from "../../lib/datagen/generate";

    let { onGenerated }: { onGenerated: (result: GenerationResult) => void } =
        $props();

    let settlementCount = $state(3);
    let clansPerSettlement = $state(5);
    let years = $state(500);
    let sessionName = $state("");

    let running = $state(false);
    let yearsDone = $state(0);
    let error = $state<string | undefined>(undefined);
    let summary = $state<string[] | undefined>(undefined);

    function defaultName() {
        const stamp = new Date().toLocaleString();
        return `${settlementCount}x${clansPerSettlement}, ${years}y — ${stamp}`;
    }

    async function generate() {
        running = true;
        error = undefined;
        summary = undefined;
        yearsDone = 0;

        try {
            const result = await generateSession(
                sessionName.trim() || defaultName(),
                { settlementCount, clansPerSettlement, years },
                (done) => {
                    yearsDone = done;
                },
            );

            const streams = [...result.session.streams.values()];
            summary = [
                `Generated in ${(result.elapsedMs / 1000).toFixed(1)}s ` +
                    `on ${result.onWorker ? "a background thread" : "the main thread"}.`,
                ...streams.map(
                    (s) =>
                        `${s.rowCount.toLocaleString()} ${s.entityType} snapshots ` +
                        `across ${s.entityCount.toLocaleString()} ${s.entityType}s`,
                ),
            ];
            sessionName = "";
            onGenerated(result);
        } catch (e) {
            error = e instanceof Error ? e.message : String(e);
        } finally {
            running = false;
        }
    }
</script>

<div class="panel">
    <h2>New session</h2>

    <div class="field">
        <label for="settlements">Initial settlements</label>
        <input
            id="settlements"
            type="number"
            min="1"
            max="50"
            bind:value={settlementCount}
            disabled={running}
        />
    </div>

    <div class="field">
        <label for="clans">Initial clans per settlement</label>
        <input
            id="clans"
            type="number"
            min="1"
            max="50"
            bind:value={clansPerSettlement}
            disabled={running}
        />
    </div>

    <div class="field">
        <label for="years">Years to run</label>
        <input
            id="years"
            type="number"
            min="1"
            max="10000"
            bind:value={years}
            disabled={running}
        />
    </div>

    <div class="field">
        <label for="name">Session name (optional)</label>
        <input
            id="name"
            type="text"
            placeholder={defaultName()}
            bind:value={sessionName}
            disabled={running}
        />
    </div>

    <button class="generate" onclick={generate} disabled={running}>
        {running ? "Generating…" : "Generate"}
    </button>

    {#if running}
        <div class="progress">
            <div
                class="bar"
                style="width: {years > 0
                    ? Math.round((100 * yearsDone) / years)
                    : 0}%"
            ></div>
        </div>
        <div class="progress-label">{yearsDone} / {years} years</div>
    {/if}

    {#if error}
        <div class="error">Generation failed: {error}</div>
    {/if}

    {#if summary}
        <div class="summary">
            <div class="summary-title">Done</div>
            {#each summary as line}
                <div>{line}</div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .panel {
        max-width: 32rem;
    }

    h2 {
        margin-top: 0;
    }

    .field {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.6rem;
    }

    label {
        color: #62531d;
    }

    input {
        width: 14rem;
        padding: 0.25rem 0.4rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #fffdf6;
        color: #2c250d;
        font: inherit;
    }

    input[type="number"] {
        width: 6rem;
    }

    .generate {
        margin-top: 0.75rem;
        padding: 0.4rem 1.2rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #f0ebd1;
        color: #2c250d;
        font: inherit;
        font-weight: bold;
        cursor: pointer;
    }

    .generate:hover:not(:disabled) {
        background-color: #e6dfba;
    }

    .generate:disabled {
        opacity: 0.6;
        cursor: default;
    }

    .progress {
        margin-top: 0.75rem;
        height: 10px;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #fffdf6;
        overflow: hidden;
    }

    .bar {
        height: 100%;
        background-color: #62531d;
        transition: width 0.15s linear;
    }

    .progress-label {
        margin-top: 0.25rem;
        font-size: 0.85rem;
        color: #62531d;
    }

    .error {
        margin-top: 0.75rem;
        color: #a02020;
    }

    .summary {
        margin-top: 1rem;
        padding: 0.6rem 0.8rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #f0ebd1;
    }

    .summary-title {
        font-weight: bold;
        margin-bottom: 0.25rem;
    }
</style>
