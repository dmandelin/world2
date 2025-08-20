<script lang="ts">
    import { maxbyWithValue } from "../model/lib/basics";
    import { qolFromPerCapitaGoods } from "../model/people/qol";
    import { clamp } from "../model/lib/basics";

    type Cell = string | {
        value: string;
        bold?: boolean;
        indent?: number;
        color?: string;
    }

    const bonColor = [20, 108, 221];
    const midColor = [20, 20, 20];
    const malColor = [221, 20, 20];
    
    function lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    function colorFor(value: number): string {
        if (value < 0) {
            const t = clamp((value + 5) / 5, 0, 1);
            return `rgb(${lerp(malColor[0], midColor[0], t)}, ${lerp(malColor[1], midColor[1], t)}, ${lerp(malColor[2], midColor[2], t)})`;
        } else {
            const t = clamp(value / 5, 0, 1);
            return `rgb(${lerp(midColor[0], bonColor[0], t)}, ${lerp(midColor[1], bonColor[1], t)}, ${lerp(midColor[2], bonColor[2], t)})`;
        }
    }

    function cellForValue(value: number|undefined): Cell {
        if (value === undefined) {
            return '';
        }
        const formattedValue = value.toFixed(1);
        return {
            value: formattedValue,
            color: colorFor(value),
            indent: 0,
        };
    }

    let { settlement } = $props();
    let rows: Cell[][] = $derived.by(() => {
        const rs: Cell[][] = [];
        const qcs = [...settlement.clans].map(clan => clan.qolCalc);
        const maxLen = maxbyWithValue(qcs, qc => qc.items.length)[1];
        for (let i = 0; i < maxLen; i++) {
            const reprItem = qcs[0].items[i];
            const qolItemLabel = reprItem.name || '';
            let labelCell: Cell = {
                value: qolItemLabel, 
                indent: reprItem.indent,
            };

            const row: Cell[] = [labelCell];
            for (const qc of qcs) {
                row.push(cellForValue(qc.items[i]?.value));
            }
            rs.push(row);

            // Nested goods satisfaction items
            const satItems = reprItem.satisfactionItems;
            if (satItems) {
                for (const [j, item] of satItems.entries()) {
                    const satCell: Cell = {
                        value: item.name,
                        indent: 1,
                    };
                    const satRow: Cell[] = [satCell];
                    for (const qc of qcs) {
                        const satValue = qc.satisfactionItems[j].perCapita;
                        if (satValue === undefined) {
                            satRow.push('');
                        } else {
                            // Format the value to two decimal places
                            satRow.push(`${satValue.toFixed(2)} | ${qolFromPerCapitaGoods(satValue).toFixed(1)}`);
                        }
                    }
                    rs.push(satRow);

                    // Nested subsistence consumption items
                    if (item.name === 'Subsistence') {
                        for (const [k, subItem] of qcs[0].subsistenceItems.entries()) {
                            const subCell: Cell = {
                                value: subItem.name,
                                indent: 2,
                            };
                            const subRow: Cell[] = [subCell];
                            for (const qc of qcs) {
                                const subValue = qc.subsistenceItems[k].perCapita;
                                if (subValue === undefined) {
                                    subRow.push('');
                                } else {
                                    // Format the value to two decimal places
                                    subRow.push(`${subValue.toFixed(2)}`);
                                }
                            }
                            rs.push(subRow);
                        }
                    }
                }
            }
        }

        const totalRow: Cell[] = [{
            value: 'Total',
            bold: true,
        }];
        for (const clan of settlement.clans) {
            const total = clan.qolCalc.value;
            totalRow.push({
                value: total.toFixed(1),
                bold: true,
            });
        }
        rs.push(totalRow);

        return rs;
    });
</script>

<style>
    #top {
        background-color: #f3edd8;
        border: 1px solid #62531d;
        border-radius: 5px;
        padding: 0.25rem;
    }

    table {
        border-collapse: collapse;
    }

    th, td {
        /* border: 1px solid #ddd; */
        text-align: right;
        padding: 0.125em 0.5em;
    }

    th:first-child, td:first-child {
        text-align: left;
    }

    tbody tr:hover {
        background-color: #f1f1f1;
    }
</style>

<div style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
<div id="top">
    <table>
        <thead>
            <tr>
                <th>Source</th>
                {#each settlement.clans as clan}
                <th>{clan.name}</th>
                {/each}
            </tr>
        </thead>
        <tbody>
            {#each rows as row}
            <tr>
                {#each row as cell}
                <td>
                    {#if typeof cell === 'object' && 'value' in cell}
                        <span 
                            style:font-weight={cell.bold ? 'bold' : undefined} 
                            style:padding-left={cell.indent + 'em'}
                            style:color={cell.color}
                        >{cell.value}</span>
                    {:else}
                        {cell}
                    {/if}
                </td>
                {/each}
            </tr>
            {/each}
        </tbody>
    </table>
</div>
</div>