<script lang="ts">
    import { signed } from "../../model/lib/format";
    import type { ClanDTO, SettlementDTO } from "../dtos";
    import PopulationChange from "../PopulationChange.svelte";
    import PopulationPyramid from "../PopulationPyramid.svelte";
    import Tooltip from "../Tooltip.svelte";

	let { settlement }: { settlement: SettlementDTO } = $props();
    $effect(() => {
        for (const c of settlement.clans) {
            console.log(c.lastPopulationChange);
        }
    });
</script>

<style>
    td {
        padding: 0 0.5em;
    }

    td.rap {
        padding-right: 1em;
    }

    .delta {
        color: #464;
    }
</style>

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
                <td rowspan="2">People</td>
                {#each settlement.clans as clan}
                    <td class="rap">
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
            <tr>
                {#each settlement.clans as clan}
                    <td class="rap delta">
                        <Tooltip>
                            {clan.lastPopulationChange ? signed(clan.lastPopulationChange.change) : ''}
                            <div slot="tooltip" style="text-align: left; color: initial;">
                                <PopulationChange clan={clan} />
                            </div>
                        </Tooltip>
                    </td>
                {/each}
            </tr>
        </tbody>
    </table>
</div>