<script lang="ts" module>
    import type { ClanDTO } from "../../model/records/dtos";
    import type { NewsItem } from "../../model/relations/information";

    // A row of the listing. `knownBy` is empty except in the object-only view,
    // where reports of one event by several clans are coalesced into one row.
    export type NewsRow = {
        entry: NewsItem;
        about: ClanDTO | undefined;
        knownBy: { clan: ClanDTO; entry: NewsItem }[];
        // False once the occasion has run together with the rest into a
        // general impression, and can no longer be recounted on its own.
        recountable: boolean;
    };
</script>

<script lang="ts">
    import type { WorldDTO } from "../../model/records/dtos";
    import { formatYear } from "../../model/records/year";
    import { pct, unsigned } from "../../model/lib/format";

    let {
        rows,
        world,
        showAbout = false,
        showKnownBy = false,
        emptyText = "Nothing remembered.",
    }: {
        rows: NewsRow[];
        world: WorldDTO;
        // Which clan each entry is held about (when listing one clan's view).
        showAbout?: boolean;
        // Which clans hold each entry (when listing everything known about one
        // clan).
        showKnownBy?: boolean;
        emptyText?: string;
    } = $props();

    let now = $derived(world.yearValue);

    function clanName(uuid: string): string {
        return world.clanMap.get(uuid)?.name ?? "?";
    }

    function description(entry: NewsItem): string {
        const target = entry.target ? ` → ${clanName(entry.target)}` : "";
        return `${clanName(entry.actor)}${target}`;
    }

    function hopsLabel(hops: number): string {
        if (hops === 0) return "firsthand";
        return `${hops} link${hops === 1 ? "" : "s"}`;
    }

    function source(entry: NewsItem): string {
        if (entry.hops === 0) return "firsthand";
        return `${hopsLabel(entry.hops)}${entry.via ? ` (via ${clanName(entry.via)})` : ""}`;
    }

    // How the news is spread across the clans that have it, since the
    // coalesced row stands for copies at different removes.
    function sourceSpread(row: NewsRow): string {
        const byHops = new Map<number, number>();
        for (const k of row.knownBy) {
            byHops.set(k.entry.hops, (byHops.get(k.entry.hops) ?? 0) + 1);
        }
        return [...byHops]
            .sort((a, b) => a[0] - b[0])
            .map(([hops, n]) =>
                hops === 0 ? `${n} firsthand` : `${n} at ${hopsLabel(hops)}`,
            )
            .join(", ");
    }

    function knowerLabel(k: { clan: ClanDTO; entry: NewsItem }): string {
        return `${k.clan.name} (${hopsLabel(k.entry.hops)})`;
    }
</script>

{#if rows.length === 0}
    <p style="font-size: 0.9rem; color: #666;">{emptyText}</p>
{:else}
    <div class="table-container">
        <table class="events">
            <thead>
                <tr>
                    <th>Year</th>
                    <th>Age</th>
                    <th>Kind</th>
                    <th>Event</th>
                    <th>Remembered as</th>
                    {#if showAbout}<th>About</th>{/if}
                    {#if showKnownBy}<th>Known by</th>{/if}
                    <th
                        class="num"
                        title="What really happened. The clan itself has only the bands under Remembered as."
                        >Amount</th
                    >
                    <th class="num">Weight</th>
                    <th class="num">Salience</th>
                    <th>Source</th>
                </tr>
            </thead>
            <tbody>
                {#each rows as row}
                    {@const e = row.entry}
                    <tr
                        class={row.recountable ? "" : "forgotten"}
                        title={row.recountable
                            ? ""
                            : "No longer recounted on its own: folded into the general impression."}
                    >
                        <td>{formatYear(e.year)}</td>
                        <td>{now - e.year}</td>
                        <td>{e.def.label}</td>
                        <td>{description(e)}{e.explanation ? `: ${e.explanation}` : ""}</td>
                        <td>{e.description}</td>
                        {#if showAbout}
                            <td>{row.about?.name ?? "?"}</td>
                        {/if}
                        {#if showKnownBy}
                            <td title={row.knownBy.map(knowerLabel).join(", ")}>
                                {row.knownBy.length}: {row.knownBy
                                    .map((k) => k.clan.name)
                                    .join(", ")}
                            </td>
                        {/if}
                        <td class="num">{unsigned(e.magnitude, 1)}</td>
                        <td
                            class="num"
                            title="Decayed to {pct(e.freshness(now))} of the original impression"
                            >{unsigned(e.weight(now), 2)}</td
                        >
                        <td class="num">{unsigned(e.salience, 2)}</td>
                        <td>
                            {showKnownBy && !showAbout ? sourceSpread(row) : source(e)}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
{/if}

<style>
    .table-container {
        overflow-x: auto;
        max-width: 100%;
        width: fit-content;
        border: 1px solid #e2d9c8;
        border-radius: 6px;
        background-color: #faf6ea;
    }
    table {
        border-collapse: collapse;
        font-size: 0.9rem;
    }
    .events th,
    .events td {
        border-bottom: 1px solid #e2d9c8;
        padding: 0.2rem 0.6rem;
        text-align: left;
        white-space: nowrap;
    }
    .events th {
        background-color: #f3edd8;
    }
    .events .num {
        text-align: right;
    }
    /* Occasions that have run together into a general impression. */
    .events tr.forgotten td {
        color: #b3a78e;
        font-style: italic;
    }
</style>
