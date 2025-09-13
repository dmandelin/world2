<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import SettlementEconomyOverview from "./SettlementEconomyOverview.svelte";
    import SettlementEventsOverview from "./SettlementEventsOverview.svelte";
    import SettlementIssuesOverview from "./SettlementIssuesOverview.svelte";
    import SettlementPopulationOverview from "./SettlementPopulationOverview.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<div style="display: flex; gap: 8em;">
    <div>
        <SettlementIssuesOverview settlement={settlement} />
        <SettlementEventsOverview settlement={settlement} />
    </div>
    <div>
        <SettlementPopulationOverview settlement={settlement} />
        <SettlementEconomyOverview settlement={settlement} />
    </div>
</div>