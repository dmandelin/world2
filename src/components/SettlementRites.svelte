<script lang="ts">
    import { pct, spct } from "../model/format";
    import { CommonRitesStructure, GuidedRitesStructure, Rites } from "../model/spirit";
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";

    let { settlement } = $props();

    let structures = [new CommonRitesStructure(), new GuidedRitesStructure()];
    let structureOptions = $derived.by(() => {
        return structures.map((s) => {
            const rites = new Rites(settlement.clans);
            rites.structure = s;
            rites.perform();

            return {
                name: s.name,
                rites: rites,
            };
        });
    })
</script>

{#if settlement.clans.rites.participants.length}
<h4 style="margin-top: 1em;">Community Rites</h4>
<table style="width: 200px">
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

<h4>Options</h4>
{#each structureOptions as so}
    <div>
        <h5>{so.name}: {pct(so.rites.quality)}</h5>
        <DataTable rows={so.rites.items} />
    </div>
{/each}
