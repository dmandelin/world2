<script lang="ts">
    import { spct } from "../model/format";
    import { PersonalityTrait } from "../model/people";
    import Clan from "./Clan.svelte";

    let { clans, updateTrigger = $bindable() } = $props();
    let selectedClan = $state(undefined);

    function grade(t: number) {
        switch (true) {
            case t > 95: return 'S';
            case t > 80: return 'A';
            case t > 65: return 'B';
            case t > 50: return 'C';
            case t > 35: return 'D';
            case t > 20: return 'E';
            default: return 'F';
        }
    }

    function r(trait: number) {
        if (trait === undefined) return 'N/A';
        return `${grade(trait)} (${trait.toFixed()})`;
    }
</script>

<style>
    th, td {
        text-align: left;
        padding: 0 0.25em;
    }

    .ra {
        text-align: right;
    }

    table {
        cursor: pointer;
        white-space: nowrap;
    }
</style>

<table style="margin-bottom: 1em">
    <thead>
        <tr>
            <th>Clan</th>
            <th>Sen</th>
            <th class="ra">Size</th>
            <th class="ra">+/-</th>
            <th class="ra">Farm</th>
            <th class="ra">Prod</th>
            <th class="ra">Strat</th>
            <th class="ra">Cons</th>
            <th class="ra">Qc</th>
            <th class="ra">Qa</th>
            <th class="ra">QoL</th>
        </tr>
    </thead>
    <tbody>
        {#each clans as clan}
            <tr onclick={() => selectedClan = clan}>
                <td style:color={clan.color}>{clan.name}</td>
                <td class="ra">{String.fromCharCode(65 + clan.seniority)}</td>
                <td class="ra">{clan.size}</td>
                <td class="ra">{clan.lastSizeChange}</td>
                <td class="ra">{r(clan.productionAbility)}</td>
                <td class="ra">{spct(clan.productivity)}</td>
                <td class="ra">{clan.economicPolicy.c}</td>
                <td class="ra">{spct(clan.perCapitaConsumption)}</td>
                <td class="ra">{clan.qolFromConsumption.toFixed()}</td>
                <td class="ra">{clan.qolFromAbility.toFixed()}</td>
                <td class="ra">{r(clan.qol)}</td>
            </tr>
        {/each}
</table>

{#if clans.pot.contributors > 0}
<p><b>Communal sharing:</b></p>
<table style="margin-bottom: 1em">
    <tbody>
        <tr>
            <td>People:</td><td>{clans.pot.contributors}</td>
        </tr>
        <tr>
            <td>Base collection:</td><td>{clans.pot.input.toFixed()}</td>
        </tr>
        <tr>
            <td>Base productivity:</td><td>{spct(clans.pot.baseProductivity)}</td>
        </tr>
        <tr>
            <td>Scale boost:</td><td>{spct(clans.pot.scaleFactor)}</td>
        </tr>
        <tr>
            <td>TFP:</td><td>{spct(clans.pot.tfp)}</td>
        </tr>
        <tr>
            <td>Output:</td><td>{clans.pot.output.toFixed()}</td>
        </tr>
    </tbody>
</table>
{/if}

<table>
    <thead>
        <tr>
            <th>Clan</th>
            <th>Sen</th>
            <th class="ra">Size</th>
            <th class="ra">+/-</th>
            <th>GS</th>
            <th class="ra">Traits</th>
            <th class="ra">Str</th>
            <th class="ra">Int</th>
            <th class="ra">Farm</th>
            <th class="ra">Inc</th>
            <th class="ra">Inx</th>
            <th class="ra">Fes</th>
            <th class="ra">Tech</th>
            <th class="ra">Ten</th>
            <th class="ra">PPM</th>
            <th class="ra">QOL</th>
            <th class="ra">Pres</th>
        </tr>
    </thead>
    <tbody>
        {#each clans as clan}
            <tr onclick={() => selectedClan = clan}>
                <td style:color={clan.color}>{clan.name}</td>
                <td class="ra">{String.fromCharCode(65 + clan.seniority)}</td>
                <td class="ra">{clan.size}</td>
                <td class="ra">{clan.lastSizeChange}</td>
                <td>{clan.giftStrategy}</td>
                <td class="ra">{[...clan.traits].map((t: PersonalityTrait) => t.name).join(' ')}</td>
                <td class="ra">{r(clan.strength)}</td>
                <td class="ra">{r(clan.intelligence)}</td>
                <td class="ra">{r(clan.productionAbility)}</td>
                <td class="ra">{r(clan.income)}</td>
                <td class="ra">{clan.interactionModifier.toFixed(1)}</td>
                <td class="ra">{clan.festivalModifier}</td>
                <td class="ra">{clan.techModifier}</td>
                <td class="ra">{clan.tenureModifier} ({clan.tenure})</td>
                <td class="ra">{clan.settlement.populationPressureModifier}</td>
                <td class="ra">{r(clan.qol)}</td>
                <td class="ra">{r(clan.prestige)}</td>
            </tr>
        {/each}
</table>

<Clan clan={selectedClan} bind:updateTrigger={updateTrigger}/>