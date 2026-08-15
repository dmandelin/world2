<script lang="ts">
    import type { SettlementDTO } from "../../model/records/dtos";
    import SettlementAgentsOverview2 from "./SettlementAgentsOverview2.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<div style="display: flex; gap: 8em;">
    <div>
        <SettlementAgentsOverview2 {settlement} />
    </div>
</div>
