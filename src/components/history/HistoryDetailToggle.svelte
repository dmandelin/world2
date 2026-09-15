<script lang="ts">
    // Picks how much the History views show. See historydetail.svelte.ts.
    import { HISTORY_DETAILS, historyDetailState } from "./historydetail.svelte";
</script>

<div class="toggle" role="group" aria-label="History detail level">
    <span class="label">Detail</span>
    {#each HISTORY_DETAILS as d (d.key)}
        <button
            type="button"
            class:on={historyDetailState.level === d.key}
            title={d.hint}
            onclick={() => (historyDetailState.level = d.key)}>{d.label}</button
        >
    {/each}
</div>

<style>
    .toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background-color: #f3edd8;
        padding: 0.2rem;
        border-radius: 4px;
    }

    .label {
        font-size: 0.75rem;
        color: #6b7280;
        padding: 0 0.3rem;
    }

    button {
        font: inherit;
        font-size: 0.82rem;
        border: 1px solid transparent;
        background: none;
        border-radius: 3px;
        padding: 0.1rem 0.6rem;
        cursor: pointer;
        color: #4b5563;
    }

    button:hover {
        color: #7c2d12;
    }

    button.on {
        background: #fbfaf5;
        border-color: #ddd6c0;
        color: #1f2328;
        font-weight: 600;
    }
</style>
