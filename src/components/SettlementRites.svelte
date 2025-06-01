<script lang="ts">
    import { spct } from "../model/format";

    let { settlement } = $props();
</script>

{#if settlement.clans.rites.participants.length}
<h4 style="text-align: center; margin-top: 1em;">Community Rites</h4>
<table style="width: 200px; margin: 0 auto;">
    <tbody>
        <tr>
            <td>Quality</td>
            <td>{spct(settlement.clans.rites.quality)}</td>
        </tr>
    </tbody>
</table>
{/if}
