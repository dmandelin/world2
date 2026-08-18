<script lang="ts">
    import type { ClanDTO, Impression, SettlementDTO } from "../model/records/dtos";
    import type { MemoryEntry } from "../model/relations/information";
    import { formatYear } from "../model/records/year";
    import { sortedByKey } from "../model/lib/basics";
    import { pct, signed, unsigned } from "../model/lib/format";
    import type {
        Observation,
        ObservationUpdate,
    } from "../model/relations/information";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);
    let now = $derived(world.yearValue);

    let subject: ClanDTO | undefined = $state(undefined);
    let object: ClanDTO | undefined = $state(undefined);

    // Selections survive a turn advance, but the DTOs don't, so re-resolve
    // them by uuid against the current snapshot.
    function resolve(clan: ClanDTO | undefined): ClanDTO | undefined {
        return clan ? world.clanMap.get(clan.uuid) : undefined;
    }
    let subj = $derived(resolve(subject));
    let obj = $derived(resolve(object));

    const inSettlement = $derived(new Set(settlement.clans.map((c) => c.uuid)));

    // Grid axes: everyone in the settlement, plus any outside clan a
    // settlement clan has a ledger with (aid can cross settlements).
    let axisClans = $derived.by(() => {
        const outside = new Map<string, ClanDTO>();
        for (const clan of settlement.clans) {
            for (const [other] of world.memoriesFor(clan)) {
                if (!inSettlement.has(other.uuid)) outside.set(other.uuid, other);
            }
        }
        return [
            ...sortedByKey(settlement.clans, (c) => c.name),
            ...sortedByKey([...outside.values()], (c) => c.name),
        ];
    });

    // Recountable and total counts for every pair on the grid, worked out
    // once per render: each answer costs a sort of the whole ledger, and the
    // grid asks for all of them.
    let ledgerCounts = $derived.by(() => {
        const counts = new Map<string, { recountable: number; total: number }>();
        for (const row of axisClans) {
            for (const col of axisClans) {
                if (row.uuid === col.uuid) continue;
                const memory = world.memoryToward(row, col);
                if (!memory) continue;
                counts.set(`${row.uuid}|${col.uuid}`, {
                    recountable: world.recountableIds(row, col).size,
                    total: memory.entries.length,
                });
            }
        }
        return counts;
    });

    function countsFor(row: ClanDTO, col: ClanDTO) {
        return ledgerCounts.get(`${row.uuid}|${col.uuid}`);
    }

    // What the grid shows: occasions the clan can still recount, not the
    // whole ledger. The rest have run together into its impressions.
    function eventCount(row: ClanDTO, col: ClanDTO): number {
        if (row.uuid === col.uuid) return -1;
        return countsFor(row, col)?.recountable ?? 0;
    }

    // A clan is never both sides of a pairing, so picking one side drops the
    // other if they'd collide.
    function toggleSubject(clan: ClanDTO) {
        subject = subject?.uuid === clan.uuid ? undefined : clan;
        if (subject && object?.uuid === subject.uuid) object = undefined;
    }

    function toggleObject(clan: ClanDTO) {
        object = object?.uuid === clan.uuid ? undefined : clan;
        if (object && subject?.uuid === object.uuid) subject = undefined;
    }

    function selectCell(row: ClanDTO, col: ClanDTO) {
        if (subject?.uuid === row.uuid && object?.uuid === col.uuid) {
            subject = undefined;
            object = undefined;
        } else {
            subject = row;
            object = col;
        }
    }

    // A row of the listing. `knownBy` is empty except in the object-only view,
    // where reports of one event by several clans are coalesced into one row.
    type Row = {
        entry: MemoryEntry;
        about: ClanDTO | undefined;
        knownBy: { clan: ClanDTO; entry: MemoryEntry }[];
        // False once the occasion has run together with the rest into a
        // general impression, and can no longer be recounted on its own.
        recountable: boolean;
    };

    function byYearDesc(rows: Row[]): Row[] {
        return rows.sort((a, b) => b.entry.year - a.entry.year);
    }

    let rows = $derived.by((): Row[] => {
        // Working out which occasions a clan can still recount means sorting
        // its whole ledger, and the object view asks the same question once
        // per knower per event, so keep the answers for the pass.
        const recountableCache = new Map<string, Set<number>>();
        const recountable = (of: ClanDTO, about: ClanDTO): Set<number> => {
            const key = `${of.uuid}|${about.uuid}`;
            let ids = recountableCache.get(key);
            if (!ids) recountableCache.set(key, ids = world.recountableIds(of, about));
            return ids;
        };

        if (subj && obj) {
            const memory = world.memoryToward(subj, obj);
            if (!memory) return [];
            const kept = recountable(subj, obj);
            return byYearDesc(
                memory.entries.map((entry) => ({
                    entry,
                    about: obj,
                    knownBy: [],
                    recountable: kept.has(entry.eventId),
                })),
            );
        }

        if (subj) {
            const out: Row[] = [];
            for (const [other, memory] of world.memoriesFor(subj)) {
                const kept = recountable(subj, other);
                for (const entry of memory.entries) {
                    out.push({
                        entry,
                        about: other,
                        knownBy: [],
                        recountable: kept.has(entry.eventId),
                    });
                }
            }
            return byYearDesc(out);
        }

        if (obj) {
            return byYearDesc(
                world
                    .eventsInvolving(obj)
                    .map(({ entry, knownBy }) => ({
                        entry,
                        about: undefined,
                        knownBy,
                        // Recountable by anyone who still holds it as an
                        // occasion rather than only as an impression.
                        recountable: knownBy.some((k) =>
                            recountable(k.clan, obj!).has(entry.eventId),
                        ),
                    })),
            );
        }

        return [];
    });

    function clanName(uuid: string): string {
        return world.clanMap.get(uuid)?.name ?? "?";
    }

    function description(entry: MemoryEntry): string {
        const target = entry.target ? ` → ${clanName(entry.target)}` : "";
        return `${clanName(entry.actor)}${target}`;
    }

    // One line per report that came in this turn, for the Heard tooltip.
    function reportDetail(u: ObservationUpdate): string {
        const teller = u.source ? clanName(u.source) : "own eyes";
        const cred =
            u.credence === undefined ? "" : `, credence ${unsigned(u.credence, 2)}`;
        const shift = u.valueAfter - u.valueBefore;
        return (
            `${teller}: said ${unsigned(u.reported, 1)}` +
            ` (weight ${unsigned(u.weight, 3)}, agreement ${signed(u.agreement, 2)}${cred})` +
            ` → belief ${unsigned(u.valueBefore, 1)} ${signed(shift, 1)}` +
            `, confidence ${pct(u.confidenceBefore)} ${signed(u.confidenceAfter - u.confidenceBefore, 3)}`
        );
    }

    function reportsTooltip(o: Observation): string {
        const heard = o.reportsHeard;
        if (heard.length === 0) return "Nothing heard from anyone this turn.";
        return heard.map(reportDetail).join("\n");
    }

    function heardSummary(o: Observation): string {
        const heard = o.reportsHeard;
        if (heard.length === 0) return "—";
        const mean =
            heard.reduce((sum, u) => sum + u.reported, 0) / heard.length;
        return `${heard.length} @ ${unsigned(mean, 1)}`;
    }

    // Net movement of the belief across everything taken in this turn.
    function turnShift(o: Observation): number | undefined {
        if (o.updates.length === 0) return undefined;
        return (
            o.updates[o.updates.length - 1].valueAfter - o.updates[0].valueBefore
        );
    }

    function turnConfidenceShift(o: Observation): number | undefined {
        if (o.updates.length === 0) return undefined;
        return (
            o.updates[o.updates.length - 1].confidenceAfter -
            o.updates[0].confidenceBefore
        );
    }

    // Why the acted-on figure differs from the raw running belief, which
    // depends on how the quality is estimated.
    function thinksTooltip(o: Observation): string {
        if (o.def.mode === "average") {
            return (
                `Running mean over ${unsigned(o.yearsSeen, 0)} years seen,` +
                ` plus ${unsigned(o.def.priorYears, 2)} years of weight on the` +
                ` prior of ${o.def.prior}. Acted on as it stands, since the` +
                ` prior is already inside the mean.`
            );
        }
        return (
            `Running belief ${unsigned(o.value, 1)}, pulled toward the prior` +
            ` of ${o.def.prior} by less-than-full confidence.`
        );
    }

    function hopsLabel(hops: number): string {
        if (hops === 0) return "firsthand";
        return `${hops} link${hops === 1 ? "" : "s"}`;
    }

    function source(entry: MemoryEntry): string {
        if (entry.hops === 0) return "firsthand";
        return `${hopsLabel(entry.hops)}${entry.via ? ` (via ${clanName(entry.via)})` : ""}`;
    }

    // How the news is spread across the clans that have it, since the
    // coalesced row stands for copies at different removes.
    function sourceSpread(row: Row): string {
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

    function knowerLabel(k: { clan: ClanDTO; entry: MemoryEntry }): string {
        return `${k.clan.name} (${hopsLabel(k.entry.hops)})`;
    }

    // Impressions to list, following the same subject/object selection as the
    // events below them.
    let impressions = $derived.by((): Impression[] => {
        if (subj && obj) return world.impressions(subj, obj);
        if (subj) {
            return axisClans
                .filter((c) => c.uuid !== subj!.uuid)
                .flatMap((c) => world.impressions(subj!, c));
        }
        if (obj) {
            return axisClans
                .filter((c) => c.uuid !== obj!.uuid)
                .flatMap((c) => world.impressions(c, obj!));
        }
        return [];
    });

    let listingTitle = $derived.by(() => {
        if (subj && obj) return `What ${subj.name} knows about ${obj.name}`;
        if (subj) return `Everything ${subj.name} knows`;
        if (obj) return `Everything anyone knows about ${obj.name}`;
        return "";
    });
</script>

<div style="padding: 1rem 2rem;">
    <div
        style="display: flex; flex-direction: row; align-items: center; gap: 1rem; margin-bottom: 0.5rem;"
    >
        <h3 style="margin: 0;">Information</h3>
        {#if subj || obj}
            <button
                type="button"
                class="clear-btn"
                onclick={() => {
                    subject = undefined;
                    object = undefined;
                }}>Clear selection</button
            >
        {/if}
    </div>

    <p style="font-size: 0.9rem; color: #666; margin: 0 0 1rem 0;">
        Occasions each clan (row) can still recount about another (column);
        the rest have run together into its impressions. Click a cell
        for one pair, a row header for everything that clan knows, or a column
        header for everything known about that clan. Clans from outside this
        settlement are marked with an asterisk (*).
    </p>

    <div class="table-container">
        <table class="grid">
            <thead>
                <tr>
                    <th class="corner">knows about →</th>
                    {#each axisClans as col}
                        <th
                            class="colhead {obj?.uuid === col.uuid
                                ? 'sel'
                                : ''} {inSettlement.has(col.uuid)
                                ? ''
                                : 'outside'}"
                            onclick={() => toggleObject(col)}
                            title="Everything known about {col.name}"
                        >
                            {col.name}{inSettlement.has(col.uuid) ? "" : " *"}
                        </th>
                    {/each}
                </tr>
            </thead>
            <tbody>
                {#each axisClans as row}
                    <tr>
                        <th
                            class="rowhead {subj?.uuid === row.uuid
                                ? 'sel'
                                : ''} {inSettlement.has(row.uuid)
                                ? ''
                                : 'outside'}"
                            onclick={() => toggleSubject(row)}
                            title="Everything {row.name} knows"
                        >
                            {row.name}{inSettlement.has(row.uuid) ? "" : " *"}
                        </th>
                        {#each axisClans as col}
                            {@const n = eventCount(row, col)}
                            {#if n < 0}
                                <td class="self"></td>
                            {:else}
                                <td
                                    class="cell {subj?.uuid === row.uuid &&
                                    obj?.uuid === col.uuid
                                        ? 'sel'
                                        : ''} {n === 0 ? 'empty' : ''}"
                                    onclick={() => selectCell(row, col)}
                                    title="{row.name} can still recount {n} occasion{n ===
                                    1
                                        ? ''
                                        : 's'} about {col.name}, out of {countsFor(
                                        row,
                                        col,
                                    )?.total ?? 0} still carried"
                                >
                                    {n === 0 ? "" : n}
                                </td>
                            {/if}
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    {#if subj || obj}
        <h4 style="margin: 1.5rem 0 0.5rem 0;">Impressions</h4>
        {#if impressions.length === 0}
            <p style="font-size: 0.9rem; color: #666;">
                No impressions formed yet.
            </p>
        {:else}
            <div class="table-container">
                <table class="events impressions">
                    <thead>
                        <tr>
                            {#if !subj}<th>Held by</th>{/if}
                            {#if !obj}<th>About</th>{/if}
                            <th>Quality</th>
                            <th class="num">Saw</th>
                            <th class="num">Heard</th>
                            <th class="num">Thinks</th>
                            <th class="num">Moved</th>
                            <th class="num">Confidence</th>
                            <th class="num">Actually</th>
                            <th class="num">Off by</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each impressions as im}
                            {@const o = im.observation}
                            {@const own = o.ownLook}
                            {@const shift = turnShift(o)}
                            {@const confShift = turnConfidenceShift(o)}
                            <tr>
                                {#if !subj}<td>{im.subject.name}</td>{/if}
                                {#if !obj}<td>{im.object.name}</td>{/if}
                                <td>{o.def.label}</td>
                                <td
                                    class="num"
                                    title={own
                                        ? reportDetail(own)
                                        : "No direct look this turn."}
                                    >{own ? unsigned(own.reported, 1) : "—"}</td
                                >
                                <td
                                    class="num {o.reportsHeard.length
                                        ? 'heard'
                                        : ''}"
                                    title={reportsTooltip(o)}
                                    >{heardSummary(o)}</td
                                >
                                <td class="num" title={thinksTooltip(o)}
                                    >{unsigned(o.estimate, 1)}</td
                                >
                                <td class="num"
                                    >{shift === undefined
                                        ? "—"
                                        : signed(shift, 1)}</td
                                >
                                <td class="num">
                                    {pct(o.confidence)}
                                    {#if confShift !== undefined && Math.abs(confShift) >= 0.0005}
                                        <span
                                            class={confShift < 0
                                                ? "conf-down"
                                                : "conf-up"}
                                            >{signed(confShift * 100, 1)}</span
                                        >
                                    {/if}
                                </td>
                                <td class="num"
                                    >{im.trueValue === undefined
                                        ? "—"
                                        : unsigned(im.trueValue, 0)}</td
                                >
                                <td class="num"
                                    >{im.trueValue === undefined
                                        ? "—"
                                        : unsigned(
                                              Math.abs(o.estimate - im.trueValue),
                                              1,
                                          )}</td
                                >
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}

        <h4 style="margin: 1.5rem 0 0.5rem 0;">
            {listingTitle}
            <span style="font-weight: normal; color: #666;"
                >({rows.length} event{rows.length === 1 ? "" : "s"})</span
            >
        </h4>
        {#if rows.length === 0}
            <p style="font-size: 0.9rem; color: #666;">Nothing remembered.</p>
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
                            {#if subj && !obj}<th>About</th>{/if}
                            {#if obj && !subj}<th>Known by</th>{/if}
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
                                {#if subj && !obj}
                                    <td>{row.about?.name ?? "?"}</td>
                                {/if}
                                {#if obj && !subj}
                                    <td
                                        title={row.knownBy
                                            .map(knowerLabel)
                                            .join(", ")}
                                    >
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
                                    {obj && !subj ? sourceSpread(row) : source(e)}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    {/if}
</div>

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
    .grid th,
    .grid td {
        border: 1px solid #e2d9c8;
        padding: 0.2rem 0.5rem;
        text-align: center;
        white-space: nowrap;
    }
    .grid .corner {
        font-weight: normal;
        font-style: italic;
        color: #666;
        text-align: right;
    }
    .grid .colhead,
    .grid .rowhead {
        cursor: pointer;
        background-color: #f3edd8;
    }
    .grid .rowhead {
        text-align: left;
    }
    .grid .colhead:hover,
    .grid .rowhead:hover,
    .grid .cell:hover {
        background-color: #e8dfc4;
    }
    .grid .outside {
        color: #8a7a5f;
    }
    .grid .cell {
        cursor: pointer;
    }
    .grid .cell.empty {
        color: #b3a78e;
    }
    .grid .self {
        background-color: #efe9d8;
    }
    .grid .sel {
        background-color: #d8c9a0;
        font-weight: bold;
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
    /* Cells whose tooltip has the reports behind them. */
    .events .heard {
        cursor: help;
        text-decoration: underline dotted #a89772;
    }
    .conf-up {
        color: #2f6b2f;
        font-size: 0.85em;
    }
    .conf-down {
        color: #b30000;
        font-size: 0.85em;
    }
    .clear-btn {
        all: unset;
        font-size: 0.85rem;
        padding: 0.2rem 0.6rem;
        cursor: pointer;
        border-radius: 3px;
        background-color: #f3edd8;
        color: #333;
    }
    .clear-btn:hover {
        background-color: #e8dfc4;
    }
</style>
