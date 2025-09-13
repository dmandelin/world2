<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import { settlementEvents } from "./componentlib";

	let { settlement }: { settlement: SettlementDTO } = $props();
    let events = $derived(settlementEvents(settlement));

</script>

<div id="top">
    <h3>Events</h3>
    {#each events as event}
        <div>{event.title}{#if event.details}: {event.details.join(', ')}{/if}</div>
    {:else}
        <div>None last generation</div>
    {/each}
</div>