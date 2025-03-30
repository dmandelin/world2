<script lang="ts">
    import { clamp } from "../model/basics";
    import { PersonalityTrait } from "../model/people";
    import Clan from "./Clan.svelte";

    let { clans } = $props();
    let selectedClan = $state(undefined);

    function r(trait: number) {
        const grade = 'ABCDE'[4 - clamp(Math.floor(trait / 20), 0, 4)];
        return `${grade} (${trait})`;
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
    }
</style>

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
                <td>{clan.agent.defaultGiftStrategy}</td>
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

<Clan clan={selectedClan} />