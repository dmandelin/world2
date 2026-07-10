<script lang="ts">
    import type { ClanDTO } from "../../model/records/dtos";
    import type { Conflict } from "../../model/relations/conflict";

    let { 
        conflict,
        c1,
        c2,
    } : { 
        conflict: Conflict|undefined,
        c1: ClanDTO,
        c2: ClanDTO,
    } = $props();
</script>

<style>
table {
    border-collapse: collapse;
}

td {
    border: 1px solid black;
    padding: 1em 0.25em;
    text-align: center;
}

td.split {
  position: relative;
  /* Draws a crisp diagonal line from bottom-left to top-right */
  background: linear-gradient(
    to top right, 
    transparent calc(50% - 1px), 
    #333 calc(50% - 1px), 
    #333 calc(50% + 1px), 
    transparent calc(50% + 1px)
  );
}

/* Player 1 (Row Player) - Bottom Left */
td.split .p1 {
  position: absolute;
  bottom: 8px;
  left: 2px;
}

/* Player 2 (Column Player) - Top Right */
td.split .p2 {
  position: absolute;
  top: 8px;
  right: 2px;
}
</style>

<table>
    <thead>
        <tr><td></td><td>D</td><td>H</td></tr>
    </thead>
    <tbody>
        {#each conflict?.results as row, rowIndex}
        <tr>
        <td>{rowIndex === 0 ? 'D' : 'H'}</td>
            {#each row as cell, colIndex}
                <td class="split">
                    <div style="height: 32px; width: 32px"></div>
                    {#if c1.uuid === conflict?.uuid1}
                        <span class="p1">{cell.c1Payoff}</span>
                        <span class="p2">{cell.c2Payoff}</span>
                    {:else}
                        <span class="p1">{cell.c2Payoff}</span>
                        <span class="p2">{cell.c1Payoff}</span>
                    {/if}
                </td>
            {/each}
        </tr>
        {/each}
    </tbody>
</table>