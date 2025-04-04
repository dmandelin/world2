<script lang="ts">
    import { GiftStrategy } from "../model/interactions";
    import PopulationPyramid from "./PopulationPyramid.svelte";

    let { clan, updateTrigger = $bindable() } = $props();

    function setGiftStrategy(strategy: GiftStrategy) {
        clan.ref.agent.defaultGiftStrategy = strategy;
        ++updateTrigger;
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

<p><b>Economic policy decision</b></p>

<table style="margin-bottom: 1em">
    <tbody>
        <tr><td>Keep return</td><td>{clan.economicPolicyDecision.keepReturn.toFixed()}</td></tr>
        <tr><td>Share self return</td><td>{clan.economicPolicyDecision.shareSelfReturn.toFixed()}</td></tr>
        <tr><td>Share others return</td><td>{clan.economicPolicyDecision.shareOthersReturn.toFixed()}</td></tr>
        <tr><td>Share return</td><td>{clan.economicPolicyDecision.shareReturn.toFixed()}</td></tr>
    </tbody>
</table>

<div style="display: flex">
    <div>
        Gift strategy: {clan.giftStrategy}
        <button onclick={() => setGiftStrategy(GiftStrategy.Cooperate)}>Cooperative</button>
        <button onclick={() => setGiftStrategy(GiftStrategy.Reciprocate)}>Reciprocal</button>
        <button onclick={() => setGiftStrategy(GiftStrategy.Defect)}>Defecting</button>
    </div>
    <PopulationPyramid {clan} />
</div>
{/if}