<script lang="ts">
    import type { SettlementDTO } from "../dtos";
    import { settlementIssues } from "./componentlib";

	let { settlement }: { settlement: SettlementDTO } = $props();
    let issues = $derived(settlementIssues(settlement));
 
</script>

<div id="top">
    <h3>Issues</h3>
    {#each issues as issue}
        <div>{issue.title}{#if issue.details}: {issue.details.join(', ')}{/if}</div>
    {:else}
        <div>None this generation</div>
    {/each}
</div>