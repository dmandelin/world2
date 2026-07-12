<script lang="ts">
    import TableView2 from "../tables/TableView2.svelte";
    import { signed } from "../../model/lib/format";
    import type { TableColumn, TableRow } from "../tables/tables2";
    import type { SettlementDTO } from "../../model/records/dtos";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let report = $derived(settlement.newSettlementDecisionReport);

    let table = $derived.by(() => {
        if (!report) return undefined;

        const columns: TableColumn<any, any, any>[] = [
            {
                data: "clanName",
                label: "Clan",
                valueFn: (item: any) => item.clanName,
            },
            {
                data: "stayPut",
                label: "Stay Put Appeal",
                valueFn: (item: any) => item.stayPutAppeal,
                formatFn: (val: number) => signed(val, 1),
            },
            {
                data: "initial",
                label: "Initial Move Appeal (R0)",
                valueFn: (item: any) => ({
                    appeal: item.movingAppeals[0],
                    isTop: item.isTopChoice[0]
                }),
                formatFn: (val: any) => {
                    if (val.appeal === undefined) return '';
                    return `${signed(val.appeal, 1)}${val.isTop ? ' ★' : ''}`;
                }
            }
        ];

        // Add columns for each round run
        for (let r = 1; r <= report.roundsRun; r++) {
            columns.push({
                data: `round_${r}`,
                label: `R${r} Move Appeal`,
                valueFn: (item: any) => ({
                    appeal: item.movingAppeals[r],
                    isTop: item.isTopChoice[r]
                }),
                formatFn: (val: any) => {
                    if (val.appeal === undefined) return '';
                    return `${signed(val.appeal, 1)}${val.isTop ? ' ★' : ''}`;
                }
            });
        }

        columns.push({
            data: "outcome",
            label: "Final Choice",
            valueFn: (item: any) => item.isTopChoice[item.isTopChoice.length - 1],
            formatFn: (val: boolean) => val ? "FOUND NEW" : "STAY PUT",
        });

        const rows: TableRow<any, any>[] = Object.entries(report.items).map(([uuid, item]) => {
            const isMigrating = item.isTopChoice[item.isTopChoice.length - 1];
            return {
                data: item,
                label: item.clanName,
                bold: isMigrating,
            };
        });

        return {
            columns,
            rows,
        };
    });
</script>

<div class="settlement-migration-container">
    {#if report}
        <div class="report-header">
            <h3>Migration Agreement Negotiations</h3>
            <div class="report-meta">
                <span>Rounds Run: <strong>{report.roundsRun}</strong></span>
            </div>
        </div>

        {#if table && table.rows.length > 0}
            <div class="table-wrapper">
                <TableView2 {table} />
            </div>
        {:else}
            <p class="no-data">No clans evaluated migration this turn.</p>
        {/if}
    {:else}
        <p class="no-data">No migration negotiation report available for this turn.</p>
    {/if}
</div>

<style>
    .settlement-migration-container {
        background: #fdfcf7;
        border: 1px solid #dcd7bd;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(98, 83, 29, 0.05);
        color: #2d3748;
        font-family: inherit;
    }

    .report-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        border-bottom: 1px solid #e9e4cd;
        padding-bottom: 0.5rem;
    }

    .report-header h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 600;
        color: #2d3748;
    }

    .report-meta {
        font-size: 0.85rem;
        color: #62531d;
        background-color: #f2ebd5;
        padding: 0.25rem 0.75rem;
        border-radius: 6px;
        border: 1px solid #d2cbb5;
    }

    .table-wrapper {
        background: #f6f1db;
        border-radius: 8px;
        border: 1px solid #e3deca;
        padding: 0.5rem;
        overflow-x: auto;
    }

    .no-data {
        font-style: italic;
        color: #718096;
        text-align: center;
        padding: 2rem;
        margin: 0;
    }

    /* Piercing standard table fonts in the container */
    .settlement-migration-container :global(table) {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    .settlement-migration-container :global(th) {
        text-align: left;
        padding: 0.5rem 0.75rem;
        background: #f2ebd5;
        color: #62531d;
        font-weight: 600;
        border-bottom: 2px solid #d2cbb5;
    }

    .settlement-migration-container :global(td) {
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid #e9e4cd;
    }

    .settlement-migration-container :global(tr:last-child td) {
        border-bottom: none;
    }
</style>
