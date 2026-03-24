<script lang="ts">
    import type { ClanDTO } from "../dtos";
    import { pct, signed, spct } from "../../model/lib/format";
    import { SkillDef, SkillDefs } from "../../model/people/skills";
    
    let {clan} : { clan: ClanDTO } = $props();
    let relationships = clan.relationships;
</script>

<style>
    td {
        padding: 0.01em 1em 0.01em 0;
    }
</style>

<div>
    <h3>Relationships</h3>
    <table>
        <tbody>
            {#each relationships as [clan, relationship]}
                <tr><td colspan=3>{clan.name}</td></tr>
                {#each Object.entries(relationship.interactions) as [name, interaction]}
                    <tr>
                        <td>&nbsp;&nbsp;{interaction.name}</td>
                        <td>{interaction.maxProductivityBonus}</td>
                        <td>{interaction.volume.toFixed()}</td>
                        <td>{spct(1 + interaction.getBaseProductivityBonus(SkillDefs.Agriculture))}</td>
                    </tr>
                {/each}
            {/each}
        </tbody>
    </table>
</div>
