<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { world } from '../model/world';

    let biggestSettlement = $state(world.settlements[0]);
    let biggestClan = $state(world.allClans[0]);
    let mostIntelligentClan = $state(world.allClans[0]);
    let strongestClan = $state(world.allClans[0]);

    function update() {
        try {
            biggestSettlement = world.settlements.reduce((a, b) => a.size > b.size ? a : b);
            biggestClan = world.allClans.reduce((a, b) => a.size > b.size ? a : b);
            mostIntelligentClan = world.allClans.reduce((a, b) => a.intelligence > b.intelligence ? a : b);
            strongestClan = world.allClans.reduce((a, b) => a.strength > b.strength ? a : b);
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
                <td>{biggestSettlement.size} people</td>
            </tr>
            <tr>
                <th>Biggest Clan</th>
                <td>{biggestClan.name} of {biggestClan.settlement?.name}</td>
                <td>{biggestClan.size} people</td>
            </tr>
            <tr>
                <th>Most Intelligent Clan</th>
                <td>{mostIntelligentClan.name} of {mostIntelligentClan.settlement?.name}</td>
                <td>{mostIntelligentClan.intelligence} intelligence</td>
            </tr>
            <tr>
                <th>Strongest Clan</th>
                <td>{strongestClan.name} of {strongestClan.settlement?.name}</td>
                <td>{strongestClan.strength} strength</td>
            </tr>
        </tbody>
    </table>
</div>