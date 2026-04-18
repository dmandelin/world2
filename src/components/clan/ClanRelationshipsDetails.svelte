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
    <p>
    Total value = {subject.relationships.totalRelationshipValue.toFixed()}
    </p>
        <table>
        <thead>
            <tr>
                <td></td>
                <td><SimpleTooltip tip="Attention">Att</SimpleTooltip></td>
                <td><SimpleTooltip tip="Coresidence">CRes</SimpleTooltip></td>
                <td><SimpleTooltip tip="Volume">Vol</SimpleTooltip></td>
                <td><SimpleTooltip tip="Cooperation Level">Coop</SimpleTooltip></td>
                <td><SimpleTooltip tip="Value">Val</SimpleTooltip></td>
                <td><SimpleTooltip tip="Max Productivity Bonus">bMax</SimpleTooltip></td>
                <td><SimpleTooltip tip="Base Productivity Bonus">fBase</SimpleTooltip></td>
                <td><SimpleTooltip tip="Volume Factor">fVol</SimpleTooltip></td>
                <td><SimpleTooltip tip="Interaction Effectiveness for Skill">Eff</SimpleTooltip></td>
                <td><SimpleTooltip tip="Relative Size">fSz</SimpleTooltip></td>
                <td><SimpleTooltip tip="Total Productivity Bonus">Total</SimpleTooltip></td>
            </tr> 
        </thead>
           <tbody>
            {#each [...relationships].filter(([object, _]) => object != subject.ref) as [clan, relationship]}
                <tr><td colspan=3><EntityLink entity={clan} /></td></tr>
                {#each Object.entries(relationship.interactions) as [name, interaction]}
                    <tr>
                        <td>&nbsp;&nbsp;{interaction.name}</td>
                        <td>{interaction.attention.toFixed()}</td>
                        <td>{pct(interaction.coresidenceFactor)}</td>
                        <td>{interaction.volume.toFixed()}</td>
                        <td>{pct(relationship.cooperationLevel)}</td>
                        <td>{unsigned(interaction.volume * relationship.cooperationLevel)}</td>
                        <td>{interaction.maxProductivityBonus}</td>
                        {#each [interaction.getBaseProductivityBonusFactors(skill || SkillDefs.Agriculture)] as factor}
                        <td>{pct(factor.base)}</td>
                        <td>{pct(factor.fromVolume)}</td>
                        <td>{pct(factor.skillEffectiveness)}</td>
                        <td>{pct(factor.relativeSize)}</td>
                        {/each}
                        <td>{spct(1 + interaction.getBaseProductivityBonus(skill || SkillDefs.Agriculture))}</td>
                    </tr>
                {/each}
            {/each}
        </tbody>
    </table>
</div>
