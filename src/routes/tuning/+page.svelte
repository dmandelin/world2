<script lang="ts">
    import RunChart from "../../components/tuning/RunChart.svelte";
    import { startBatch, type BatchHandle } from "../../lib/tuning/client";
    import {
        METRIC_SPECS,
        type BatchConfig,
        type BatchPhase,
        type MetricKey,
        type Summary,
        type YearFrame,
    } from "../../lib/tuning/protocol";
    import {
        DEFAULT_TUNING,
        TUNING_PARAM_SPECS,
        type TuningParams,
    } from "../../model/tuning";

    // ---- configuration ----

    // Modest by default: cost is runs x years, and a world-year runs on the
    // order of a tenth of a second once settlements have grown.
    let config = $state<BatchConfig>({
        runs: 5,
        settlementCount: 3,
        clansPerSettlement: 5,
        years: 150,
    });

    let params = $state<TuningParams>({ ...DEFAULT_TUNING });

    const CONFIG_FIELDS: {
        key: keyof BatchConfig;
        label: string;
        min: number;
        max: number;
    }[] = [
        { key: "runs", label: "Runs", min: 1, max: 200 },
        { key: "settlementCount", label: "Starting cities", min: 1, max: 50 },
        { key: "clansPerSettlement", label: "Clans / city", min: 1, max: 50 },
        { key: "years", label: "Turns (years)", min: 1, max: 5000 },
    ];

    const CHART_COLORS: Record<MetricKey, string> = {
        settlements: "#8b5cf6",
        clans: "#10b981",
        people: "#3b82f6",
        foodProduction: "#f59e0b",
        foodConsumption: "#ef4444",
    };

    // ---- run state ----

    let phase = $state<BatchPhase>("done");
    let handle: BatchHandle | undefined;
    let yearsDone = $state(0);
    let yearsTotal = $state(0);
    let liveRuns = $state(0);
    let worldsReady = $state(0);
    let elapsedMs = $state(0);
    let onWorker = $state(true);
    let error = $state<string | undefined>(undefined);

    // Per-metric time series, appended to as frames arrive.
    let series = $state<Record<MetricKey, Summary[]>>(emptySeries());

    function emptySeries(): Record<MetricKey, Summary[]> {
        const out = {} as Record<MetricKey, Summary[]>;
        for (const spec of METRIC_SPECS) out[spec.key] = [];
        return out;
    }

    let active = $derived(phase === "setup" || phase === "running" || phase === "paused");
    let progressPct = $derived(
        yearsTotal > 0 ? Math.min(100, (yearsDone / yearsTotal) * 100) : 0,
    );

    function applyFrames(frames: YearFrame[]) {
        if (!frames.length) return;
        // One push per metric per batch of frames. Appending in place keeps
        // this linear in the frames arriving rather than in history so far.
        for (const spec of METRIC_SPECS) {
            series[spec.key].push(...frames.map((f) => f.summaries[spec.key]));
        }
    }

    function start() {
        if (active) return;
        error = undefined;
        series = emptySeries();
        yearsDone = 0;
        yearsTotal = config.years;
        liveRuns = config.runs;
        worldsReady = 0;
        elapsedMs = 0;
        phase = "setup";

        handle = startBatch({ ...config }, { ...params }, {
            onSetup: (ready) => {
                worldsReady = ready;
            },
            onFrames: (frames, done, live) => {
                if (phase === "setup") phase = "running";
                applyFrames(frames);
                yearsDone = done;
                liveRuns = live;
            },
            onDone: (result, ms, worker) => {
                phase = result;
                elapsedMs = ms;
                onWorker = worker;
                handle = undefined;
            },
            onError: (message) => {
                phase = "error";
                error = message;
                handle = undefined;
            },
        });
        onWorker = handle.onWorker;
    }

    function pause() {
        if (phase !== "running" && phase !== "setup") return;
        handle?.pause();
        phase = "paused";
    }

    function resume() {
        if (phase !== "paused") return;
        handle?.resume();
        phase = "running";
    }

    function stop() {
        if (!active) return;
        handle?.stop();
    }

    function resetParams() {
        params = { ...DEFAULT_TUNING };
    }

    let paramsChanged = $derived(
        TUNING_PARAM_SPECS.some((s) => params[s.key] !== DEFAULT_TUNING[s.key]),
    );

    let statusText = $derived.by(() => {
        switch (phase) {
            case "setup":
                return `Building worlds… ${worldsReady} / ${config.runs}`;
            case "running":
                return `${yearsDone} / ${yearsTotal} years · ${liveRuns} runs live`;
            case "paused":
                return `Paused at ${yearsDone} / ${yearsTotal} years`;
            case "stopped":
                return `Stopped at ${yearsDone} years · ${(elapsedMs / 1000).toFixed(1)}s`;
            case "error":
                return "Failed";
            default:
                return yearsDone > 0
                    ? `Finished ${yearsDone} years in ${(elapsedMs / 1000).toFixed(1)}s` +
                      ` on ${onWorker ? "a background thread" : "the main thread"}`
                    : "Idle";
        }
    });
</script>

