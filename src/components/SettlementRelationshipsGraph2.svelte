<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { ClanDTO, SettlementDTO } from "../model/records/dtos";
    import { signed } from "../model/lib/format";

    let { settlement }: { settlement: SettlementDTO } = $props();

    const width = 700;
    const height = 550;
    const cx = width / 2;
    const cy = height / 2;
    const nodeRadius = 24;
    const arrowOffset = 5;

    // 9 color shades for alignment values [-1, 1]
    const PALETTE = [
        "#b2182b", // 0: Dark red (-1.0 to -0.78)
        "#d6604d", // 1: Red (-0.78 to -0.56)
        "#f4a582", // 2: Light red (-0.56 to -0.33)
        "#fddbc7", // 3: Soft red (-0.33 to -0.11)
        "#808080", // 4: Neutral gray (-0.11 to +0.11)
        "#d1e5f0", // 5: Soft blue (+0.11 to +0.33)
        "#92c5de", // 6: Light blue (+0.33 to +0.56)
        "#4393c3", // 7: Blue (+0.56 to +0.78)
        "#2166ac", // 8: Dark blue (+0.78 to +1.0)
    ];

    function getPaletteIndex(val: number): number {
        const clamped = Math.max(-1, Math.min(1, val));
        const idx = Math.floor(((clamped + 1) / 2) * 9);
        return Math.min(8, Math.max(0, idx));
    }

    function getAlignmentColor(val: number): string {
        return PALETTE[getPaletteIndex(val)];
    }

    interface NodePos {
        clan: ClanDTO;
        x: number;
        y: number;
        vx: number;
        vy: number;
        isDragging?: boolean;
    }

    interface PairData {
        clanA: ClanDTO;
        clanB: ClanDTO;
        alignAtoB: number;
        alignBtoA: number;
        forceA: number;
        forceB: number;
        // Half-arrow geometry A -> B
        line1: { x1: number; y1: number; x2: number; y2: number; color: string; colorIdx: number };
        // Half-arrow geometry B -> A
        line2: { x1: number; y1: number; x2: number; y2: number; color: string; colorIdx: number };
        midX: number;
        midY: number;
    }

    let nodes = $state<NodePos[]>([]);
    let pairs = $state<PairData[]>([]);
    let hoveredPair = $state<{ pair: PairData; mouseX: number; mouseY: number } | null>(null);
    let isPaused = $state(false);

    let animationFrameId: number | null = null;
    let draggedNodeIndex: number | null = null;
    let svgElement: SVGSVGElement | null = null;

    let currentSettlementUuid = "";

    function getAlignment(fromClan: ClanDTO, toClan: ClanDTO): number {
        return settlement.world.alignmentToward(fromClan, toClan)?.value ?? 0;
    }

    function calculatePairs(currentNodes: NodePos[]): PairData[] {
        const newPairs: PairData[] = [];
        for (let i = 0; i < currentNodes.length; i++) {
            for (let j = i + 1; j < currentNodes.length; j++) {
                const nA = currentNodes[i];
                const nB = currentNodes[j];

                const dx = nB.x - nA.x;
                const dy = nB.y - nA.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) continue;

                const ux = dx / dist;
                const uy = dy / dist;
                const nx = -uy;
                const ny = ux;

                const alignAtoB = getAlignment(nA.clan, nB.clan);
                const alignBtoA = getAlignment(nB.clan, nA.clan);

                const forceA = 4.0 * alignAtoB;
                const forceB = 4.0 * alignBtoA;

                const idx1 = getPaletteIndex(alignAtoB);
                const idx2 = getPaletteIndex(alignBtoA);

                // Half-arrow 1: A -> B (offset by +arrowOffset along normal)
                const x1_a = nA.x + nodeRadius * ux + arrowOffset * nx;
                const y1_a = nA.y + nodeRadius * uy + arrowOffset * ny;
                const x2_a = nB.x - (nodeRadius + 6) * ux + arrowOffset * nx;
                const y2_a = nB.y - (nodeRadius + 6) * uy + arrowOffset * ny;

                // Half-arrow 2: B -> A (offset by -arrowOffset along normal)
                const x1_b = nB.x - nodeRadius * ux - arrowOffset * nx;
                const y1_b = nB.y - nodeRadius * uy - arrowOffset * ny;
                const x2_b = nA.x + (nodeRadius + 6) * ux - arrowOffset * nx;
                const y2_b = nA.y + (nodeRadius + 6) * uy - arrowOffset * ny;

                newPairs.push({
                    clanA: nA.clan,
                    clanB: nB.clan,
                    alignAtoB,
                    alignBtoA,
                    forceA,
                    forceB,
                    line1: {
                        x1: x1_a,
                        y1: y1_a,
                        x2: x2_a,
                        y2: y2_a,
                        color: PALETTE[idx1],
                        colorIdx: idx1,
                    },
                    line2: {
                        x1: x1_b,
                        y1: y1_b,
                        x2: x2_b,
                        y2: y2_b,
                        color: PALETTE[idx2],
                        colorIdx: idx2,
                    },
                    midX: (nA.x + nB.x) / 2,
                    midY: (nA.y + nB.y) / 2,
                });
            }
        }
        return newPairs;
    }

    // Initialize node positions when settlement changes
    $effect(() => {
        if (settlement && settlement.uuid !== currentSettlementUuid) {
            currentSettlementUuid = settlement.uuid;
            const clans = settlement.clans || [];
            const initRadius = Math.min(width, height) / 3;
            const count = clans.length;
            const newNodes: NodePos[] = clans.map((clan, i) => {
                const angle = count > 0 ? (i * 2 * Math.PI) / count : 0;
                return {
                    clan,
                    x: cx + initRadius * Math.cos(angle),
                    y: cy + initRadius * Math.sin(angle),
                    vx: 0,
                    vy: 0,
                };
            });
            nodes = newNodes;
            pairs = calculatePairs(newNodes);
        }
    });

    // Force simulation step
    function stepPhysics() {
        if (nodes.length === 0 || isPaused) return;

        const kForce = 3.0;
        const kRepel = 300.0;
        const kCenter = 0.005;
        const damping = 0.82;

        const fx = new Array(nodes.length).fill(0);
        const fy = new Array(nodes.length).fill(0);

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nA = nodes[i];
                const nB = nodes[j];

                let dx = nB.x - nA.x;
                let dy = nB.y - nA.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 0.01) {
                    dx = (Math.random() - 0.5) * 0.1;
                    dy = (Math.random() - 0.5) * 0.1;
                    dist = Math.sqrt(dx * dx + dy * dy);
                }

                const ux = dx / dist;
                const uy = dy / dist;

                const alignAtoB = getAlignment(nA.clan, nB.clan);
                const alignBtoA = getAlignment(nB.clan, nA.clan);

                const forceMagA = kForce * alignAtoB;
                fx[i] += forceMagA * ux;
                fy[i] += forceMagA * uy;

                const forceMagB = kForce * alignBtoA;
                fx[j] -= forceMagB * ux;
                fy[j] -= forceMagB * uy;

                // Pairwise repulsion force to prevent glomming into tight clusters
                const repelForce = kRepel / Math.max(dist, 10);
                fx[i] -= repelForce * ux;
                fy[i] -= repelForce * uy;
                fx[j] += repelForce * ux;
                fy[j] += repelForce * uy;
            }

            fx[i] += (cx - nodes[i].x) * kCenter;
            fy[i] += (cy - nodes[i].y) * kCenter;
        }

        const margin = nodeRadius + 10;
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].isDragging) continue;

            nodes[i].vx = (nodes[i].vx + fx[i]) * damping;
            nodes[i].vy = (nodes[i].vy + fy[i]) * damping;

            nodes[i].x += nodes[i].vx;
            nodes[i].y += nodes[i].vy;

            nodes[i].x = Math.max(margin, Math.min(width - margin, nodes[i].x));
            nodes[i].y = Math.max(margin, Math.min(height - margin, nodes[i].y));
        }

        pairs = calculatePairs(nodes);
    }

    onMount(() => {
        function loop() {
            stepPhysics();
            animationFrameId = requestAnimationFrame(loop);
        }
        animationFrameId = requestAnimationFrame(loop);

        return () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };
    });

    // Mouse drag handlers for nodes
    function onNodeMouseDown(index: number, event: MouseEvent) {
        event.stopPropagation();
        draggedNodeIndex = index;
        nodes[index].isDragging = true;
        nodes[index].vx = 0;
        nodes[index].vy = 0;
    }

    function onMouseMove(event: MouseEvent) {
        if (draggedNodeIndex !== null && svgElement) {
            const rect = svgElement.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const margin = nodeRadius + 5;
            nodes[draggedNodeIndex].x = Math.max(margin, Math.min(width - margin, mouseX));
            nodes[draggedNodeIndex].y = Math.max(margin, Math.min(height - margin, mouseY));
            pairs = calculatePairs(nodes);
        }
    }

    function onMouseUp() {
        if (draggedNodeIndex !== null) {
            nodes[draggedNodeIndex].isDragging = false;
            draggedNodeIndex = null;
        }
    }

    function onPairMouseEnter(pair: PairData, event: MouseEvent) {
        if (svgElement) {
            const rect = svgElement.getBoundingClientRect();
            hoveredPair = {
                pair,
                mouseX: event.clientX - rect.left,
                mouseY: event.clientY - rect.top,
            };
        }
    }

    function onPairMouseMove(pair: PairData, event: MouseEvent) {
        if (svgElement) {
            const rect = svgElement.getBoundingClientRect();
            hoveredPair = {
                pair,
                mouseX: event.clientX - rect.left,
                mouseY: event.clientY - rect.top,
            };
        }
    }

    function onPairMouseLeave() {
        hoveredPair = null;
    }

    function formatForce(val: number): string {
        const formatted = signed(val, 2);
        if (val > 0.05) return `${formatted} (Attraction)`;
        if (val < -0.05) return `${formatted} (Repulsion)`;
        return `${formatted} (Neutral)`;
    }
