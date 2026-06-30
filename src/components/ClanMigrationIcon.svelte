<script lang="ts">
    import MigrationPlan from "./MigrationPlan.svelte";
    import Tooltip from "./Tooltip.svelte";
    import type { ClanDTO } from "../model/records/dtos";

    let { clan } : { clan: ClanDTO } = $props();

    let icon = $derived.by(() => {
        return clan.migrationPlan?.willMigrate
            ? 'migrate-yes-256.png'
            : clan.migrationPlan?.wantToMove
            ? 'migrate-want-256.png'
            : 'migrate-no-256.png';
    });

    let alt = $derived.by(() => {
        return clan.migrationPlan?.willMigrate
            ? 'This clan will migrate'
            : 'This clan will not migrate';
    });
</script>

<style>
    .ttt {
        text-align: left;
        font-size: small;
        margin: 0;
    }
</style>

    <div id="icon">
        <Tooltip>
            <img width="24" height="24" src={icon} alt={alt} />    
            <div slot="tooltip" class="ttt">
                Clan traits:
                {#each clan.traits as trait}
                    <span>{trait}</span>
                {/each}
                <MigrationPlan plan={clan.migrationPlan} />
            </div>
        </Tooltip>
    </div>

