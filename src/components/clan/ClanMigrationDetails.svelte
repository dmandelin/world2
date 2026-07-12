<script lang="ts">
    import { sortedByKey } from "../../model/lib/basics";
    import { signed } from "../../model/lib/format";
    import { NewSettlement } from "../../model/people/migration";
    import TableView2 from "../tables/TableView2.svelte";
    import type { TableColumn, TableRow } from "../tables/tables2";
    import type { ClanDTO } from "../../model/records/dtos";

    let { clan, compact = false }: { clan: ClanDTO; compact?: boolean } = $props();
    let plan = $derived(clan.migrationPlan);

    let candidates = $derived(plan ? Array.from(plan.targets.values()) : []);

    function getTargetName(candidate: any): string {
        if (candidate.target === NewSettlement) {
            return "(New)";
        }
        if (candidate.target === candidate.clan.settlement) {
            return "(Here)";
        }
        return candidate.target.name;
    }

    let sortedCandidates = $derived(
        sortedByKey(candidates, (c) => getTargetName(c)),
    );

    let columnSet = $derived.by(() => {
        const set = new Set<string>();
        for (const candidate of candidates) {
            for (const item of candidate.items) {
                set.add(item.name);
            }
        }
        return Array.from(set).sort();
    });

    let table = $derived.by(() => {
        if (!plan) return undefined;

        const columns: TableColumn<any, any, any>[] = [
            {
                data: "eligibility",
                label: "?",
                valueFn: (c: any) => (c.isEligible ? "" : "X"),
            },
            {
                data: "appeal",
                label: "A",
                valueFn: (c: any) => c.value,
                formatFn: (val: number) => signed(val, 1),
            },
        ];

        for (const colName of columnSet) {
            columns.push({
                data: colName,
                label: colName,
                valueFn: (c: any) =>
                    c.items.find((i: any) => i.name === colName)?.value,
                formatFn: (val: number | undefined) =>
                    val !== undefined ? signed(val, 0) : "",
            });
        }

        const rows: TableRow<any, any>[] = sortedCandidates.map(
            (candidate) => ({
                data: candidate,
                label: getTargetName(candidate),
                bold: candidate.target === candidate.clan.settlement,
            }),
        );

        return {
            columns,
            rows,
        };
    });
</script>

