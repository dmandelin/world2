<script lang="ts">
    // How clique-y the settlement is: whether its clans fall into groups
    // that keep to themselves, or mix evenly. Groups are found by modularity
    // (see model/lib/communities.ts) on whichever tie is chosen, and shown two
    // ways: a ring with each group's clans together, its ties inside the
    // group in the group's color and those across groups in gray; and the
    // tie matrix ordered by group, where cliques show as dark blocks on the
    // diagonal.
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import { pct, signed } from "../model/lib/format";
    import { sortedByKey } from "../model/lib/basics";
    import {
        louvain,
        modularity,
        shuffledModularity,
        withinShare,
    } from "../model/lib/communities";
    import { getRelativeAttention } from "../model/relations/conversation";

    let { settlement }: { settlement: SettlementDTO } = $props();
    let world = $derived(settlement.world);

    type Mode = "Conversation" | "Alignment" | "Affinity";
    const MODES: Mode[] = ["Conversation", "Alignment", "Affinity"];
    let mode: Mode = $state("Conversation");

    // Settlements run small, and within one the ties are much alike, so the
    // groups often show only once the clans of other settlements that these
    // clans know are counted in too.
    type Scope = "Settlement" | "With neighbors";
    const SCOPES: Scope[] = ["Settlement", "With neighbors"];
    let scope: Scope = $state("Settlement");

    function settlementNameOf(clan: ClanDTO): string {
        return world.settlements.find((s) =>
            s.clans.some((c) => c.uuid === clan.uuid))?.name ?? "elsewhere";
    }

    const MODE_NOTES: Record<Mode, string> = {
        Conversation:
            "Conversation strength: the share of each other's people the two clans know.",
        Alignment:
            "Alignment, averaged over both directions. Negative alignment counts as no tie.",
        Affinity:
            "Absolute affinity, averaged over both directions. Negative affinity counts as no tie.",
    };

    // The tie between two clans in the chosen sense, symmetric and never
    // negative, since a group is held together by ties and not by their lack.
    function tie(a: ClanDTO, b: ClanDTO): number {
        switch (mode) {
            case "Conversation":
                return getRelativeAttention(a, b);
            case "Alignment": {
                const ab = world.alignmentToward(a, b)?.value ?? 0;
                const ba = world.alignmentToward(b, a)?.value ?? 0;
                return Math.max(0, (ab + ba) / 2);
            }
            case "Affinity": {
                const ab = world.affinityToward(a, b)?.absolute ?? 0;
                const ba = world.affinityToward(b, a)?.absolute ?? 0;
                return Math.max(0, (ab + ba) / 2);
            }
        }
    }

    function formatTie(v: number): string {
        return mode === "Conversation" ? pct(v) : signed(v, 2);
    }

    // Categorical slots in fixed order; groups past the eighth share a gray.
    const GROUP_COLORS = [
        "#2a78d6", "#eb6834", "#1baf7a", "#eda100",
        "#e87ba4", "#008300", "#4a3aa7", "#e34948",
    ];
    const OTHER_GROUP_COLOR = "#8a8984";
    const groupColor = (g: number) => GROUP_COLORS[g] ?? OTHER_GROUP_COLOR;

    // Sequential blue, light to dark, for tie strength in the matrix.
    const RAMP = [
        "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
        "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281",
        "#0d366b",
    ];
    const EMPTY_CELL = "#f0efec";
    function rampColor(t: number): string {
        if (!(t > 0)) return EMPTY_CELL;
        return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
    }

    interface Group {
        id: number;
        members: number[];
        // Mean share of each member's tie weight that stays in the group.
        insularity: number;
    }

    interface Analysis {
        clans: ClanDTO[];
        // Whether each clan is from another settlement.
        outside: boolean[];
        w: number[][];
        max: number;
        // Clan index -> group id, groups numbered largest first.
        groupOf: number[];
        groups: Group[];
        // Clan indices in display order: by group, then by ties within it.
        order: number[];
        q: number;
        qChance: number;
        within: { actual: number; expected: number };
    }

    let analysis: Analysis = $derived.by(() => {
        // Read the mode here so a change of it reruns the analysis.
        void mode;
        const local = sortedByKey(
            settlement.clans.filter((c) => c.population > 0),
            (c) => c.name,
        );
        const localIds = new Set(local.map((c) => c.uuid));
        const neighbors = new Map<string, ClanDTO>();
        if (scope === "With neighbors") {
            for (const clan of local) {
                for (const [otherID] of world.perceptions.getFor(clan.uuid)) {
                    if (localIds.has(otherID)) continue;
                    const other = world.clanMap.get(otherID);
                    if (other && other.population > 0) neighbors.set(otherID, other);
                }
            }
        }
        const clans = [
            ...local,
            ...sortedByKey([...neighbors.values()], (c) => c.name),
        ];
        const outside = clans.map((c) => !localIds.has(c.uuid));
        const n = clans.length;
        const w = clans.map((a, i) =>
            clans.map((b, j) => (i === j ? 0 : tie(a, b))),
        );
        // Average the two directions, in case a tie is not quite symmetric.
        for (let i = 0; i < n; ++i) {
            for (let j = i + 1; j < n; ++j) {
                const v = (w[i][j] + w[j][i]) / 2;
                w[i][j] = w[j][i] = v;
            }
        }
        const max = Math.max(0, ...w.flat());

        const raw = louvain(w);
        const strength = (i: number) => w[i].reduce((a, b) => a + b, 0);
        const insideOf = (i: number, g: readonly number[]) =>
            w[i].reduce((a, v, j) => (g[j] === g[i] ? a + v : a), 0);

        // Renumber groups largest first, then by total tie weight.
        const byRaw = new Map<number, number[]>();
        raw.forEach((g, i) => byRaw.set(g, [...(byRaw.get(g) ?? []), i]));
        const rawGroups = [...byRaw.values()].sort(
            (a, b) =>
                b.length - a.length ||
                b.reduce((s, i) => s + strength(i), 0) -
                    a.reduce((s, i) => s + strength(i), 0),
        );
        const groupOf = new Array<number>(n).fill(0);
        rawGroups.forEach((members, id) => {
            for (const i of members) groupOf[i] = id;
        });

        const groups: Group[] = rawGroups.map((members, id) => {
            const sorted = [...members].sort(
                (a, b) => insideOf(b, groupOf) - insideOf(a, groupOf),
            );
            const shares = members.map((i) => {
                const s = strength(i);
                return s > 0 ? insideOf(i, groupOf) / s : 0;
            });
            return {
                id,
                members: sorted,
                insularity:
                    shares.reduce((a, b) => a + b, 0) / members.length,
            };
        });

        return {
            clans,
            outside,
            w,
            max,
            groupOf,
            groups,
            order: groups.flatMap((g) => g.members),
            q: modularity(w, groupOf),
            qChance: shuffledModularity(w),
            within: withinShare(w, groupOf),
        };
    });

    // How far past chance the clumping goes, in words.
    let verdict = $derived.by(() => {
        const excess = analysis.q - analysis.qChance;
        if (analysis.max <= 0) return "No ties to group";
        if (excess < 0.05) return "Well mixed: no more clumping than chance";
        if (excess < 0.15) return "Loose groups";
        if (excess < 0.3) return "Clear cliques";
        return "Strongly cliquish";
    });

    // --- Ring -------------------------------------------------------------

    const RING_SIZE = 440;
    const RING_C = RING_SIZE / 2;
    // Room outside the ring for a long clan name.
    const RING_R = RING_C - 88;
    const NODE_R = 7;
    // Ties weaker than this share of the strongest are left off the ring.
    const RING_MIN_SHARE = 0.08;

    interface RingNode {
        index: number;
        x: number;
        y: number;
        lx: number;
        ly: number;
        // Labels run outward along the radius, turned upright on the left.
        rotate: number;
        anchor: "start" | "end";
    }

    let ringNodes: RingNode[] = $derived.by(() => {
        const { order, groupOf, groups } = analysis;
        // One empty slot between groups, so they read as separate arcs.
        const gap = groups.length > 1 ? 1 : 0;
        const slots = order.length + gap * groups.length;
        const nodes: RingNode[] = [];
        let slot = 0;
        order.forEach((index, k) => {
            if (k > 0 && groupOf[index] !== groupOf[order[k - 1]]) slot += gap;
            const angle = (2 * Math.PI * slot) / slots - Math.PI / 2;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            nodes.push({
                index,
                x: RING_C + RING_R * cos,
                y: RING_C + RING_R * sin,
                lx: RING_C + (RING_R + 12) * cos,
                ly: RING_C + (RING_R + 12) * sin,
                rotate: (angle * 180) / Math.PI + (cos >= 0 ? 0 : 180),
                anchor: cos >= 0 ? "start" : "end",
            });
            ++slot;
        });
        return nodes;
    });

    interface RingEdge {
        i: number;
        j: number;
        d: string;
        width: number;
        opacity: number;
        color: string;
        inside: boolean;
    }

    let ringEdges: RingEdge[] = $derived.by(() => {
        const { w, max, groupOf } = analysis;
        if (!(max > 0)) return [];
        const pos = new Map(ringNodes.map((n) => [n.index, n]));
        const edges: RingEdge[] = [];
        for (let i = 0; i < w.length; ++i) {
            for (let j = i + 1; j < w.length; ++j) {
                const t = w[i][j] / max;
                if (t < RING_MIN_SHARE) continue;
                const a = pos.get(i)!;
                const b = pos.get(j)!;
                // Bowed toward the center, so ties across the ring pass
                // through the middle and ties along it hug the rim.
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                const cx = RING_C + 0.35 * (mx - RING_C);
                const cy = RING_C + 0.35 * (my - RING_C);
                const inside = groupOf[i] === groupOf[j];
                edges.push({
                    i,
                    j,
                    d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`,
                    width: 0.75 + 3.5 * t,
                    opacity: 0.2 + 0.7 * t,
                    color: inside ? groupColor(groupOf[i]) : "#9a9993",
                    inside,
                });
            }
        }
        // Ties across groups underneath, so the groups' own ties show.
        return edges.sort(
            (a, b) => Number(a.inside) - Number(b.inside) || a.width - b.width,
        );
    });

    let hoveredClan: number | null = $state(null);

    // --- Matrix -----------------------------------------------------------

    const LABEL_W = 92;
    const STRIP = 6;
    let cell = $derived(
        Math.max(9, Math.min(22, Math.floor(360 / Math.max(1, analysis.order.length)))),
    );
    let matrixSize = $derived(cell * analysis.order.length);

    // Each group's block on the diagonal: where it starts and how many.
    let blocks = $derived.by(() => {
        let start = 0;
        return analysis.groups.map((g) => {
            const b = { id: g.id, start, size: g.members.length };
            start += g.members.length;
            return b;
        });
    });

    // --- Tooltip ----------------------------------------------------------

    let tip: { x: number; y: number; lines: string[] } | null = $state(null);
    let wrapper: HTMLDivElement | null = $state(null);

    function showTip(event: MouseEvent, lines: string[]) {
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        tip = {
            x: event.clientX - rect.left + 14,
            y: event.clientY - rect.top + 14,
            lines,
        };
    }

    function pairTip(event: MouseEvent, i: number, j: number) {
        const { clans, w, groupOf } = analysis;
        const same = groupOf[i] === groupOf[j];
        showTip(event, [
            `${clans[i].name} ↔ ${clans[j].name}`,
            `${mode}: ${formatTie(w[i][j])}`,
            same
                ? `Both in group ${groupOf[i] + 1}`
                : `Groups ${groupOf[i] + 1} and ${groupOf[j] + 1}`,
        ]);
    }

    function clanTip(event: MouseEvent, i: number) {
        const { clans, w, groupOf, max } = analysis;
        const total = w[i].reduce((a, b) => a + b, 0);
        const inside = w[i].reduce(
            (a, v, j) => (groupOf[j] === groupOf[i] ? a + v : a),
            0,
        );
        const strongest = w[i]
            .map((v, j) => ({ v, j }))
            .filter((e) => e.j !== i && e.v > 0)
            .sort((a, b) => b.v - a.v)
            .slice(0, 3)
            .map((e) => `${clans[e.j].name} ${formatTie(e.v)}`);
        hoveredClan = i;
        showTip(event, [
            `${clans[i].name} — group ${groupOf[i] + 1}`,
            ...(analysis.outside[i] ? [`Of ${settlementNameOf(clans[i])}`] : []),
            `${total > 0 ? pct(inside / total) : "—"} of its ties inside the group`,
            ...(max > 0 && strongest.length
                ? [`Strongest: ${strongest.join(", ")}`]
                : []),
        ]);
    }

    function clearTip() {
        tip = null;
        hoveredClan = null;
    }

    const touches = (e: RingEdge, i: number | null) =>
        i === null || e.i === i || e.j === i;

    // Two places, without a stray minus sign on what rounds to nothing.
    const fixed2 = (v: number) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

    // The gauge runs to a little past whichever is larger.
    let gaugeMax = $derived(Math.max(0.6, analysis.q + 0.05));
    let chanceX = $derived(
        Math.max(1, (300 * Math.max(0, analysis.qChance)) / gaugeMax),
    );
</script>

<div class="cliques" bind:this={wrapper}>
    <div class="toolbar">
        <div class="modes">
            {#each MODES as m}
                <button
                    type="button"
                    class="mode-btn"
                    class:active={mode === m}
                    onclick={() => (mode = m)}>{m}</button
                >
            {/each}
        </div>
        <div class="modes">
            {#each SCOPES as sc}
                <button
                    type="button"
                    class="mode-btn"
                    class:active={scope === sc}
                    onclick={() => (scope = sc)}>{sc}</button
                >
            {/each}
        </div>
        <span class="mode-note">{MODE_NOTES[mode]}</span>
    </div>

    {#if analysis.clans.length < 3}
        <p class="empty">Too few clans here to form groups.</p>
    {:else}
        <div class="summary">
            <div class="headline">
                <div class="q-value">{fixed2(analysis.q)}</div>
                <div class="q-text">
                    <div class="verdict">{verdict}</div>
                    <div class="sub">
                        Modularity, against {fixed2(analysis.qChance)} for
                        the same ties dealt out at random
                    </div>
                </div>
            </div>
            <svg class="gauge" viewBox="0 0 300 44" width="300" height="44">
                <text
                    x={Math.min(280, Math.max(16, chanceX))}
                    y="9"
                    text-anchor="middle"
                    class="gauge-label">chance</text
                >
                <rect x="0" y="14" width="300" height="10" rx="4" fill={EMPTY_CELL} />
                <rect
                    x="0"
                    y="14"
                    width={Math.max(0, (300 * analysis.q) / gaugeMax)}
                    height="10"
                    rx="4"
                    fill="#2a78d6"
                />
                <line
                    x1={chanceX}
                    x2={chanceX}
                    y1="11"
                    y2="27"
                    stroke="#0b0b0b"
                    stroke-width="2"
                />
                <text x="0" y="40" class="gauge-label">0</text>
                <text x="300" y="40" text-anchor="end" class="gauge-label"
                    >{gaugeMax.toFixed(1)}</text
                >
            </svg>
            <div class="facts">
                <span
                    ><b>{analysis.groups.length}</b>
                    {analysis.groups.length === 1 ? "group" : "groups"}</span
                >
                <span class="sep">·</span>
                <span
                    ><b>{pct(analysis.within.actual)}</b> of tie weight inside
                    groups, against {pct(analysis.within.expected)} if clans mixed
                    at random</span
                >
            </div>
        </div>

        <div class="figures">
            <figure>
                <figcaption>Clans by group</figcaption>
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <svg
                    width={RING_SIZE}
                    height={RING_SIZE}
                    viewBox="0 0 {RING_SIZE} {RING_SIZE}"
                    onmouseleave={clearTip}
                >
                    {#each ringEdges as e (`${e.i}-${e.j}`)}
                        <path
                            d={e.d}
                            fill="none"
                            stroke={e.color}
                            stroke-width={e.width}
                            stroke-linecap="round"
                            opacity={touches(e, hoveredClan)
                                ? e.opacity
                                : 0.05}
                        />
                    {/each}
                    {#each ringNodes as node (node.index)}
                        {@const clan = analysis.clans[node.index]}
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <g
                            class="ring-node"
                            onmouseenter={(ev) => clanTip(ev, node.index)}
                            onmousemove={(ev) => clanTip(ev, node.index)}
                            onmouseleave={clearTip}
                        >
                            <circle cx={node.x} cy={node.y} r={NODE_R + 6} fill="transparent" />
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={NODE_R}
                                fill={analysis.outside[node.index]
                                    ? "#ffffff"
                                    : groupColor(analysis.groupOf[node.index])}
                                stroke={analysis.outside[node.index]
                                    ? groupColor(analysis.groupOf[node.index])
                                    : "#ffffff"}
                                stroke-width={analysis.outside[node.index] ? 2.5 : 2}
                            />
                            <text
                                x={node.lx}
                                y={node.ly}
                                dy="3.5"
                                transform="rotate({node.rotate} {node.lx} {node.ly})"
                                text-anchor={node.anchor}
                                class="ring-label"
                                class:outside={analysis.outside[node.index]}
                                class:faded={hoveredClan !== null &&
                                    hoveredClan !== node.index &&
                                    analysis.w[hoveredClan][node.index] <
                                        RING_MIN_SHARE * analysis.max}
                                >{clan.name}</text
                            >
                        </g>
                    {/each}
                </svg>
                <div class="caption-note">
                    Ties inside a group in its color, across groups in gray;
                    thicker is stronger. Hollow, italic clans are from other
                    settlements. Ties under {pct(RING_MIN_SHARE)} of the
                    strongest are left off.
                </div>
            </figure>

            <figure>
                <figcaption>Ties, ordered by group</figcaption>
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <svg
                    width={LABEL_W + STRIP + 2 + matrixSize + 2}
                    height={STRIP + 2 + matrixSize + 2}
                    onmouseleave={clearTip}
                >
                    <g transform="translate({LABEL_W + STRIP + 2}, 0)">
                        {#each analysis.order as j, c (j)}
                            <rect
                                x={c * cell}
                                y="0"
                                width={cell - 1}
                                height={STRIP}
                                fill={groupColor(analysis.groupOf[j])}
                            />
                        {/each}
                    </g>
                    {#each analysis.order as i, r (i)}
                        <text
                            x={LABEL_W - 4}
                            y={STRIP + 2 + r * cell + cell / 2 + 3.5}
                            text-anchor="end"
                            class="matrix-label"
                            class:outside={analysis.outside[i]}
                            >{analysis.clans[i].name}</text
                        >
                        <rect
                            x={LABEL_W}
                            y={STRIP + 2 + r * cell}
                            width={STRIP}
                            height={cell - 1}
                            fill={groupColor(analysis.groupOf[i])}
                        />
                    {/each}
                    <g transform="translate({LABEL_W + STRIP + 2}, {STRIP + 2})">
                        {#each analysis.order as i, r (i)}
                            {#each analysis.order as j, c (j)}
                                {#if i !== j}
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <rect
                                        x={c * cell}
                                        y={r * cell}
                                        width={cell - 1}
                                        height={cell - 1}
                                        rx="1.5"
                                        fill={rampColor(
                                            analysis.max > 0
                                                ? analysis.w[i][j] / analysis.max
                                                : 0,
                                        )}
                                        onmouseenter={(ev) => pairTip(ev, i, j)}
                                        onmousemove={(ev) => pairTip(ev, i, j)}
                                    />
                                {/if}
                            {/each}
                        {/each}
                        {#each blocks as b (b.id)}
                            <rect
                                x={b.start * cell - 1}
                                y={b.start * cell - 1}
                                width={b.size * cell + 1}
                                height={b.size * cell + 1}
                                fill="none"
                                stroke={groupColor(b.id)}
                                stroke-width="2"
                                rx="2"
                                pointer-events="none"
                            />
                        {/each}
                    </g>
                </svg>
                <div class="ramp-legend">
                    <span>weaker</span>
                    {#each RAMP as color}
                        <span class="ramp-swatch" style="background: {color};"></span>
                    {/each}
                    <span>stronger</span>
                </div>
                <div class="caption-note">
                    Cliques show as dark blocks on the diagonal, outlined in
                    their group's color; dark cells off the blocks are ties
                    across groups.
                </div>
            </figure>
        </div>

        <table class="groups">
            <thead>
                <tr>
                    <th>Group</th>
                    <th>Clans</th>
                    <th title="Mean share of each member's tie weight that stays inside the group">
                        Kept inside
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each analysis.groups as g (g.id)}
                    <tr>
                        <td>
                            <span class="swatch" style="background: {groupColor(g.id)};"></span>
                            {g.id + 1}
                        </td>
                        <td>
                            {#each g.members as i, k (i)}{k > 0 ? ", " : ""}<span
                                    class:outside={analysis.outside[i]}
                                    >{analysis.clans[i].name}</span
                                >{/each}
                        </td>
                        <td class="num">{pct(g.insularity)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}

    {#if tip}
        <div class="tip" style="left: {tip.x}px; top: {tip.y}px;">
            {#each tip.lines as line, k}
                <div class:tip-title={k === 0}>{line}</div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .cliques {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        color: #1f2328;
        user-select: none;
    }

    .toolbar {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        flex-wrap: wrap;
    }

    .modes {
        display: flex;
        gap: 0.25rem;
        padding: 0.2rem;
        background: #f0efec;
        border-radius: 5px;
    }

    .mode-btn {
        all: unset;
        font-size: 0.9rem;
        padding: 0.25rem 0.75rem;
        cursor: pointer;
        border-radius: 3px;
        color: #333;
    }

    .mode-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }

    .mode-btn.active {
        font-weight: bold;
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .mode-note {
        font-size: 0.85rem;
        color: #52514e;
    }

    .empty {
        color: #52514e;
    }

    .summary {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .headline {
        display: flex;
        align-items: baseline;
        gap: 0.8rem;
    }

    .q-value {
        font-size: 2.2rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        line-height: 1;
    }

    .verdict {
        font-size: 1.05rem;
        font-weight: 600;
    }

    .sub,
    .facts {
        font-size: 0.85rem;
        color: #52514e;
    }

    .facts b {
        color: #1f2328;
    }

    .sep {
        margin: 0 0.35rem;
    }

    .gauge-label {
        font-size: 9px;
        fill: #52514e;
    }

    .figures {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        align-items: flex-start;
    }

    figure {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    figcaption {
        font-size: 0.9rem;
        font-weight: 600;
    }

    .caption-note {
        font-size: 0.8rem;
        color: #52514e;
        max-width: 26rem;
    }

    .ring-node {
        cursor: default;
    }

    .ring-label {
        font-size: 10px;
        fill: #1f2328;
    }

    .ring-label.outside,
    .matrix-label.outside {
        font-style: italic;
    }

    .ring-label.faded {
        fill: #b5b4ae;
    }

    .matrix-label {
        font-size: 10px;
        fill: #1f2328;
    }

    .ramp-legend {
        display: flex;
        align-items: center;
        gap: 1px;
        font-size: 0.75rem;
        color: #52514e;
    }

    .ramp-legend span:first-child {
        margin-right: 0.35rem;
    }

    .ramp-legend span:last-child {
        margin-left: 0.35rem;
    }

    .ramp-swatch {
        width: 12px;
        height: 10px;
        border-radius: 2px;
    }

    .groups {
        border-collapse: collapse;
        font-size: 0.85rem;
        width: fit-content;
    }

    .groups th {
        text-align: left;
        font-weight: 600;
        color: #52514e;
        padding: 0.2rem 0.8rem 0.2rem 0;
        border-bottom: 1px solid #ddd;
    }

    .groups td {
        padding: 0.25rem 0.8rem 0.25rem 0;
        vertical-align: top;
    }

    .groups .outside {
        font-style: italic;
    }

    .groups .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .swatch {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        margin-right: 0.3rem;
        vertical-align: -1px;
    }

    .tip {
        position: absolute;
        pointer-events: none;
        background: rgba(255, 255, 255, 0.97);
        border: 1px solid #bbb;
        border-radius: 5px;
        padding: 0.4rem 0.6rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        font-size: 0.8rem;
        color: #1f2328;
        z-index: 100;
        max-width: 18rem;
    }

    .tip-title {
        font-weight: 600;
        margin-bottom: 0.15rem;
    }
</style>
