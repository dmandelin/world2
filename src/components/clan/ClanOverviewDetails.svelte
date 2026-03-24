<script lang="ts">
    import type { ClanDTO } from "../dtos";
    import ClanRelationshipsDetails from "./ClanRelationshipsDetails.svelte";

    let {clan} : { clan: ClanDTO } = $props();
</script>

<style>
</style>

<div>
    <h3>Overview</h3>
    <p>Clan Size: {clan.population}</p>

    <ClanRelationshipsDetails clan={clan} />
</div>