<div class="clan-migration-container" class:compact={compact}>
    {#if compact}
        <!-- Compact Tooltip Layout -->
        <div class="compact-section compact-traits">
            <strong>Traits:</strong>
            {#each clan.traits as trait, i}
                <span class="compact-trait">{trait}</span>{i < clan.traits.length - 1 ? ', ' : ''}
            {:else}
                <span class="text-gray">None</span>
            {/each}
        </div>

        {#if plan}
            <div class="compact-section compact-trigger">
                <strong>Trigger:</strong>
                {#if plan.wantToMove}
                    <span class="text-orange font-bold">CONSIDERING MOVING</span> <span class="text-gray">({plan.wantToMoveReason})</span>
                {:else}
                    <span class="text-gray font-bold">STAYING PUT</span> <span class="text-gray">({plan.wantToMoveReason || 'Content'})</span>
                {/if}
            </div>

            <div class="compact-table-section" class:ghosted={!plan.wantToMove}>
                {#if table && table.rows.length > 0}
                    <div class="table-wrapper">
                        <TableView2 {table} />
                    </div>
                {/if}
            </div>

            {#if plan.wantToMove}
                <div class="compact-section compact-outcome">
                    <strong>Decision:</strong>
                    Roll: <span class="font-mono">{(plan.softmaxSelection?.roll ?? 0).toFixed(3)}</span> |
                    Choice: <strong class="text-green">{plan.best?.target.name ?? 'None'}</strong> |
                    {#if plan.willMigrate}
                        <span class="outcome-pill will">Will Migrate</span>
                    {:else}
                        <span class="outcome-pill wont">Won't Migrate</span>
                        {#if plan.othersLeftFirst} <span class="subtext">(others left first)</span>{/if}
                    {/if}
                </div>
            {/if}
        {/if}
    {:else}
        <!-- Clan Traits Header -->
        <div class="traits-header">
            <span class="traits-title">Clan Traits:</span>
            <div class="traits-list">
                {#each clan.traits as trait}
                    <span class="trait-badge">{trait}</span>
                {/each}
            </div>
        </div>

        {#if plan}
            <!-- Step 1: Decision Trigger -->
            <div class="decision-step trigger-card" class:active={plan.wantToMove}>
                <div class="step-header">
                    <span class="step-num">1</span>
                    <h3>Migration Trigger</h3>
                </div>
                <div class="trigger-status">
                    {#if plan.wantToMove}
                        <div class="status-indicator active">
                            <span class="status-dot"></span>
                            <div class="status-details">
                                <span class="status-title">CONSIDERING MOVING</span>
                                <span class="status-desc"
                                    >Triggered due to: <strong>{plan.wantToMoveReason}</strong
                                    ></span
                                >
                            </div>
                        </div>
                    {:else}
                        <div class="status-indicator inactive">
                            <span class="status-dot"></span>
                            <div class="status-details">
                                <span class="status-title">STAYING PUT</span>
                                <span class="status-desc"
                                    >Content with current location. (Factor: {plan.wantToMoveReason ||
                                        "None"})</span
                                >
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Step 2: Appeal Assessment -->
            <div class="decision-step appeal-card" class:ghosted={!plan.wantToMove}>
                <div class="step-header">
                    <span class="step-num">2</span>
                    <h3>Appeal Assessment</h3>
                    {#if !plan.wantToMove}
                        <span class="ghost-badge">Speculative values only</span>
                    {/if}
                </div>
                <p class="section-desc">
                    The clan's assessment of how appealing other places would be to
                    live in:
                </p>
                {#if table && table.rows.length > 0}
                    <div class="table-wrapper">
                        <TableView2 {table} />
                    </div>
                {/if}
            </div>

            <!-- Step 3: Roll & Choice (Only shows if wantToMove is true) -->
            {#if plan.wantToMove}
                <div class="decision-step outcome-card">
                    <div class="step-header">
                        <span class="step-num">3</span>
                        <h3>Choice &amp; Roll</h3>
                    </div>
                    <div class="outcome-grid">
                        <div class="outcome-metric">
                            <span class="metric-label">Decision Roll</span>
                            <span class="metric-value"
                                >{(plan.softmaxSelection?.roll ?? 0).toFixed(
                                    3,
                                )}</span
                            >
                        </div>
                        <div class="outcome-metric">
                            <span class="metric-label">Best Choice</span>
                            <span class="metric-value highlight"
                                >{plan.best?.target.name ?? "None"}</span
                            >
                        </div>
                    </div>

                    <div
                        class="outcome-banner"
                        class:will-migrate={plan.willMigrate}
                    >
                        {#if plan.willMigrate}
                            <div class="banner-content">
                                <span class="banner-icon">🚀</span>
                                <div>
                                    <strong>Will Migrate</strong> to
                                    <span class="dest-name"
                                        >{plan.best?.target.name}</span
                                    >
                                </div>
                            </div>
                        {:else}
                            <div class="banner-content">
                                <span class="banner-icon">📍</span>
                                <div>
                                    <strong>Will Not Migrate</strong>
                                    {#if plan.othersLeftFirst}
                                        <span class="subtext"
                                            >(others left first)</span
                                        >
                                    {/if}
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            {/if}
        {/if}
    {/if}
</div>

<style>
    .clan-migration-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        font-family: inherit;
        color: #2d3748;
    }

    /* Traits Header */
    .traits-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background-color: #f2ebd5;
        padding: 0.5rem 1rem;
        border-radius: 8px;
        border: 1px solid #d2cbb5;
    }

    .traits-title {
        font-weight: 600;
        font-size: 0.85rem;
        color: #62531d;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .traits-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }

    .trait-badge {
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        background-color: #ebf8ff;
        color: #2b6cb0;
        border: 1px solid #bee3f8;
    }

    /* Decision Steps Common */
    .decision-step {
        background: #fdfcf7;
        border: 1px solid #dcd7bd;
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 1px 3px rgba(98, 83, 29, 0.05);
        transition: all 0.2s ease;
    }

    .step-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        border-bottom: 1px solid #e9e4cd;
        padding-bottom: 0.5rem;
    }

    .step-num {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background-color: #3182ce;
        color: #ffffff;
        font-size: 0.85rem;
        font-weight: bold;
    }

    .step-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #2d3748;
    }

    .section-desc {
        font-size: 0.875rem;
        color: #718096;
        margin: 0 0 0.75rem 0;
    }

    /* Step 1: Trigger Card */
    .trigger-card {
        border-left: 4px solid #cbd5e0;
    }

    .trigger-card.active {
        border-left-color: #dd6b20;
        background-color: #fff9e6;
    }

    .status-indicator {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.5rem 0;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-top: 5px;
        flex-shrink: 0;
    }

    .status-indicator.active .status-dot {
        background-color: #dd6b20;
        box-shadow: 0 0 0 3px rgba(221, 107, 32, 0.3);
    }

    .status-indicator.inactive .status-dot {
        background-color: #4a5568;
    }

    .status-details {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .status-title {
        font-size: 0.75rem;
        font-weight: bold;
        letter-spacing: 0.05em;
    }

    .status-indicator.active .status-title {
        color: #dd6b20;
    }

    .status-indicator.inactive .status-title {
        color: #4a5568;
    }

    .status-desc {
        font-size: 0.9rem;
        color: #4a5568;
    }

    /* Step 2: Appeal Card & Ghosting */
    .appeal-card {
        border-left: 4px solid #3182ce;
        position: relative;
    }

    .appeal-card.ghosted {
        border-left-color: #a0aec0;
        opacity: 0.55;
        filter: grayscale(60%);
        pointer-events: none;
    }

    .ghost-badge {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        background-color: #ede7cf;
        color: #62531d;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        margin-left: auto;
    }

    .table-wrapper {
        background: #f6f1db;
        border-radius: 8px;
        border: 1px solid #e3deca;
        padding: 0.5rem;
        overflow-x: auto;
    }

    /* Step 3: Outcome Card */
    .outcome-card {
        border-left: 4px solid #38a169;
        background-color: #f0fff4;
    }

    .outcome-grid {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1rem;
    }

    .outcome-metric {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        background: #fdfcf7;
        border: 1px solid #dcd7bd;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        flex: 1;
        box-shadow: inset 0 1px 2px rgba(98, 83, 29, 0.02);
    }

    .metric-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .metric-value {
        font-size: 1.25rem;
        font-weight: bold;
        color: #2d3748;
    }

    .metric-value.highlight {
        color: #38a169;
    }

    .outcome-banner {
        background-color: #f4edd4;
        border: 1px solid #e4ddc3;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
    }

    .outcome-banner.will-migrate {
        background-color: #c6f6d5;
        border-color: #98e6b1;
        color: #22543d;
    }

    .banner-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.95rem;
    }

    .banner-icon {
        font-size: 1.25rem;
    }

    .dest-name {
        font-weight: bold;
        text-decoration: underline;
    }

    .subtext {
        font-size: 0.85rem;
        color: #4a5568;
        font-style: italic;
    }

    /* Compact styles */
    .clan-migration-container.compact {
        gap: 0.4rem;
        font-size: 0.8rem;
        padding: 0.2rem;
        line-height: 1.25;
    }

    .clan-migration-container.compact .compact-section {
        padding: 0.2rem 0;
        border-bottom: 1px solid #e9e4cd;
    }

    .clan-migration-container.compact .compact-section:last-child {
        border-bottom: none;
    }

    .clan-migration-container.compact .compact-trait {
        font-weight: 500;
        color: #2b6cb0;
    }

    .clan-migration-container.compact .table-wrapper {
        padding: 0.15rem;
        margin: 0.2rem 0;
        background-color: #f6f1db;
        border: 1px solid #e3deca;
        border-radius: 4px;
    }

    .clan-migration-container.compact :global(table) {
        font-size: 0.78rem;
        width: 100%;
    }

    .clan-migration-container.compact :global(td),
    .clan-migration-container.compact :global(th) {
        padding: 0.1em 0.3em;
    }

    .compact-table-section.ghosted {
        opacity: 0.55;
        filter: grayscale(60%);
        pointer-events: none;
    }

    .outcome-pill {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: bold;
        padding: 0.05rem 0.3rem;
        border-radius: 4px;
        text-transform: uppercase;
    }

    .outcome-pill.will {
        background-color: #c6f6d5;
        color: #22543d;
    }

    .outcome-pill.wont {
        background-color: #f4edd4;
        color: #62531d;
    }

    .font-mono {
        font-family: monospace;
    }

    .text-orange {
        color: #dd6b20;
    }

    .text-gray {
        color: #718096;
    }

    .text-green {
        color: #38a169;
    }

    .font-bold {
        font-weight: bold;
    }
</style>
