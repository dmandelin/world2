<script lang="ts">
    import { clamp } from "../model/basics";
    import PopulationPyramid from "./PopulationPyramid.svelte";

    let { clans } = $props();

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

    .pyramids {
        display: flex;
        justify-content: space-around;
    }
</style>

<table>
    <thead>
        <tr>
            <th>Clan</th>
            <th class="ra">Size</th>
            <th class="ra">Skill</th>
            <th class="ra">Know</th>
            <th class="ra">Qual</th>
            <th class="ra">Int</th>
            <th class="ra">FesB</th>
            <th class="ra">Fes</th>
            <th class="ra">Tech</th>
            <th class="ra">EQual</th>
            <th class="ra">Pres</th>
            <th class="ra">Hap</th>
            <th class="ra">EBR</th>
            <th class="ra">EDR</th>
            <th class="ra">EPC</th>
        </tr>
    </thead>
    <tbody>
        {#each clans as clan}
            <tr>
                <td style:color={clan.color}>{clan.name}</td>
                <td class="ra">{clan.size}</td>
                <td class="ra">{r(clan.skill)}</td>
                <td class="ra">{r(clan.knowledge)}</td>
                <td class="ra">{r(clan.quality)}</td>
                <td class="ra">{clan.interactionModifier}</td>
                <td class="ra">{clan.festivalBehavior.name}</td>
                <td class="ra">{clan.festivalModifier}</td>
                <td class="ra">{clan.techModifier}</td>
                <td class="ra">{r(clan.effectiveQuality)}</td>
                <td class="ra">{r(clan.prestige)}</td>
                <td class="ra">{r(clan.happiness)}</td>
                <td class="ra">{clan.expectedPopulationChange[0]}</td>
                <td class="ra">{clan.expectedPopulationChange[1]}</td>
                <td class="ra">{clan.expectedPopulationChange[2]}</td>
            </tr>
        {/each}
</table>

<div class="pyramids">
    {#each clans as clan}
    <div>
        <h2>{clan.name}</h2>
        <PopulationPyramid {clan} />
    </div>
    {/each}
</div>
