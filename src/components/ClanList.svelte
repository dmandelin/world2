<script lang="ts">
    import PopulationPyramid from "./PopulationPyramid.svelte";

    let { clans } = $props();
</script>

<style>
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
                <td class="ra">{clan.skill}</td>
                <td class="ra">{clan.knowledge}</td>
                <td class="ra">{clan.quality}</td>
                <td class="ra">{clan.interactionModifier}</td>
                <td class="ra">{clan.festivalBehavior.name}</td>
                <td class="ra">{clan.festivalModifier}</td>
                <td class="ra">{clan.effectiveQuality}</td>
                <td class="ra">{clan.prestige}</td>
                <td class="ra">{clan.happiness}</td>
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
