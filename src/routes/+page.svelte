<script lang="ts">
    import { rankings } from '../model/timeline';
    import { world } from '../model/world';
    import type { Clan } from '../model/people';
    import type { Record } from '../model/annals';
    
    import ClanList from '../components/ClanList.svelte';
    import LineGraph from '../components/LineGraph.svelte';
    import Map from '../components/Map.svelte';
    import Society from '../components/Society.svelte';
    import Notables from '../components/Notables.svelte';
    import { SocietyView } from '../components/societyview';
    import { Settlement } from '../model/settlement';
    import LocalAssessments from '../components/LocalAssessments.svelte';
    import { clanDTO, type ClanDTO } from '../components/dtos';
    
    class Data {
        year = $state('');
        totalPopulation = $state(0);
        annals = $state<Record[]>([]);
        clans = $state<ClanDTO[]>([]);
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
            this.annals = [...world.annals.records];
            this.clans = world.allClans.map(clan => clanDTO(clan));
            this.timeline = world.timeline.map((p) => [p.year.toString(), p.totalPopulation]);
            this.rankings = rankings(world);
        }
    }

    let updateTrigger = $state(0);
    $effect(() => {
        if (updateTrigger > 0) {
            data.update();
        }
    });

    let data = $state(new Data());
    let selectedSettlement = $state(world.settlements[0]);
    let selectedClans = $derived.by(() =>
        data.clans.filter(clan => clan.settlement === selectedSettlement)
    );
    let society = $derived((data.year, new SocietyView(selectedSettlement)));

    function click() {
        world.advance();
        data.update();
    }
</script>

<style>
    :global(body) {
        font-family: Arial, sans-serif;
    }

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
    <div>
        <Map bind:selection={selectedSettlement} />
        {#each data.annals.toReversed() as record}
            <div class="record">{record.year}{record.settlement ? ` (${record.settlement.name})` : ''}: {record.text}</div>
        {/each}
    </div>
    <div>
        <div class="topPanel">
            <div>
                <h2>{selectedSettlement?.name} &ndash; {selectedSettlement?.size}</h2>
                {#if selectedSettlement?.parent}
                    <p>Founded from {selectedSettlement.parent.name}</p>
                {/if}
                {#if selectedSettlement.daughters.length > 0}
                    <p>Daughters: {selectedSettlement.daughters.map(d => d.name).join(', ')}</p>
                {/if}
                {#each society.description as item}
                    <h4>{item}</h4>
                {/each}
                <h3 style="text-align: center">
                    {selectedSettlement.clans.festival.message}
                    </h3>
                <img src="/festival.webp" alt="Festival" height="120" width="200"/>
            </div>
            <div>
                <h2>{data.year} - {data.totalPopulation} people</h2>
                <button onclick={click}>Advance</button>
            </div>
        </div>
        <ClanList clans={selectedClans} bind:updateTrigger={updateTrigger} />
        <LocalAssessments settlement={selectedSettlement} />
    </div>
</div>

<div style="display: flex; align-items: flex-start; gap: 5.5em">
    <Society society={society} />
    <Notables />
</div>

<div class="line-graph-container">
    <LineGraph data={data.popData} />
</div>

<div class="line-graph-container">
    <LineGraph data={data.rankings} />
</div>