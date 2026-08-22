<script lang="ts">
    import type { SettlementDTO } from "../../model/records/dtos";
    import ClansOverview from "./ClansOverview.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<div style="display: flex; gap: 8em;">
    <div>
        <ClansOverview {settlement} />
    </div>
</div>
