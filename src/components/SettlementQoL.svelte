<script lang="ts">
    import type { SettlementDTO, ClanDTO } from "../model/records/dtos";
    import { signed } from "../model/lib/format";
    import Tooltip from "./Tooltip.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    let activeClans = $derived(settlement.clans.filter((c) => c.population > 0));

    // Expansion state
    let isOverallExpanded = $state(true);
    let expandedTags = $state({
        material: true,
        social: true,
        natural: true,
        personal: true
    });

    const categories = [
        {
            tag: "material",
            label: "Material",
            items: ["Food quantity", "Food quality"]
        },
        {
            tag: "social",
            label: "Social",
            items: ["Conversation", "Conflict", "Prestige"]
        },
        {
            tag: "natural",
            label: "Natural",
            items: ["Flood damage"]
        },
        {
            tag: "personal",
            label: "Personal",
            items: ["Leisure"]
        }
    ] as const;

    function expandAll() {
        isOverallExpanded = true;
        expandedTags = {
            material: true,
            social: true,
            natural: true,
            personal: true
        };
    }

    function collapseAll() {
        isOverallExpanded = false;
        expandedTags = {
            material: false,
            social: false,
            natural: false,
            personal: false
        };
    }

    function toggleTag(tag: keyof typeof expandedTags) {
        expandedTags[tag] = !expandedTags[tag];
    }
</script>

<style>
    .qol-container {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.5rem;
        margin-top: 1rem;
        font-family: inherit;
        display: inline-block;
        min-width: 650px;
        max-width: 100%;
    }

    .toolbar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
        justify-content: flex-end;
    }

    .btn {
        background: none;
        border: 1px solid #62531d;
        color: #62531d;
        border-radius: 3px;
        padding: 0.125rem 0.5rem;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        transition: background-color 0.2s;
    }

    .btn:hover {
        background-color: rgba(98, 83, 29, 0.1);
    }

    .toggle-btn {
        background: none;
        border: 1px solid #62531d;
        color: #62531d;
        cursor: pointer;
        padding: 0;
        border-radius: 3px;
        font-family: monospace;
        font-weight: bold;
        font-size: 0.75rem;
        margin-right: 0.5rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.1rem;
        height: 1.1rem;
        vertical-align: middle;
    }

    .toggle-btn:hover {
        background-color: rgba(98, 83, 29, 0.1);
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 0.25rem;
    }

    th, td {
        padding: 0.25rem 0.5rem;
        text-align: right;
        border-bottom: 1px solid rgba(98, 83, 29, 0.2);
    }

    th:first-child, td:first-child {
        text-align: left;
    }

    thead th {
        background-color: rgba(98, 83, 29, 0.1);
        font-weight: bold;
        border-bottom: 2px solid #62531d;
    }

    .row-root {
        font-weight: bold;
        background-color: rgba(98, 83, 29, 0.05);
    }

    .row-tag {
        font-weight: 600;
        background-color: rgba(98, 83, 29, 0.02);
    }

    .row-item {
        color: #333;
    }

    .indent-tag {
        padding-left: 1.5rem;
    }

    .indent-item {
        padding-left: 3rem;
    }

    .qol-val {
        font-family: monospace;
        font-size: 0.95rem;
    }

    .pos {
        color: #1b5e20;
    }

    .neg {
        color: #b71c1c;
    }

    tbody tr:hover {
        background-color: rgba(98, 83, 29, 0.05);
    }

    .tooltip-content-inner {
        font-size: 0.875rem;
        color: #333;
        white-space: nowrap;
    }
</style>

<div class="qol-container">
    <div class="toolbar">
        <button class="btn" onclick={expandAll}>Expand All</button>
        <button class="btn" onclick={collapseAll}>Collapse All</button>
    </div>

    <table>
        <thead>
            <tr>
                <th>Quality of Life</th>
                {#each activeClans as clan}
                    <th>{clan.name}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            <!-- Overall QoL Row -->
            <tr class="row-root">
                <td>
                    <button class="toggle-btn" onclick={() => isOverallExpanded = !isOverallExpanded}>
                        {isOverallExpanded ? "−" : "+"}
                    </button>
                    Overall QoL
                </td>
                {#each activeClans as clan}
                    {@const val = clan.qol.value}
                    <td class="qol-val" class:pos={val > 0} class:neg={val < 0}>
                        {signed(val, 1)}
                    </td>
                {/each}
            </tr>

            <!-- Expanded tags and items -->
            {#if isOverallExpanded}
                {#each categories as category}
                    {@const isTagExpanded = expandedTags[category.tag]}
                    <tr class="row-tag">
                        <td class="indent-tag">
                            <button class="toggle-btn" onclick={() => toggleTag(category.tag)}>
                                {isTagExpanded ? "−" : "+"}
                            </button>
                            {category.label}
                        </td>
                        {#each activeClans as clan}
                            {@const val = clan.qol.valueFrom(category.tag)}
                            <td class="qol-val" class:pos={val > 0} class:neg={val < 0}>
                                {signed(val, 1)}
                            </td>
                        {/each}
                    </tr>

                    {#if isTagExpanded}
                        {#each category.items as item}
                            <tr class="row-item">
                                <td class="indent-item">
                                    {item}
                                </td>
                                {#each activeClans as clan}
                                    {@const qolItem = clan.qol.m.get(item)}
                                    {@const val = qolItem?.value ?? 0}
                                    <td class="qol-val" class:pos={val > 0} class:neg={val < 0}>
                                        {#if qolItem}
                                            <Tooltip>
                                                <span>{signed(val, 1)}</span>
                                                <div slot="tooltip" class="tooltip-content-inner">
                                                    {qolItem.explanation}
                                                </div>
                                            </Tooltip>
                                        {:else}
                                            0.0
                                        {/if}
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    {/if}
                {/each}
            {/if}
        </tbody>
    </table>
</div>
