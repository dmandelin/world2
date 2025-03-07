<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import { world } from '../model/world';

    let biggestSettlement = $state(world.settlements[0]);
    let biggestClan = $state(world.allClans[0]);
    let mostKnowledgeableClan = $state(world.allClans[0]);
    let mostSkilledClan = $state(world.allClans[0]);

    function update() {
        try {
            biggestSettlement = world.settlements.reduce((a, b) => a.size > b.size ? a : b);
            biggestClan = world.allClans.reduce((a, b) => a.size > b.size ? a : b);
            mostKnowledgeableClan = world.allClans.reduce((a, b) => a.knowledge > b.knowledge ? a : b);
            mostSkilledClan = world.allClans.reduce((a, b) => a.skill > b.skill ? a : b);
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
                <th>Most Knowledgeable Clan</th>
                <td>{mostKnowledgeableClan.name} of {mostKnowledgeableClan.settlement?.name}</td>
                <td>{mostKnowledgeableClan.knowledge} knowledge</td>
            </tr>
            <tr>
                <th>Most Skilled Clan</th>
                <td>{mostSkilledClan.name} of {mostSkilledClan.settlement?.name}</td>
                <td>{mostSkilledClan.skill} skill</td>
            </tr>
        </tbody>
    </table>
</div>