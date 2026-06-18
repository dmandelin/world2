<script lang="ts">
    import type { ClanDTO } from "../../model/records/dtos";
    import { pct, signed, spct, unsigned } from "../../model/lib/format";
    import EntityLink from "../state/EntityLink.svelte";
    import SimpleTooltip from "../widgets/SimpleTooltip.svelte";
    import { Clan } from "../../model/people/people";
    import Tooltip from "../Tooltip.svelte";
    
    let { 
        clan,
    } : { clan: ClanDTO } = $props();

    let subject = $derived(clan.ref);
    let relationships = $derived(subject.relationships);
</script>

<style>
    td {
        padding: 0.01em 0.5em 0.01em 0.5em;
    }

    td.nopad {
        padding: 0.01em 0 0.01em 0;
    }
</style>

<!-- TODO - Remove dup with SettlementRelationships -->
{#snippet alignmentCellTooltip(value: number, object: Clan)}
  {@const rv = subject.relationships.get(object)}
  {@const a = rv ? rv.alignment : undefined}
  {#if a}
    Base {pct(a.base)} from {unsigned(a.attention)} attention / {a.objectPopulation} population
    <br>
    {#if a.interactionTypeModifier != 1}
        {spct(a.interactionTypeModifier)} from {a.interactionType}
    {/if}
  {/if}
{/snippet}


<div>
    <h3>Relationships</h3>
    <table>
        <thead>
            <tr>
                <td></td>
                <td><SimpleTooltip tip="Population">Pop</SimpleTooltip></td>
                <td colspan="3" style="text-align: center"><SimpleTooltip tip="Attention">Att</SimpleTooltip></td>
                <td><SimpleTooltip tip="Alignment">Aln</SimpleTooltip></td>
                <td><SimpleTooltip tip="Relationships">Relationships</SimpleTooltip></td>
            </tr> 
        </thead>
           <tbody>
            {#each [...relationships].filter(([object, _]) => object != subject) as [object, relationship]}
                <tr>
                    <td><EntityLink entity={object} /></td>
                    <td>{unsigned(relationship.object.population)}</td>
                    <td>{unsigned(relationship.attention)}</td>
                    <td class="nopad">&rarr;</td>
                    <td>{pct(relationship.attention / relationship.object.population)}</td>
                    <td>
                        <Tooltip>
                            {signed(100 * relationship.alignment.value)}
                            <div slot="tooltip">
                                {@render alignmentCellTooltip(relationship.alignment.value, object)}
                            </div>
                        </Tooltip>
                    </td>
                    <td>{relationship.interactionChains.map(ic => ic.name).join(', ')}</td>
                </tr>
            {/each}
        </tbody>
    </table>
</div>
