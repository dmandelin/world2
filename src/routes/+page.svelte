<h1>world2</h1>

<script lang="ts">
    import { world } from '../model/world';
</script>

<style>
    th, td {
        text-align: left;
    }

    .ra {
        text-align: right;
    }
</style>

<table>
    <thead>
        <tr>
            <th>Clan</th>
            <th class="ra">Size</th>
            <th class="ra">Skill</th>
        </tr>
    </thead>
    <tbody>
        {#each world.clans as clan}
            <tr>
                <td>{clan.name}</td>
                <td class="ra">{clan.size}</td>
                <td class="ra">{clan.skill}</td>
            </tr>
        {/each}
</table>