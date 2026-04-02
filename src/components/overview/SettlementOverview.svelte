<script lang="ts">
    import type { SettlementDTO } from "../../model/records/dtos";
    import SettlementAgentsOverview2 from "./SettlementAgentsOverview2.svelte";
    import SettlementEconomyOverview from "./SettlementEconomyOverview.svelte";
    import SettlementEventsOverview from "./SettlementEventsOverview.svelte";
    import SettlementIssuesOverview from "./SettlementIssuesOverview.svelte";
    import SettlementPopulationOverview from "./SettlementPopulationOverview.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
</script>


<div style="display: flex; gap: 8em;">
    <div>
        <SettlementAgentsOverview2 
            settlement={settlement.endOfPreviousTurnSnapshot} 
            title={`As of ${settlement.world.year}`}/>
    </div>
    <div>
        <SettlementAgentsOverview2 
            settlement={settlement} 
            title="Next"
            predictMode={true} />
    </div>
    <div>
        <SettlementIssuesOverview settlement={settlement} />
        <SettlementEventsOverview settlement={settlement} />
        <SettlementPopulationOverview settlement={settlement} />
        <SettlementEconomyOverview settlement={settlement} />
    </div>
</div>