</script>

<div class="graph2-container">
    <div class="graph2-header">
        <div class="legend-bar">
            <span class="legend-title">Alignment:</span>
            <span class="legend-label red">-1.0 (Repelled)</span>
            <div class="palette-strip">
                {#each PALETTE as color, idx}
                    <span class="palette-swatch" style="background-color: {color};" title="Shade {idx + 1}/9"></span>
                {/each}
            </div>
            <span class="legend-label blue">+1.0 (Attracted)</span>
        </div>
        <button
            type="button"
            class="control-btn"
            onclick={() => (isPaused = !isPaused)}
        >
            {isPaused ? "Resume Simulation" : "Pause Simulation"}
        </button>
    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="svg-wrapper"
        onmousemove={onMouseMove}
        onmouseup={onMouseUp}
        onmouseleave={onMouseUp}
    >
        <svg
            bind:this={svgElement}
            {width}
            {height}
            viewBox="0 0 {width} {height}"
        >
            <defs>
                {#each PALETTE as color, idx}
                    <marker
                        id="arrowhead-aln-{idx}"
                        viewBox="0 0 10 10"
                        refX="6"
                        refY="5"
                        markerWidth="4"
                        markerHeight="4"
                        orient="auto-start-reverse"
                    >
                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={color} />
                    </marker>
                {/each}
            </defs>

            <!-- Paired Half-Arrows -->
            <g class="pairs">
                {#each pairs as p (`${p.clanA.uuid}-${p.clanB.uuid}`)}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <g
                        class="paired-half-arrow"
                        onmouseenter={(e) => onPairMouseEnter(p, e)}
                        onmousemove={(e) => onPairMouseMove(p, e)}
                        onmouseleave={onPairMouseLeave}
                    >
                        <!-- Invisible wider stroke for hit testing -->
                        <line
                            x1={p.line1.x1}
                            y1={p.line1.y1}
                            x2={p.line1.x2}
                            y2={p.line1.y2}
                            stroke="transparent"
                            stroke-width="16"
                        />
                        <line
                            x1={p.line2.x1}
                            y1={p.line2.y1}
                            x2={p.line2.x2}
                            y2={p.line2.y2}
                            stroke="transparent"
                            stroke-width="16"
                        />

                        <!-- Half Arrow 1: A -> B -->
                        <line
                            x1={p.line1.x1}
                            y1={p.line1.y1}
                            x2={p.line1.x2}
                            y2={p.line1.y2}
                            stroke={p.line1.color}
                            stroke-width="3"
                            marker-end="url(#arrowhead-aln-{p.line1.colorIdx})"
                        />

                        <!-- Half Arrow 2: B -> A -->
                        <line
                            x1={p.line2.x1}
                            y1={p.line2.y1}
                            x2={p.line2.x2}
                            y2={p.line2.y2}
                            stroke={p.line2.color}
                            stroke-width="3"
                            marker-end="url(#arrowhead-aln-{p.line2.colorIdx})"
                        />
                    </g>
                {/each}
            </g>

            <!-- Clan Nodes -->
            <g class="nodes">
                {#each nodes as n, i (n.clan.uuid)}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <g
                        class="clan-node"
                        transform="translate({n.x}, {n.y})"
                        onmousedown={(e) => onNodeMouseDown(i, e)}
                    >
                        <circle
                            r={nodeRadius}
                            fill={n.clan.color || "#4682b4"}
                            stroke="#ffffff"
                            stroke-width="2.5"
                            class="node-circle"
                        />
                        <text
                            text-anchor="middle"
                            dy="4"
                            font-family="sans-serif"
                            font-size="11px"
                            font-weight="bold"
                            fill="#ffffff"
                            class="node-label"
                        >
                            {n.clan.name}
                        </text>
                    </g>
                {/each}
            </g>
        </svg>

        <!-- Hover Tooltip for Paired Half-Arrows -->
        {#if hoveredPair}
            <div
                class="pair-tooltip"
                style="left: {hoveredPair.mouseX + 15}px; top: {hoveredPair.mouseY + 15}px;"
            >
                <div class="tooltip-title">
                    Alignment & Forces: {hoveredPair.pair.clanA.name} &harr; {hoveredPair.pair.clanB.name}
                </div>
                <hr class="tooltip-divider" />
                <div class="tooltip-row">
                    <span class="dir-header">{hoveredPair.pair.clanA.name} &rarr; {hoveredPair.pair.clanB.name}:</span>
                </div>
                <div class="tooltip-detail">
                    • Alignment: <strong style="color: {getAlignmentColor(hoveredPair.pair.alignAtoB)};">
                        {signed(hoveredPair.pair.alignAtoB, 2)}
                    </strong>
                </div>
                <div class="tooltip-detail">
                    • Force: <span>{formatForce(hoveredPair.pair.forceA)}</span>
                </div>

                <hr class="tooltip-divider" />
                <div class="tooltip-row">
                    <span class="dir-header">{hoveredPair.pair.clanB.name} &rarr; {hoveredPair.pair.clanA.name}:</span>
                </div>
                <div class="tooltip-detail">
                    • Alignment: <strong style="color: {getAlignmentColor(hoveredPair.pair.alignBtoA)};">
                        {signed(hoveredPair.pair.alignBtoA, 2)}
                    </strong>
                </div>
                <div class="tooltip-detail">
                    • Force: <span>{formatForce(hoveredPair.pair.forceB)}</span>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .graph2-container {
        border: 1px solid #e0e0e0;
        background-color: #fafafa;
        border-radius: 6px;
        padding: 0.75rem;
        margin-top: 0.5rem;
        user-select: none;
    }

    .graph2-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        padding: 0.25rem 0.5rem;
        background-color: #ffffff;
        border: 1px solid #eee;
        border-radius: 4px;
    }

    .legend-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
    }

    .legend-title {
        font-weight: bold;
        color: #444;
    }

    .legend-label.red {
        color: #b2182b;
        font-weight: 500;
    }

    .legend-label.blue {
        color: #2166ac;
        font-weight: 500;
    }

    .palette-strip {
        display: flex;
        gap: 1px;
        border: 1px solid #ccc;
        border-radius: 2px;
        overflow: hidden;
    }

    .palette-swatch {
        width: 14px;
        height: 14px;
        display: inline-block;
    }

    .control-btn {
        font-size: 0.8rem;
        padding: 0.25rem 0.6rem;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        border-radius: 3px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .control-btn:hover {
        background-color: #e4e4e4;
    }

    .svg-wrapper {
        position: relative;
        display: inline-block;
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
    }

    .paired-half-arrow {
        cursor: pointer;
    }

    .paired-half-arrow line {
        transition: stroke-width 0.15s;
    }

    .paired-half-arrow:hover line:not([stroke="transparent"]) {
        stroke-width: 4.5;
    }

    .clan-node {
        cursor: grab;
    }

    .clan-node:active {
        cursor: grabbing;
    }

    .node-circle {
        transition: filter 0.15s, transform 0.15s;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
    }

    .clan-node:hover .node-circle {
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
    }

    .node-label {
        pointer-events: none;
    }

    .pair-tooltip {
        position: absolute;
        pointer-events: none;
        background-color: rgba(255, 255, 255, 0.96);
        border: 1px solid #999;
        border-radius: 5px;
        padding: 0.5rem 0.75rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-size: 0.8rem;
        z-index: 100;
        min-width: 210px;
        color: #222;
    }

    .tooltip-title {
        font-weight: bold;
        color: #333;
        font-size: 0.85rem;
        margin-bottom: 0.25rem;
    }

    .tooltip-divider {
        margin: 0.3rem 0;
        border: none;
        border-top: 1px solid #ddd;
    }

    .tooltip-row {
        margin: 0.15rem 0;
    }

    .dir-header {
        font-weight: 600;
        color: #444;
    }

    .tooltip-detail {
        margin-left: 0.5rem;
        color: #555;
        font-size: 0.78rem;
    }
</style>
