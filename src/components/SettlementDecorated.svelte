<script lang="ts">
    import type { Alert } from "../model/records/alerts";
    import { SettlementDTO } from "../model/records/dtos";
    import AlertBadges from "./AlertBadges.svelte";
    import Settlement from "./Settlement.svelte";
    import ExtremeFloodIcon from "./widgets/ExtremeFloodIcon.svelte";
    import DitchGauge from "./widgets/DitchGauge.svelte";
    import FloodPictogram from "./widgets/FloodPictogram.svelte";
    import SettlementTellArt from "./overview/SettlementTellArt.svelte";
    import SettlementVitals from "./overview/SettlementVitals.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    // Alerts don't record a settlement, so match on the settlement itself plus
    // the clans living in it.
    let localUuids = $derived(
        new Set([settlement.uuid, ...settlement.clans.map((c) => c.uuid)]),
    );
    let isLocalAlert = $derived(
        (alert: Alert) => !!alert.entity && localUuids.has(alert.entity.uuid),
    );
</script>

<!-- The portrait heads the tab rail and the name heads the panel, so each
     column starts right under its own header instead of both waiting on the
     taller one. -->
{#snippet portrait()}
    <div class="icon-col">
        <SettlementTellArt {settlement} />
        <FloodPictogram floodLevel={settlement.floodLevel} />
        <DitchGauge {settlement} />
        {#if settlement.extremeFloods.length}
            <div class="flood-icons">
                {#each settlement.extremeFloods as flood, i (i)}
                    <ExtremeFloodIcon {flood} />
                {/each}
            </div>
        {/if}
    </div>
{/snippet}

{#snippet nameplate()}
    <div class="name-col">
        <div class="name-row">
            <h1 style="white-space: nowrap;">
            {settlement.name} |
            <img
                src="stat-population-256.png"
                alt="Population"
                width="40"
                height="40"
                style="padding-bottom: 4px;"
            />{settlement.population}
            </h1>
            <div class="header-alerts">
                <AlertBadges
                    world={settlement.world}
                    orientation="horizontal"
                    filter={isLocalAlert}
                />
            </div>
        </div>
        <SettlementVitals {settlement} />
    </div>
{/snippet}

<div id="top">
    <div class="folder-body clay-edge">
        <Settlement {settlement} railHead={portrait} contentHead={nameplate} />
    </div>
</div>

<style>
    /* The page flex gap already separates this column from the map. */
    #top {
        margin-left: 0;
    }

    h1 {
        margin: 0;
    }

    /* Single owner of the gutter around all tab content, so every panel opens
       the same distance from the folder edge. */
    .folder-body {
        padding: var(--clay-pad);
        background-color: #fdfbf2;
    }

    /* The settlement's own portrait: the tell it stands on, and below it
       how the waters ran this year. */
    .icon-col {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.15rem;
    }

    /* Usually one icon; a year that draws two floods wraps them. */
    .flood-icons {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.15rem;
        margin-top: 0.1rem;
    }

    .name-col {
        min-width: 0;
        margin-bottom: var(--clay-pad);
    }

    /* Badges sit past the population count, centred on it. */
    .name-row {
        display: flex;
        align-items: center;
        gap: 1.5em;
    }

    /* Three-quarter size here, where the badges are a secondary readout rather
       than the map's primary one. `zoom` (not `transform`) so the shrunk box is
       what the flex row lays out against. */
    .header-alerts {
        --shrink: 0.6;
        zoom: var(--shrink);
        position: relative;
        /* The h1's line box runs taller than its text because the population
           icon stretches it, so centring on the box sits visibly low. Lift to
           the text's optical centre, divided by the zoom since that scales
           this offset as well. */
        top: calc(-1.5px / var(--shrink));
    }

    img {
        vertical-align: middle;
    }
</style>
