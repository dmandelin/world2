<script lang="ts">
    import { onMount } from "svelte";
    import AnovaResults from "../../components/analysis/AnovaResults.svelte";
    import {
        describeColumns,
        isAnovaFailure,
        runAnova,
        type AnovaResult,
        type ColumnInfo,
    } from "../../model/analysis/anova";
    import {
        sessionStore,
        type RecordingSession,
    } from "../../model/data/sessions";

    let loaded = $state(false);
    let session = $state<RecordingSession | undefined>(undefined);

    let entityType = $state<string | undefined>(undefined);
    let output = $state<string | undefined>(undefined);
    let selectedInputs = $state<Set<string>>(new Set());

    let running = $state(false);
    let result = $state<AnovaResult | undefined>(undefined);
    let error = $state<string | undefined>(undefined);
    let elapsedMs = $state(0);

    const entityTypes = $derived(
        session ? [...session.streams.keys()] : [],
    );
    const stream = $derived(
        entityType ? session?.streams.get(entityType) : undefined,
    );
    const columns = $derived<ColumnInfo[]>(
        stream ? describeColumns(stream) : [],
    );
    const outputChoices = $derived(columns.filter((c) => c.eligibleOutput));
    const inputChoices = $derived(columns.filter((c) => c.name !== output));

    onMount(() => {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get("session") ?? undefined;
        const requestedEntity = params.get("entity") ?? undefined;

        import("../../model/worldinstance").then(() => {
            session = sessionId
                ? sessionStore.get(sessionId)
                : sessionStore.sessions[0];
            if (session) {
                const types = [...session.streams.keys()];
                entityType =
                    requestedEntity && types.includes(requestedEntity)
                        ? requestedEntity
                        : types[0];
                resetVariables();
            }
            loaded = true;
        });
    });

    // Default: first numeric column that isn't a bookkeeping coordinate, with
    // everything else usable as an input.
    function resetVariables() {
        const cols = stream ? describeColumns(stream) : [];
        const candidates = cols.filter(
            (c) => c.eligibleOutput && c.name !== "year",
        );
        output = (candidates[0] ?? cols.find((c) => c.eligibleOutput))?.name;
        selectAllInputs(cols);
    }

    function selectAllInputs(cols: ColumnInfo[] = columns) {
        selectedInputs = new Set(
            cols
                .filter((c) => c.eligibleInput && c.name !== output)
                .map((c) => c.name),
        );
    }

    function clearInputs() {
        selectedInputs = new Set();
    }

    function toggleInput(name: string) {
        const next = new Set(selectedInputs);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        selectedInputs = next;
    }

    function onEntityTypeChange() {
        result = undefined;
        error = undefined;
        resetVariables();
    }

    function onOutputChange() {
        result = undefined;
        error = undefined;
        const next = new Set(selectedInputs);
        if (output) next.delete(output);
        selectedInputs = next;
    }

    function run() {
        if (!stream || !output) return;
        running = true;
        result = undefined;
        error = undefined;

        // Let the button repaint before we tie up the thread.
        setTimeout(() => {
            const startedAt = performance.now();
            try {
                const r = runAnova(stream, output!, [...selectedInputs]);
                if (isAnovaFailure(r)) {
                    error = r.error;
                } else {
                    result = r;
                }
            } catch (e) {
                error = e instanceof Error ? e.message : String(e);
            } finally {
                elapsedMs = performance.now() - startedAt;
                running = false;
            }
        }, 0);
    }
</script>

