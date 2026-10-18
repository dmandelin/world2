<script lang="ts">
    import { SettlementDTO } from "../../model/records/dtos";
    import EntityLink from "../state/EntityLink.svelte";

    let {
        settlement,
        onSelect,
    }: { settlement: SettlementDTO; onSelect: (uuid: string) => void } =
        $props();
</script>

<!-- The other villages of the region, one per row so it fits the rail under
     the run controls. -->
<div class="region-panel clay-edge">
    <div class="cluster-info">
        <EntityLink entity={settlement.cluster} /> Region
        <span class="cluster-pop">
            <img
                src="stat-population-256.png"
                alt="Population"
                width="14"
                height="14"
            />{settlement.cluster.population}
        </span>
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

<style>
    .region-panel {
        box-sizing: border-box;
        width: 150px;
        padding: 0.4rem;
        background-color: #f3edd8;
    }

    .cluster-info {
        font-variant: small-caps;
        letter-spacing: 0.03em;
        font-weight: bold;
        color: #5a4d20;
        font-size: 0.85rem;
        line-height: 1.2;
        margin-bottom: 0.35rem;
    }

    .cluster-pop {
        white-space: nowrap;
        font-weight: normal;
    }

    img {
        vertical-align: middle;
        padding-bottom: 2px;
    }

    /* Long regions scroll inside the panel so the rail never outgrows the
       window it is stuck to. */
    .settlement-buttons {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: calc(100vh - 280px);
        overflow-y: auto;
    }

    .settlement-buttons button {
        box-sizing: border-box;
        flex: 0 0 auto;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.3rem;
        width: 100%;
        padding: 0.15rem 0.35rem;
        background-color: #fffaf0;
        color: #2c250d;
        font-family: inherit;
        font-size: 0.75rem;
        line-height: 1.2;
        text-align: left;
        cursor: pointer;
    }

    .settlement-buttons button:hover {
        background-color: #fff2d6;
    }

    .settlement-buttons button.active {
        background-color: #e8d9a8;
        border-color: #62531d;
        font-weight: bold;
    }

    .settlement-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .pop {
        flex: 0 0 auto;
        font-size: 0.65rem;
        font-weight: normal;
        color: dimgray;
    }
</style>
