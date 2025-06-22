<script lang="ts">
    import type { EconomicPolicyDecision } from '../model/people/people';

    let { decision }: {decision: EconomicPolicyDecision} = $props();
</script>

<style>

</style>

<table>
    <thead>
        <tr>
            <th></th>
            <th>Self</th>
            <th>Others</th>
            <th>Hoarded</th>
            <th>Total</th>
    </thead>
    <tbody>
        <tr>
            <td>Share</td>
            <td>{decision.shareSelfReturn.toFixed(1)}</td>
            <td>{decision.shareOthersReturn.toFixed(1)}</td>
            <td></td>
            <td>{decision.shareReturn.toFixed(1)}</td>
        </tr>
        <tr>
            <td>Shirk</td>
            <td>{decision.cheatPotReturn.toFixed(1)}</td>
            <td>{decision.cheatOthersReturn.toFixed(1)}</td>
            <td>{decision.cheatKeepReturn.toFixed(1)}</td>
            <td>{decision.cheatReturn.toFixed(1)}</td>
        </tr>
        <tr>
            <td>Hoard</td>
            <td></td>
            <td></td>
            <td>{decision.keepReturn.toFixed(1)}</td>
            <td>{decision.keepReturn.toFixed(1)}</td>
        </tr>
    </tbody>
</table>
