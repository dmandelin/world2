<script lang="ts">
    import { pct } from "../../model/lib/format";
    import type { SettlementDTO } from "../../model/records/dtos";
    import Tooltip from "../Tooltip.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();

    // Earthier takes on the Agriculture/Fishing process colors, so they still
    // read as "green = fields, blue = water" but sit on parchment.
    const FARM = "#6a8f3c";
    const FISH = "#4a7fa5";

    let farming = $derived(settlement.farmingRatio);
</script>

<div class="vitals">
    <Tooltip>
        <span class="chip">
            <span class="mini-bar">
                <span
                    class="mini-fill"
                    style="width: {pct(farming)}; background: {FARM};"
                ></span>
                <span
                    class="mini-fill"
                    style="width: {pct(1 - farming)}; background: {FISH};"
                ></span>
            </span>
            <b>{pct(farming)}</b> farming
        </span>
        <div slot="tooltip">
            {pct(farming)} farming &centerdot; {pct(1 - farming)} fishing and
            foraging
        </div>
    </Tooltip>
</div>

<style>
    .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.85rem;
        white-space: nowrap;
    }

    .mini-bar {
        display: inline-flex;
        width: 46px;
        height: 8px;
        border: 1px solid #cbb98b;
        border-radius: 3px;
        overflow: hidden;
    }

    .mini-fill {
        height: 100%;
    }
</style>
