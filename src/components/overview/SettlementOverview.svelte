<script lang="ts">
    import type { SettlementDTO } from "../../model/records/dtos";
    import SettlementAgentsOverview2 from "./SettlementAgentsOverview2.svelte";
    import SettlementEventsOverview from "./SettlementEventsOverview.svelte";
    import SettlementIssuesOverview from "./SettlementIssuesOverview.svelte";
    import SettlementPopulationOverview from "./SettlementPopulationOverview.svelte";

    let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<div style="display: flex; gap: 8em;">
    <div>
        <SettlementAgentsOverview2 {settlement} />
    </div>
</div>
<div>
    <SettlementIssuesOverview {settlement} />
    <SettlementEventsOverview {settlement} />
    <SettlementPopulationOverview {settlement} />
</div>