<div class="page">
    <header>
        <a class="chip" href="/" title="Kalam -- The Land">𒌦</a>
        <a class="chip wide" href="/sessions">← Sessions</a>
        <h1>𒁄 Tuning</h1>
    </header>

    <section class="panel">
        <div class="panel-head">
            <h2>Tuning parameters</h2>
            <button
                class="linkish"
                onclick={resetParams}
                disabled={active || !paramsChanged}
            >
                Reset to defaults
            </button>
        </div>
        <div class="fields">
            {#each TUNING_PARAM_SPECS as spec}
                <label class="field">
                    <span class="label">{spec.label}</span>
                    <input
                        type="number"
                        step={spec.step}
                        min={spec.min}
                        max={spec.max}
                        bind:value={params[spec.key]}
                        disabled={active}
                    />
                    <span class="default" class:changed={params[spec.key] !== DEFAULT_TUNING[spec.key]}>
                        default {DEFAULT_TUNING[spec.key]}
                    </span>
                </label>
            {/each}
        </div>
    </section>

    <section class="panel">
        <div class="panel-head">
            <h2>Batch</h2>
        </div>
        <div class="fields">
            {#each CONFIG_FIELDS as field}
                <label class="field">
                    <span class="label">{field.label}</span>
                    <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        bind:value={config[field.key]}
                        disabled={active}
                    />
                </label>
            {/each}
        </div>

        <div class="controls">
            <button class="primary" onclick={start} disabled={active}>
                Start runs
            </button>
            {#if phase === "paused"}
                <button onclick={resume}>Resume</button>
            {:else}
                <button onclick={pause} disabled={!active}>Pause</button>
            {/if}
            <button onclick={stop} disabled={!active}>Stop</button>

            <span class="status">{statusText}</span>
        </div>

        {#if active || yearsDone > 0}
            <div class="progress" role="progressbar" aria-valuenow={progressPct}>
                <div class="bar" style="width: {progressPct}%"></div>
            </div>
        {/if}

        {#if error}
            <p class="error">{error}</p>
        {/if}
    </section>

    <section class="charts">
        {#each METRIC_SPECS as spec}
            <RunChart
                title={spec.label}
                points={series[spec.key]}
                precision={spec.precision}
                color={CHART_COLORS[spec.key]}
            />
        {/each}
    </section>

    <p class="legend-note">
        Shaded band spans min–max across runs; the darker band is the
        interquartile range and the dashed line the median, both shown once
        there are 5 or more runs. The solid line is the mean.
    </p>
</div>

<style>
    :global(body) {
        font-family: "PT Serif", Arial, sans-serif;
        background-color: #f9f6eb;
        color: #2c250d;
    }

    .page {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-width: 1400px;
    }

    header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    h1 {
        margin: 0;
        font-size: 1.4rem;
    }

    h2 {
        margin: 0;
        font-size: 1rem;
    }

    .chip {
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        height: 28px;
        min-width: 56px;
        padding: 0 0.5rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: rgba(249, 246, 235, 0.9);
        color: #62531d;
        font-size: 1.1rem;
        line-height: 1;
        text-decoration: none;
    }

    .chip.wide {
        font-size: 0.85rem;
        font-weight: bold;
    }

    .chip:hover {
        background-color: #f0ebd1;
    }

    .panel {
        border: 1px solid #d3c4ad;
        border-radius: 4px;
        background-color: #fffdf6;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .panel-head {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
    }

    .fields {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem 1.25rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        font-size: 0.8rem;
    }

    .field .label {
        color: #62531d;
    }

    .field input {
        width: 8rem;
        padding: 0.2rem 0.35rem;
        border: 1px solid #c9be92;
        border-radius: 3px;
        background-color: #fffdf6;
        color: inherit;
        font: inherit;
    }

    .field input:disabled {
        background-color: #f0ebd1;
        color: #6e5b47;
    }

    .default {
        font-size: 0.7rem;
        color: #a2946a;
    }

    .default.changed {
        color: #b45309;
        font-weight: bold;
    }

    .controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    button {
        padding: 0.3rem 0.7rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #f0ebd1;
        color: #2c250d;
        font: inherit;
        font-size: 0.85rem;
        cursor: pointer;
    }

    button:hover:not(:disabled) {
        background-color: #e6dfba;
    }

    button:disabled {
        opacity: 0.45;
        cursor: default;
    }

    button.primary {
        font-weight: bold;
    }

    button.linkish {
        border: none;
        background: none;
        padding: 0;
        font-size: 0.75rem;
        color: #62531d;
        text-decoration: underline;
    }

    button.linkish:hover:not(:disabled) {
        background: none;
        color: #2c250d;
    }

    .status {
        font-size: 0.8rem;
        color: #62531d;
    }

    .progress {
        height: 6px;
        border-radius: 3px;
        background-color: #f0ebd1;
        overflow: hidden;
    }

    .progress .bar {
        height: 100%;
        background-color: #62531d;
        transition: width 0.2s;
    }

    .error {
        margin: 0;
        color: #b30000;
        font-size: 0.85rem;
    }

    .charts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 0.75rem;
    }

    .legend-note {
        margin: 0;
        font-size: 0.75rem;
        color: #62531d;
    }
</style>
