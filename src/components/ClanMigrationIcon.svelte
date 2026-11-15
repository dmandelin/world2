<script lang="ts">
    import ClanMigrationDetails from "./clan/ClanMigrationDetails.svelte";
    import Tooltip from "./Tooltip.svelte";
    import type { ClanDTO } from "../model/records/dtos";

    let { clan } : { clan: ClanDTO } = $props();

    // Going; interested in some round of this year's question; or neither.
    let icon = $derived.by(() => {
        const vote = clan.foundingVote;
        return vote?.goes
            ? 'migrate-yes-256.png'
            : vote?.everInterested
            ? 'migrate-want-256.png'
            : 'migrate-no-256.png';
    });

    let alt = $derived.by(() => {
        return clan.foundingVote?.goes
            ? 'This clan is going off to found a new village'
            : 'This clan is staying';
    });
</script>

<style>
    .ttt {
        text-align: left;
        font-size: small;
        margin: 0;
        white-space: normal;
        min-width: 480px;
    }
</style>

    <div id="icon">
        <Tooltip>
            <img width="24" height="24" src={icon} alt={alt} />
            <div slot="tooltip" class="ttt">
                <ClanMigrationDetails {clan} compact={true} />
            </div>
        </Tooltip>
    </div>
