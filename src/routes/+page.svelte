<h1>world2</h1>

<script lang="ts">
    import { world } from '../model/world';
</script>

{#each world.clans as clan}
    <h2>{clan.name}</h2>
{/each}