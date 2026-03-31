<script lang="ts">
    import { clanSedentismDescription } from "../../model/people/residence";
    import { pct } from "../../model/lib/format";
    import { type ClanDTO } from "../dtos";
    import Tooltip from "../Tooltip.svelte";
    import TableView from "../TableView.svelte";
    import ClanResidenceTooltip from "./ClanResidenceTooltip.svelte";

    let { clan }: { clan: ClanDTO } = $props();
    let r = $derived(clan.residenceLevel);
</script>

<style>

</style>

<Tooltip>
    <div>{clanSedentismDescription(r.fractionInSettlement)} ({pct(r.fractionInSettlement)} resident)</div>
    <div slot="tooltip" style="font-weight: initial; text-align: initial;">
        <ClanResidenceTooltip clan={clan} />
    </div>
</Tooltip>