<script lang="ts">
    import type { ClanDTO } from "../../model/records/dtos";
    import { pct, spct, unsigned } from "../../model/lib/format";
    import { SkillDef, SkillDefs } from "../../model/people/skills";
    import EntityLink from "../state/EntityLink.svelte";
    import SimpleTooltip from "../widgets/SimpleTooltip.svelte";
    
    let { 
        clan: subject,
        skill 
    } : { clan: ClanDTO, skill?: SkillDef } = $props();
    let relationships = subject.relationships;
</script>

<style>
    td {
        padding: 0.01em 1em 0.01em 0;
    }
</style>

<div>
    <h3>Relationships</h3>
    <table>
        <thead>
            <tr>
                <td></td>
                <td><SimpleTooltip tip="Coresidence">CRes</SimpleTooltip></td>
                <td><SimpleTooltip tip="Cooperation Level">Coop</SimpleTooltip></td>
            </tr> 
        </thead>
           <tbody>
            {#each [...relationships].filter(([object, _]) => object != subject.ref) as [clan, relationship]}
                <tr><td colspan=3><EntityLink entity={clan} /></td></tr>
                {#each Object.entries(relationship.interactionChains) as [name, interactionChain]}
                    <tr>
                        <td>&nbsp;&nbsp;{interactionChain.name}</td>
                        <td>{pct(relationship.coresidenceFraction)}</td>
                        <td>{pct(relationship.cooperationLevel)}</td>
                    </tr>
                {/each}
            {/each}
        </tbody>
    </table>
</div>
