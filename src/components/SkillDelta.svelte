<script lang="ts">
    import { pct, signed } from "../model/lib/format";
    import { skillImitationTable } from "./tables";
    import DataTable from "./DataTable.svelte";
    import Tooltip from "./Tooltip.svelte";
    import type { ClanDTO } from "../model/records/dtos";
    import type { SkillDef } from "../model/people/skills";

    let { clan, skill }: { clan: ClanDTO, skill: SkillDef } = $props();
    let clanSkill = $derived(clan.skills.get(skill)!);
</script>

<style>
    .ttt {
        text-align: left;
        font-size: small;
        margin: 0;
    }
</style>

<Tooltip>
    {signed(clanSkill.lastChange?.delta || 0)}
    <div slot="tooltip" class="ttt">
        {#if clanSkill.lastChange}
            <h4>Imitation Sources</h4>
            <DataTable rows={skillImitationTable(clanSkill.lastChange)} />
            <h4>Effort = {pct(clanSkill.lastChange.relativeEffort)}</h4>
            <h4>Learning factor = {pct(clanSkill.lastChange.effortFactor)})</h4>
            <h4>Skill Changes</h4>
            <DataTable rows={clanSkill.lastChange.changeSourcesTooltip} />
        {/if}
    </div>
</Tooltip>

