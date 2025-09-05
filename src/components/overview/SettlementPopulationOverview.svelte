<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import { combinedPopulationChangeModifierTable } from "../tables";

	let { settlement }: { settlement: SettlementDTO } = $props();
    let table = $derived(combinedPopulationChangeModifierTable(settlement));
</script>

<div id="top">
    <h3 style="margin-block-end: 0.5em;">Demographic effects</h3>
    <table class="basic msm">
        <thead>
            <tr>
                {#each table.header as cell}
                    <th>{cell}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each table.rows as row}
                <tr>
                    {#each row as cell, i}
                        <td>{cell}</td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>