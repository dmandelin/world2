<script lang="ts">
    import { rpct } from "../model/format";

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

<h4>Economic policy decision</h4>

<table style="margin-bottom: 1em">
    <tbody>
        <tr><th>Keep return</th><th>{clan.economicPolicyDecision.keepReturn.toFixed()}</th></tr>
        <tr><td>Share self return</td><td>{clan.economicPolicyDecision.shareSelfReturn.toFixed()}</td></tr>
        <tr><td>Share others return</td><td>{clan.economicPolicyDecision.shareOthersReturn.toFixed()}</td></tr>
        <tr><th>Share return</th><th>{clan.economicPolicyDecision.shareReturn.toFixed()}</th></tr>
        <tr><td>Cheat keep return</td><td>{clan.economicPolicyDecision.cheatKeepReturn.toFixed()}</td></tr>
        <tr><td>Cheat shared return</td><td>{clan.economicPolicyDecision.cheatPotReturn.toFixed()}</td></tr>
        <tr><td>Cheat others return</td><td>{clan.economicPolicyDecision.cheatOthersReturn.toFixed()}</td></tr>
        <tr><th>Cheat return</th><th>{clan.economicPolicyDecision.cheatReturn.toFixed()}</th></tr>

    </tbody>
</table>

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

        <tr>
            <th class="la">Relatedness</th>
            {#each clan.assessments as a}
            <th class="ra">{rpct(a.r)}</th>
            {/each}
        </tr>
    </tbody>
</table>
{/if}