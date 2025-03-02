<script lang="ts">
    import { world } from '../model/world';
    import PopulationPyramid from '../components/PopulationPyramid.svelte';
    import { onDestroy, onMount } from 'svelte';

    let ws = $state(world);
    let y = $state(world.year);
    let z = $state('l');

    function click() {
        world.advance();
        y = world.year.c();
        z = y.toString();
        ws = world;
    }
</script>

<style>
    th, td {
        text-align: left;
    }

    .ra {
        text-align: right;
    }

    button {
        width: 150px;
        height: 50px;
        margin-bottom: 20px;
        font-size: 20px;
    }
</style>

<h1>world2</h1>
<h3>{y}</h3>

<div>
    <button onclick={click}>Advance</button>
</div>

<table>
    <thead>
        <tr>
            <th>Clan</th>
            <th class="ra">Size</th>
            <th class="ra">Skill</th>
        </tr>
    </thead>
    <tbody>
        {#each ws.clans as clan}
            <tr>
                <td>{clan.name}</td>
                <td class="ra">{clan.size}</td>
                <td class="ra">{clan.skill}</td>
            </tr>
        {/each}
</table>

{#each ws.clans as clan}
<h2>{clan.name}</h2>
<PopulationPyramid {clan} />
{/each}