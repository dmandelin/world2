<script lang="ts">
    import { spct } from "../model/format";
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { settlement } = $props();
</script>

{#if settlement.clans.rites.participants.length}
<h4 style="text-align: center; margin-top: 1em;">Community Rites</h4>
<table style="width: 200px; margin: 0 auto;">
    <tbody>
        <tr>
            <td>Quality</td>
            <td>
                <Tooltip>
                    {spct(settlement.clans.rites.quality)}
                    <div slot="tooltip" class="ttt">
                        <DataTable rows={settlement.clans.rites.items} />
                    </div>
                </Tooltip>
            </td>
        </tr>
    </tbody>
</table>
{/if}
