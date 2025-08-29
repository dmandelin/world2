<script>
    import { populationChangeModifierTable, populationChangeTable } from "./tables";

    let { settlement } = $props();
    let table = $derived(populationChangeTable(settlement));
    let brModifiers = $derived(populationChangeModifierTable(
        settlement, 
        clan => clan.lastPopulationChange.brModifiers,
        clan => clan.lastPopulationChange.brModifier));
    let drModifiers = $derived(populationChangeModifierTable(
        settlement, 
        clan => clan.lastPopulationChange.drModifiers,
        clan => clan.lastPopulationChange.drModifier));
</script>

<style>
    td, th {
        text-align: left;
        padding: 0.125em 0.5em;
    }

    td:not(:first-child), th:not(:first-child) {
        text-align: right;
    }

    tr:last-child {
        font-weight: bold;
    }
</style>

<div style="display: flex">
    <div>
        <table>
            <thead>
                <tr>
                    {#each table.header as cell}
                        <th>{cell}</th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each table.rows as row}
                    <tr>
                        {#each row as cell}
                            <td>{cell}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<div style="display: flex; gap: 2rem; margin-top: 1rem;">
    <div>
        <h4>Birth rate modifiers</h4>
        <table>
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Modifier</th>
                </tr>
            </thead>
            <tbody>
                {#each brModifiers.rows as row}
                    <tr>
                        {#each row as cell}
                            <td>{cell}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <div>
        <h4>Death rate modifiers</h4>
        <table>
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Modifier</th>
                </tr>
            </thead>
            <tbody>
                {#each drModifiers.rows as row}
                    <tr>
                        {#each row as cell}
                            <td>{cell}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