<div class="page">
    <header>
        <a class="chip" href="/" title="Kalam -- The Land">𒌦</a>
        <a class="chip wide" href="/sessions">← Sessions</a>
        <h1>ANOVA{session ? ` — ${session.name}` : ""}</h1>
    </header>

    {#if !loaded}
        <p class="hint">Loading…</p>
    {:else if !session}
        <p class="hint">
            That session isn't loaded. Sessions live in memory, so a page
            reload clears them — <a href="/sessions">go back and pick one</a>.
        </p>
    {:else}
        <div class="controls">
            <div class="control">
                <label for="entity">Entity type</label>
                <select
                    id="entity"
                    bind:value={entityType}
                    onchange={onEntityTypeChange}
                >
                    {#each entityTypes as type}
                        <option value={type}>
                            {type} ({session.streams
                                .get(type)!
                                .rowCount.toLocaleString()} snapshots)
                        </option>
                    {/each}
                </select>
            </div>

            <div class="control">
                <label for="output">Output variable</label>
                <select id="output" bind:value={output} onchange={onOutputChange}>
                    {#each outputChoices as column}
                        <option value={column.name}>{column.name}</option>
                    {/each}
                </select>
            </div>

            <div class="control grow">
                <div class="input-header">
                    <span>Input variables ({selectedInputs.size} selected)</span>
                    <span>
                        <button class="link" onclick={() => selectAllInputs()}
                            >all</button
                        >
                        ·
                        <button class="link" onclick={clearInputs}>none</button>
                    </span>
                </div>
                <div class="input-list">
                    {#each inputChoices as column}
                        <label
                            class="input-item"
                            class:disabled={!column.eligibleInput}
                            title={column.eligibleInput
                                ? `${column.kind}`
                                : `unusable: ${column.note}`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedInputs.has(column.name)}
                                disabled={!column.eligibleInput}
                                onchange={() => toggleInput(column.name)}
                            />
                            <span class="input-name">{column.name}</span>
                            <span class="input-kind">
                                {#if !column.eligibleInput}
                                    {column.note}
                                {:else if column.kind === "categorical"}
                                    {column.levelCount} levels
                                {:else}
                                    numeric
                                {/if}
                            </span>
                        </label>
                    {/each}
                </div>
            </div>
        </div>

        <button
            class="run"
            onclick={run}
            disabled={running || !output || selectedInputs.size === 0}
        >
            {running ? "Analyzing…" : "Run ANOVA"}
        </button>

        {#if error}
            <p class="error">{error}</p>
        {/if}

        {#if result}
            <p class="timing">Computed in {(elapsedMs / 1000).toFixed(2)}s.</p>
            <AnovaResults {result} />
        {/if}
    {/if}
</div>

<style>
    :global(body) {
        font-family: "PT Serif", Arial, sans-serif;
        background-color: #f9f6eb;
        color: #2c250d;
    }

    .page {
        max-width: 72rem;
    }

    header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    h1 {
        font-size: 1.3rem;
        margin: 0;
    }

    .chip {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 28px;
        width: 56px;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: rgba(249, 246, 235, 0.9);
        color: #62531d;
        font-size: 1.1rem;
        line-height: 1;
        text-decoration: none;
        flex: none;
    }

    .chip.wide {
        width: auto;
        padding: 0 0.6rem;
        font-size: 0.85rem;
    }

    .chip:hover {
        background-color: #f0ebd1;
    }

    .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 1.5rem;
        margin-bottom: 1rem;
    }

    .control {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .control.grow {
        flex: 1;
        min-width: 22rem;
    }

    label {
        color: #62531d;
        font-size: 0.9rem;
    }

    select {
        padding: 0.25rem 0.4rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #fffdf6;
        color: #2c250d;
        font: inherit;
        min-width: 14rem;
    }

    .input-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        color: #62531d;
        font-size: 0.9rem;
    }

    .link {
        background: none;
        border: none;
        padding: 0;
        color: #62531d;
        font: inherit;
        text-decoration: underline;
        cursor: pointer;
    }

    .input-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
        gap: 0.1rem 0.8rem;
        max-height: 15rem;
        overflow-y: auto;
        padding: 0.4rem 0.5rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #fffdf6;
    }

    .input-item {
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
        font-size: 0.85rem;
        color: #2c250d;
    }

    .input-item.disabled {
        color: #a09a80;
    }

    .input-name {
        font-family: monospace;
    }

    .input-kind {
        margin-left: auto;
        font-size: 0.7rem;
        color: #8a7c4e;
        white-space: nowrap;
    }

    .run {
        padding: 0.4rem 1.2rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #f0ebd1;
        color: #2c250d;
        font: inherit;
        font-weight: bold;
        cursor: pointer;
    }

    .run:hover:not(:disabled) {
        background-color: #e6dfba;
    }

    .run:disabled {
        opacity: 0.6;
        cursor: default;
    }

    .error {
        color: #a02020;
    }

    .timing,
    .hint {
        color: #62531d;
    }
</style>
