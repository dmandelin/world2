<script lang="ts">
    import type { SettlementDTO } from "./dtos";
    
    let { settlement }: { settlement: SettlementDTO }= $props();
    let clans = $derived(settlement.clans);

</script>

<style>
</style>

