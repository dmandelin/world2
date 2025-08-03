<script lang="ts">
    import DataTable from "./DataTable.svelte";
    import type { WorkerDiseaseLoadItem } from "../model/environment/pathogens";

    let { settlement } = $props();
    let dl = $derived(settlement.cluster.diseaseLoad);
    $effect(() => console.log(dl));
</script>

<style>
</style>

<h4>Disease load</h4>

<div>Total: {dl.value.toFixed(2)}</div>

<DataTable rows={dl.workerDiseaseLoads.values().map((item: WorkerDiseaseLoadItem) => 
    [item.skillDef.name, item.workers.toFixed(), item.load.toFixed(2)])} />