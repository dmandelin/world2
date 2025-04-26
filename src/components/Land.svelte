<style>
    #top {
        margin-left: 1rem;
    }

    h1 {
        margin: 0 0 1rem 0;
    }
</style>

<script>
    import DataTable from "./DataTable.svelte";

    let { world } = $props();
</script>

<div id="top">
<h1>𒌦 &centerdot; The Land</h1>
<h3>{world.population} people</h3>

<h4>Statistics</h4>
<DataTable rows={world.stats} />

<h4>Notable Clans</h4>
<DataTable rows={world.notableClans} />

</div>