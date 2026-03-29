<script lang="ts">
    import type { ClanDTO, SettlementDTO } from "../dtos";
    import PopulationPyramid from "../PopulationPyramid.svelte";
    import Tooltip from "../Tooltip.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
</script>

<div id="top">
    <h3 style="margin-block-end: 0.5em;">Situation</h3>

    <table>
        <thead>
            <tr>
                <td></td>
                {#each settlement.clans as clan}
                    <td class="bold">{clan.name}</td>
                {/each}
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>People</td>
                {#each settlement.clans as clan}
                    <td class="ca">
                        <Tooltip>
                            {clan.population}
                            <div slot="tooltip">
                                <PopulationPyramid clan={clan} />
                                <hr>
                                <div>Workers: {clan.workers}</div>
                                <div>Carers and Dependents: {clan.population - clan.workers}</div>
                                <div>Population Per Worker: {(clan.population / clan.workers).toFixed(1)}</div>
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
        </tbody>
    </table>
</div>