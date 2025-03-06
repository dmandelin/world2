<script lang="ts">
    import { rankings } from '../model/timeline';
    import { world } from '../model/world';
    import type { Clan } from '../model/people';

    import ClanList from '../components/ClanList.svelte';
    import LineGraph from '../components/LineGraph.svelte';
    import Map from '../components/Map.svelte';
    
    class Data {
        year = $state('');
        totalPopulation = $state(0);
        message = $state('');
        clans = $state<Clan[]>([]);
        festivalMessage = $state('');
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
            this.message = world.message;
            this.festivalMessage = world.clans.festival.message;
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
    .mapRow {
        display: flex;
        gap: 1em;
    }

    .topPanel {
        display: flex;
        gap: 2em;
        margin-bottom: 1em;
    }

    .topPanel h3 {
        margin-top: 0;
        margin-bottom: 1em;
    }

    button {
        width: 150px;
        height: 50px;
        margin-bottom: 20px;
        font-size: 20px;
    }
    
    .line-graph-container {
        width: 80%;
        height: 150px;
        margin: 20px auto;
    }
</style>

<div class="mapRow">
    <Map />
    <div>
        <div class="topPanel">
            <div>
                <h3 style="text-align: center">{data.festivalMessage}</h3>
                <img src="/festival.webp" alt="Festival" height="120" width="200"/>
            </div>
            <div>
                <h3>{data.year} - {data.totalPopulation} people</h3>
                <button onclick={click}>Advance</button>
            </div>
        </div>
        <h4>{data.message}</h4>
        <ClanList clans={data.clans} />
    </div>
</div>

<div class="line-graph-container">
    <LineGraph data={data.popData} />
</div>

<div class="line-graph-container">
    <LineGraph data={data.rankings} />
</div>