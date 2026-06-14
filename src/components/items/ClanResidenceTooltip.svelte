<script lang="ts">
    import { pct } from "../../model/lib/format";
    import { type ClanDTO } from "../../model/records/dtos";

    let { clan }: { clan: ClanDTO } = $props();
    let r = $derived(clan.residenceLevel);
</script>

<style>
</style>

<ul>
    {#each r.items as item}
    <li>{pct(item.fraction)} from {item.label}</li>
    {/each}
</ul>
