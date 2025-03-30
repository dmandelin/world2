<script lang="ts">
    import { GiftStrategy } from "../model/interactions";
    import PopulationPyramid from "./PopulationPyramid.svelte";

    let { clan } = $props();
    let giftStrategy = $derived(clan?.agent?.defaultGiftStrategy);

    function setGiftStrategy(strategy: GiftStrategy) {
        console.log('YYY', clan?.name, clan?.agent?.defaultGiftStrategy);
        clan.agent.defaultGiftStrategy = strategy;
        console.log(clan.agent.defaultGiftStrategy);
    }
</script>

<style>
    button {
        display: block;
        margin-top: 6px;
        width: 120px;
        height: 24px;
    }
</style>

{#if clan !== undefined}
<h3>{clan.name}</h3>

<p>{clan.parent ? `Junior branch of ${clan.parent.name} of ${clan.parent.settlement.name}` : 'Senior clan'}</p>
{#if clan.cadets.length > 0}
<p>Cadet branches:</p>
<ul>
    {#each clan.cadets as cadet}
    <li>{cadet.name} of {cadet.settlement.name}</li>
    {/each}
</ul>
{/if}

<div style="display: flex">
    <div>
        Gift strategy: {giftStrategy}
        <button onclick={() => setGiftStrategy(GiftStrategy.Cooperate)}>Cooperative</button>
        <button onclick={() => setGiftStrategy(GiftStrategy.Reciprocate)}>Reciprocal</button>
        <button onclick={() => setGiftStrategy(GiftStrategy.Defect)}>Defecting</button>
    </div>
    <PopulationPyramid {clan} />
</div>
{/if}