<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import SettlementAgentsOverview from "./SettlementAgentsOverview.svelte";
    import SettlementAgentsOverview2 from "./SettlementAgentsOverview2.svelte";
    import SettlementEconomyOverview from "./SettlementEconomyOverview.svelte";
    import SettlementEventsOverview from "./SettlementEventsOverview.svelte";
    import SettlementIssuesOverview from "./SettlementIssuesOverview.svelte";
    import SettlementPopulationOverview from "./SettlementPopulationOverview.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<SettlementAgentsOverview2 settlement={settlement} />

<div style="display: flex; gap: 8em;">
    <div>
        <SettlementAgentsOverview settlement={settlement} />
        <SettlementIssuesOverview settlement={settlement} />
        <SettlementEventsOverview settlement={settlement} />
    </div>
    <div>
        <SettlementPopulationOverview settlement={settlement} />
        <SettlementEconomyOverview settlement={settlement} />
    </div>
</div>