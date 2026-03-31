<script lang="ts">
    import type { ClanDTO } from "../dtos";
    import { pct, spct } from "../../model/lib/format";
    import { SkillDef, SkillDefs } from "../../model/people/skills";
    
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
                <td>Max</td>
                <td>Vol</td>
                <td>Base</td>
                <td>fVol</td>
                <td>Eff</td>
                <td>Sz</td>
                <td>Total</td>
            </tr>
        </thead>
           <tbody>
            {#each [...relationships].filter(([object, _]) => object != subject.ref) as [clan, relationship]}
                <tr><td colspan=3>{clan.name}</td></tr>
                {#each Object.entries(relationship.interactions) as [name, interaction]}
                    <tr>
                        <td>&nbsp;&nbsp;{interaction.name}</td>
                        <td>{interaction.maxProductivityBonus}</td>
                        <td>{interaction.volume.toFixed()}</td>
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
