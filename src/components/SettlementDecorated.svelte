<script lang="ts">
    import type { Alert } from "../model/records/alerts";
    import { SettlementDTO } from "../model/records/dtos";
    import AlertBadges from "./AlertBadges.svelte";
    import Settlement from "./Settlement.svelte";
    import ExtremeFloodIcon from "./widgets/ExtremeFloodIcon.svelte";
    import FloodPictogram from "./widgets/FloodPictogram.svelte";
    import SettlementTellArt from "./overview/SettlementTellArt.svelte";
    import SettlementVitals from "./overview/SettlementVitals.svelte";
    import EntityLink from "./state/EntityLink.svelte";

    let {
        settlement,
        onSelect,
    }: { settlement: SettlementDTO; onSelect: (uuid: string) => void } =
        $props();

    // Alerts don't record a settlement, so match on the settlement itself plus
    // the clans living in it.
    let localUuids = $derived(
        new Set([settlement.uuid, ...settlement.clans.map((c) => c.uuid)]),
    );
    let isLocalAlert = $derived(
        (alert: Alert) => !!alert.entity && localUuids.has(alert.entity.uuid),
    );
</script>

<div id="top">
    <div class="header-row">
        <div class="main-col clay-edge">
            <div class="icon-col">
                <SettlementTellArt {settlement} />
                <FloodPictogram floodLevel={settlement.floodLevel} />
                {#if settlement.extremeFloods.length}
                    <div class="flood-icons">
                        {#each settlement.extremeFloods as flood, i (i)}
                            <ExtremeFloodIcon {flood} />
                        {/each}
                    </div>
                {/if}
            </div>
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
        </div>
        <div class="region-panel clay-edge">
            <div class="cluster-info">
                <EntityLink entity={settlement.cluster} /> Region ·
                <img
                    src="stat-population-256.png"
                    alt="Population"
                    width="16"
                    height="16"
                    style="padding-bottom: 2px;"
                />{settlement.cluster.population}
            </div>
            <div class="settlement-buttons">
                {#each settlement.cluster.settlements as s (s.uuid)}
                    <button
                        type="button"
                        class="clay-edge"
                        class:active={s.uuid === settlement.uuid}
                        onclick={() => onSelect(s.uuid)}
                    >
                        <span class="settlement-name">{s.name}</span>
                        <span class="pop">{s.population}</span>
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <div class="folder-body clay-edge">
        <Settlement {settlement} />
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

    .header-row {
        display: flex;
        gap: var(--clay-gap);
        align-items: flex-start;
    }

    /* Manila-folder effect: .main-col is the tab and .folder-body the folder.
       The tab drops its bottom border and overlaps the body's top edge, so the
       two outlines read as one continuous shape. The tab runs flush to the
       folder's left edge, so their left borders form one line; the region panel
       sits outside the shape, beside the tab and above the body line. */
    .main-col {
        flex: 1;
        min-width: 0;
        align-self: stretch;
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;

        position: relative;
        z-index: 1;
        margin-bottom: calc(-1 * var(--clay-edge-width));
        padding: var(--clay-pad);
        background-color: #fdfbf2;
        border-bottom: none;
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

    .region-panel {
        flex: 0 0 auto;
        width: 296px;
        /* The header row's bottom edge is the folder's fold line, so without
           this the panel's border lands flush on the folder's top border. */
        margin-bottom: var(--clay-gap);
        /* Clear the fixed sidebar (150px wide, 1em from the right, against a
           body inset 8px) and leave one standard gap beside it. */
        margin-right: calc(158px + var(--clay-gap));
        padding: var(--clay-pad);
        background-color: #f3edd8;
    }

    .cluster-info {
        font-variant: small-caps;
        letter-spacing: 0.03em;
        font-weight: bold;
        color: #5a4d20;
        margin-bottom: 0.5rem;
    }

    .settlement-buttons {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 0.2rem;
        max-height: calc(2 * 2.4rem + 0.2rem);
        overflow-y: auto;
    }

    .settlement-buttons button {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-width: 0;
        height: 2.4rem;
        padding: 0.15rem 0.1rem;
        background-color: #fffaf0;
        color: #2c250d;
        font-size: 0.72rem;
        line-height: 1.15;
        text-align: center;
        cursor: pointer;
        overflow: hidden;
    }

    .settlement-buttons button:hover {
        background-color: #fff2d6;
    }

    .settlement-buttons button.active {
        background-color: #e8d9a8;
        border-color: #62531d;
        font-weight: bold;
    }

    .settlement-buttons .settlement-name {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .settlement-buttons .pop {
        font-size: 0.6rem;
        font-weight: normal;
        color: dimgray;
    }

    img {
        vertical-align: middle;
    }
</style>
