<script lang="ts">
    import { world } from '../model/world';
    import type { Clan } from '../model/people';
    import PopulationPyramid from '../components/PopulationPyramid.svelte';
    
    class Data {
        year = $state('');
        clans = $state<Clan[]>([]);

        constructor() {
            this.update();
        }

        update() {
            this.year = world.year.toString();
            this.clans = world.clans.map(clan => clan.c());
        }
    }

    let data = $state(new Data());

    function click() {
        world.advance();
        data.update();
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
<h3>{data.year}</h3>

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
        {#each data.clans as clan}
            <tr>
                <td>{clan.name}</td>
                <td class="ra">{clan.size}</td>
                <td class="ra">{clan.skill}</td>
            </tr>
        {/each}
</table>

{#each data.clans as clan}
<h2>{clan.name}</h2>
<PopulationPyramid {clan} />
{/each}