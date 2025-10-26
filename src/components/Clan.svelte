<script lang="ts">
    import { rpct } from "../model/lib/format";

    let { clan, updateTrigger = $bindable() } = $props();
</script>

<style>
    .la {
        text-align: left;
    }

    .ra {
        text-align: right;
    }
</style>

{#if clan !== undefined}
<h3>{clan.name}</h3>

<p>{clan.parent ? `Junior branch of ${clan.parent.name} of ${clan.parent.settlement.name}` : 'Senior clan'}</p>
{#if clan.cadets.length > 0}
<p>Cadet branches:</p>
<ul>
    {#each clan.cadets as cadet}
    <li>{cadet.name} of {cadet.settlement.name}</li>
    {/each}
</ul>
{/if}

<h4>Relationships</h4>

<table style="margin-bottom: 1em">
    <tbody>
        <tr>
            <th></th>
            {#each clan.assessments as a}
            <th class="ra">{a.target.name}</th>
            {/each}
        </tr>

        <tr>
            <th class="la">Kinship</th>
            {#each clan.assessments as a}
            <td class="ra">{rpct(a.rFamily)}</td>
            {/each}
        </tr>

        <tr>
            <th class="la">Proximity</th>
            {#each clan.assessments as a}
            <td class="ra">{rpct(a.rResidence)}</td>
            {/each}
        </tr>

        <tr>
            <th class="la">Sharing</th>
            {#each clan.assessments as a}
            <td class="ra">{rpct(a.rResidence)}</td>
            {/each}
        </tr>

        <tr>
            <th class="la">Scale</th>
            {#each clan.assessments as a}
            <td class="ra">{rpct(a.rScale)}</td>
            {/each}
        </tr>

        <tr>
            <th class="la">Overpopulation</th>
            {#each clan.assessments as a}
            <td class="ra">{rpct(a.rBlowup)}</td>
            {/each}
        </tr>
    </tbody>
</table>
{/if}