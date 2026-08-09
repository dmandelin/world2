<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { world } from '../model/worldinstance';

    let biggestSettlement = $state(world.allSettlements[0]);
    let biggestClan = $state(world.allClans[0]);
    let mostPiousClan = $state(world.allClans[0]);
    let mostIntellectualClan = $state(world.allClans[0]);

    function update() {
        try {
            biggestSettlement = world.allSettlements.reduce((a, b) => a.population > b.population ? a : b);
            biggestClan = world.allClans.reduce((a, b) => a.population > b.population ? a : b);
            mostPiousClan = world.allClans.reduce((a, b) => a.traits.piety > b.traits.piety ? a : b);
            mostIntellectualClan = world.allClans.reduce((a, b) => a.traits.intellect > b.traits.intellect ? a : b);
        } catch (e) {
            console.error(e);
        }
    }

    onMount(() => {
        world.watch(update);
        update();
    });

    onDestroy(() => {
        world.unwatch(update);
    });
</script>

<style>
    td, th {
        padding: 0.25em 0.5em;
    }

    th {
        text-align: left;
    }
</style>

<div>
    <h2>Notable settlements and clans</h2>

    <table>
        <tbody>
            <tr>
                <th>Biggest Settlement</th>
                <td>{biggestSettlement.name}</td>
                <td>{biggestSettlement.population} people</td>
            </tr>
            <tr>
                <th>Biggest Clan</th>
                <td>{biggestClan.name} of {biggestClan.settlement?.name}</td>
                <td>{biggestClan.population} people</td>
            </tr>
            <tr>
                <th>Most Pious Clan</th>
                <td>{mostPiousClan.name} of {mostPiousClan.settlement?.name}</td>
                <td>{mostPiousClan.traits.piety} piety</td>
            </tr>
            <tr>
                <th>Most Intellectual Clan</th>
                <td>{mostIntellectualClan.name} of {mostIntellectualClan.settlement?.name}</td>
                <td>{mostIntellectualClan.traits.intellect} intellect</td>
            </tr>
        </tbody>
    </table>
</div>