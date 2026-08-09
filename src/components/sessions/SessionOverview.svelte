<script lang="ts">
    import type { RecordingSession } from "../../model/data/sessions";

    let { session }: { session: RecordingSession } = $props();

    function yearLabel(value: number): string {
        return value < 0 ? `${-value} BC` : `${value} AD`;
    }

    function rangeLabel(range: [number, number] | undefined): string {
        return range
            ? `${yearLabel(range[0])} – ${yearLabel(range[1])}`
            : "no data yet";
    }

    const streams = $derived([...session.streams.values()]);
</script>

<div class="overview">
    <h2>{session.name}</h2>

    <table class="meta">
        <tbody>
            <tr>
                <th>Kind</th>
                <td>{session.kind === "live" ? "Live world" : "Generated"}</td>
            </tr>
            <tr>
                <th>Created</th>
                <td>{session.createdAt.toLocaleString()}</td>
            </tr>
            <tr>
                <th>Years covered</th>
                <td>{rangeLabel(session.yearRange)}</td>
            </tr>
            {#if session.params}
                <tr>
                    <th>Parameters</th>
                    <td>
                        {session.params.settlementCount} settlements ×
                        {session.params.clansPerSettlement} clans,
                        {session.params.years} years
                    </td>
                </tr>
            {/if}
            <tr>
                <th>Total snapshots</th>
                <td>{session.totalRows.toLocaleString()}</td>
            </tr>
        </tbody>
    </table>

    <h3>Streams</h3>
    {#if streams.length === 0}
        <p class="empty">No snapshots recorded.</p>
    {:else}
        {#each streams as stream}
            <div class="stream">
                <div class="stream-head">
                    <span class="stream-name">{stream.entityType}</span>
                    <span class="stream-stats">
                        {stream.rowCount.toLocaleString()} snapshots ·
                        {stream.entityCount.toLocaleString()} entities ·
                        {rangeLabel(stream.yearRange)}
                    </span>
                </div>
                <div class="fields">
                    {#each ["year", "uuid", ...stream.fields] as field}
                        <span class="field">{field}</span>
                    {/each}
                </div>
            </div>
        {/each}
    {/if}
</div>

<style>
    .overview {
        max-width: 52rem;
    }

    h2 {
        margin-top: 0;
    }

    table.meta {
        border-collapse: collapse;
        margin-bottom: 1.5rem;
    }

    table.meta th {
        text-align: left;
        color: #62531d;
        font-weight: normal;
        padding: 0.15rem 1.5rem 0.15rem 0;
        vertical-align: top;
        white-space: nowrap;
    }

    table.meta td {
        padding: 0.15rem 0;
    }

    .stream {
        margin-bottom: 1rem;
        padding: 0.6rem 0.8rem;
        border: 2px solid #62531d;
        border-radius: 4px;
        background-color: #fffdf6;
    }

    .stream-head {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
        margin-bottom: 0.4rem;
    }

    .stream-name {
        font-weight: bold;
        text-transform: capitalize;
    }

    .stream-stats {
        font-size: 0.85rem;
        color: #62531d;
    }

    .fields {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
    }

    .field {
        font-family: monospace;
        font-size: 0.75rem;
        padding: 0.05rem 0.35rem;
        border: 1px solid #c9be92;
        border-radius: 3px;
        background-color: #f4efdc;
    }

    .empty {
        color: #62531d;
    }
</style>
