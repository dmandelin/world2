<script lang="ts">
    import { clanSedentismDescription } from "../../model/people/residence";
    import { pct } from "../../model/lib/format";
    import { type ClanDTO } from "../dtos";
    import Tooltip from "../Tooltip.svelte";
    import TableView from "../TableView.svelte";

    let { clan }: { clan: ClanDTO } = $props();
    let r = $derived(clan.residenceLevel);
</script>

<style>

</style>

<Tooltip>
    <div>{clanSedentismDescription(r.fractionInSettlement)} ({pct(r.fractionInSettlement)} resident)</div>
    <div slot="tooltip" style="font-weight: initial; text-align: initial;">
        <table>
            <tbody>
                <tr>
                    <td class="bold">Workers:</td>
                    <td>{pct(r.workersFractionInSettlement)}</td>
                    <td>&times;</td>
                    <td>2/3</td>
                    <td>=</td>
                    <td class="bold">{pct(2 / 3 * r.workersFractionInSettlement)}</td>
                </tr>
                <tr>
                    <td class="bold">Carers & Children:</td>
                    <td>{pct(r.mothersFractionInSettlement)}</td>
                    <td>&times;</td>
                    <td>1/3</td>
                    <td>=</td>
                    <td class="bold">{pct(1 / 3 * r.mothersFractionInSettlement)}</td>
                </tr>
                <tr>
                    <td class="bold">Total:</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td class="bold">{pct(r.fractionInSettlement)}</td>
                </tr>
            </tbody>
        </table>

       <h4>Workers</h4>
         <ul>
              {#each r.laborItems as item}
              <li>{pct(item.fraction)} from {item.skill}</li>
              {/each}
        </ul>

        <h4>Carers & Children</h4>
        <ul>
            <li>{pct(r.mothersNestingFraction)} from nesting</li>
            <li>{pct((1 - r.mothersNestingFraction) * r.workersFractionInSettlement)} with workers at home</li>
        </ul>
    </div>
</Tooltip>