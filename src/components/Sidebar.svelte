<script lang="ts">
    import { BREAKPOINTS } from "../model/records/breakpoints";
    import {
        armedBreakpoints,
        breakpointState,
        toggleBreakpoint,
    } from "./state/uistate.svelte";

    let { world } = $props();

    function advance(years?: number) {
        world.advanceFromPlanningView(years, armedBreakpoints());
    }

    // Only meaningful after a run that could have been cut short.
    let lastBreak = $derived(world.lastBreak);
</script>

<div class="sidebar">
    <button id="advance" class="clay-edge" onclick={() => advance()}
        >{world.year} ▶</button
    >
    <div class="sub-advance-buttons">
        <button class="sub-advance clay-edge" onclick={() => advance(5)}>+5</button>
        <button class="sub-advance clay-edge" onclick={() => advance(10)}>+10</button>
        <button class="sub-advance clay-edge" onclick={() => advance(20)}>+20</button>
    </div>

    <div class="breaks clay-edge">
        <div class="breaks-label">Halt On</div>
        <div class="lamps">
            {#each BREAKPOINTS as def (def.id)}
                <button
                    class="lamp"
                    class:lit={breakpointState[def.id]}
                    title="{def.label} — {def.description}"
                    aria-pressed={breakpointState[def.id]}
                    onclick={() => toggleBreakpoint(def.id)}>{def.icon}</button
                >
            {/each}
        </div>
        <!-- Only there when it has something to say: an empty display is
             just a dark band under the lamps. -->
        {#if lastBreak}
            <div class="readout" title="{lastBreak.year} · {lastBreak.what}">
                {lastBreak.year} · {lastBreak.what}
            </div>
        {/if}
    </div>
</div>

<style>
    .sidebar {
        position: fixed;
        /* Level with the map and the folder tab, which start at the body inset. */
        top: 8px;
        /* Clear of the main panel's clay border, which the instrument panel
           below the buttons otherwise sits right on top of. */
        right: 1.75em;
        background-color: transparent;
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    #advance {
        width: 150px;
        height: 50px;
        margin-bottom: 6px;
        font-size: 20px;

        background-color: #4f6b45;
        color: #f3edd8;
        cursor: pointer;
    }

    #advance:hover, .sub-advance:hover {
        background-color: #5f7d54;
    }

    .sub-advance-buttons {
        display: flex;
        gap: 6px;
        width: 150px;
        justify-content: space-between;
    }

    .sub-advance {
        flex: 1;
        height: 28px;
        font-size: 13px;
        font-weight: bold;
        background-color: #4f6b45;
        color: #f3edd8;
        cursor: pointer;
    }

    /* A little instrument panel: a row of lamps you arm, and a readout that
       says what tripped them. */
    .breaks {
        width: 150px;
        margin-top: 6px;
        padding: 4px 5px 5px;
        box-sizing: border-box;
        background-color: #2f3b2a;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .breaks-label {
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #8fa383;
        line-height: 1;
    }

    .lamps {
        display: flex;
        gap: 3px;
    }

    .lamp {
        flex: 1;
        height: 22px;
        padding: 0;
        border: 1px solid #1d2619;
        border-radius: 2px;
        background-color: #232d1f;
        font-size: 11px;
        line-height: 1;
        cursor: pointer;
        /* Unlit lamps are dark and colorless; armed ones come up amber. */
        filter: grayscale(1) brightness(0.55);
        transition: filter 0.12s, background-color 0.12s, box-shadow 0.12s;
    }

    .lamp:hover {
        filter: grayscale(0.4) brightness(0.9);
    }

    .lamp.lit {
        background-color: #6b5a1c;
        border-color: #c9a227;
        box-shadow: 0 0 4px rgba(201, 162, 39, 0.7) inset;
        filter: none;
    }

    .readout {
        padding: 2px 3px;
        border: 1px solid #1d2619;
        border-radius: 2px;
        background-color: #10160d;
        font-family: "Courier New", monospace;
        font-size: 9px;
        line-height: 1.3;
        color: #d8b84a;
        text-shadow: 0 0 4px rgba(216, 184, 74, 0.5);
        /* Two lines is enough for almost everything; the title has the rest. */
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        overflow: hidden;
        overflow-wrap: break-word;
    }
</style>
