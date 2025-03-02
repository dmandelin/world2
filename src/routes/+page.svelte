<script lang="ts">
    import { world } from '../model/world';
    import type { Clan } from '../model/people';
    import PopulationPyramid from '../components/PopulationPyramid.svelte';
    import LineGraph from '../components/LineGraph.svelte';
    
    class Data {
        year = $state('');
        clans = $state<Clan[]>([]);
        timeline = $state<[string, number][]>([]);

        constructor() {
            this.update();
        }

        update() {
            this.year = world.year.toString();
            this.clans = world.clans.map(clan => clan.c());
            this.timeline = world.timeline.map((p) => [p.year.toString(), p.totalPopulation]);
        }
    }

    let data = $state(new Data());

    function click() {
        world.advance();
        data.update();
    }
</script>

<style>
    button {
        width: 150px;
        height: 50px;
        margin-bottom: 20px;
        font-size: 20px;
    }
    
    th, td {
        text-align: left;
    }

    .ra {
        text-align: right;
    }

    .pyramids {
        display: flex;
        justify-content: space-around;
    }

    .line-graph-container {
        width: 80%;
        height: 150px;
        margin: 20px auto;
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

<div class="pyramids">
    {#each data.clans as clan}
    <div>
        <h2>{clan.name}</h2>
        <PopulationPyramid {clan} />
    </div>
    {/each}
</div>

{#each data.timeline as [year, population]}
    <div>{year}: {population}</div>
{/each}

<div class="line-graph-container">
<LineGraph data={{labels: ['a', 'b', 'c'], datasets: [{label: 'x', data: [4, 8, 7] ,color: 'blue'}]}} />
<!-- 
<LineGraph {data: data.timeline.map(([year, population]) => population), color: 'blue'} />
 -->
</div>