<script lang="ts">
    import { world } from '../model/world';
    import type { Clan } from '../model/people';
    import PopulationPyramid from '../components/PopulationPyramid.svelte';
    import LineGraph from '../components/LineGraph.svelte';
    import { rankings } from '../model/timeline';
    
    class Data {
        year = $state('');
        totalPopulation = $state(0);
        clans = $state<Clan[]>([]);
        timeline = $state<[string, number][]>([]);
        rankings = $state<LineGraphData>({ labels: [], datasets: [] });

        popData = $derived.by(() => {
            return {
                labels: this.timeline.map(([year, _]) => year),
                datasets: [{
                    label: 'Population',
                    data: this.timeline.map(([_, population]) => population),
                    color: 'blue'
                }]
            };
        });

        constructor() {
            this.update();
        }

        update() {
            this.year = world.year.toString();
            this.totalPopulation = world.totalPopulation;
            this.clans = world.clans.map(clan => clan.c());
            this.timeline = world.timeline.map((p) => [p.year.toString(), p.totalPopulation]);
            this.rankings = rankings(world);
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
<h3>{data.year} - {data.totalPopulation} people</h3>

<div>
    <button onclick={click}>Advance</button>
</div>

<table>
    <thead>
        <tr>
            <th>Clan</th>
            <th class="ra">Size</th>
            <th class="ra">Skill</th>
            <th class="ra">Know</th>
            <th class="ra">Qual</th>
            <th class="ra">Int</th>
            <th class="ra">EQual</th>
            <th class="ra">Pres</th>
            <th class="ra">Hap</th>
        </tr>
    </thead>
    <tbody>
        {#each data.clans as clan}
            <tr>
                <td style:color={clan.color}>{clan.name}</td>
                <td class="ra">{clan.size}</td>
                <td class="ra">{clan.skill}</td>
                <td class="ra">{clan.knowledge}</td>
                <td class="ra">{clan.quality}</td>
                <td class="ra">{clan.interactionModifier}</td>
                <td class="ra">{clan.effectiveQuality}</td>
                <td class="ra">{clan.prestige}</td>
                <td class="ra">{clan.happiness}</td>
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

<div class="line-graph-container">
    <LineGraph data={data.popData} />
</div>

<div class="line-graph-container">
    <LineGraph data={data.rankings} />
</div>