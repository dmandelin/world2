<script lang="ts">
    import AlertBadges from "./AlertBadges.svelte";
    import NotificationBar from "./NotificationBar.svelte";

    import { onDestroy, onMount } from "svelte";
    import { signed } from "../model/lib/format";
    import { world } from "../model/worldinstance";
    import type { SettlementCluster } from "../model/people/cluster";
    import { Settlement } from "../model/people/settlement";
    import { weightedAverage } from "../model/lib/modelbasics";
    import { MAP_HEIGHT, MAP_WIDTH, type ExtremeFlood } from "../model/environment/flood";

    let { onSelect } = $props();
    let isBig = $state(false);

    // How much of the year's water to wash over the base map. "extreme"
    // shows only the floods that broke out; "all" adds a heat map of the
    // ordinary flood level everywhere.
    type Lens = "extreme" | "all" | "none";
    const LENS_ORDER: Lens[] = ["extreme", "all", "none"];
    const LENS_LABELS: Record<Lens, string> = {
        extreme: "big",
        all: "all",
        none: "off",
    };
    const LENS_TITLES: Record<Lens, string> = {
        extreme: "Flood lens: this year's extreme floods only. Click for all floods.",
        all: "Flood lens: extreme floods over a heat map of the year's flood level. Click to turn off.",
        none: "Flood lens: off. Click to show extreme floods.",
    };
    let lens = $state<Lens>("extreme");

    function cycleLens() {
        lens = LENS_ORDER[(LENS_ORDER.indexOf(lens) + 1) % LENS_ORDER.length];
    }

    let canvas: HTMLCanvasElement | null = null;
    let context: CanvasRenderingContext2D | null = null;

    let worldDTO = $state(world.dto!);

    function click(e: MouseEvent) {
        if (!canvas) return;
        const scaleX = canvas.width / canvas.clientWidth;
        const scaleY = canvas.height / canvas.clientHeight;
        const clickX = e.offsetX * scaleX;
        const clickY = e.offsetY * scaleY;
        console.log("click", clickX, clickY);

        let best = null;
        let bestds = 50 * 50;
        for (const settlement of world.allSettlements) {
            const dx = settlement.x - clickX;
            const dy = settlement.y - clickY;
            const ds = dx * dx + dy * dy;

            if (ds < bestds) {
                bestds = ds;
                best = settlement;
            }
        }

        if (best) {
            console.log("select", best.name, event);
            onSelect(best.uuid);
        } else {
            onSelect(undefined);
        }
    }

    function resizeCanvas() {
        canvas!.width = canvas!.clientWidth;
        canvas!.height = canvas!.clientHeight;
        draw();
    }

    function draw() {
        if (!canvas || !context) return;
        context.clearRect(0, 0, canvas.width, canvas.height);

        for (const settlement of world.allSettlements) {
            const x = settlement.x;
            const y = settlement.y;
            const fieldsRadius = 0.5 * Math.sqrt(settlement.population);
            const fieldsColor = settlement.abandoned ? "#eee" : "#dfd";
            context!.fillStyle = fieldsColor;
            context!.beginPath();
            context!.arc(x, y, fieldsRadius, 0, 2 * Math.PI);
            context!.fill();
        }

        // Under the rivers, so the channels stay legible through the wash.
        if (lens === "all") drawFloodLevels();
        drawRivers();
        if (lens !== "none") drawFloodAreas();
        drawPeople();
        if (lens !== "none") drawFloodMarks();
    }

    // --- Normal flood level lens -------------------------------------------
    //
    // A soft blob of color per settlement, dry ochre through deep water, by
    // this year's level there. Settlements in a cluster sit close together,
    // so their blobs run into one another and the cluster reads as one patch
    // of country, shading where neighbors disagree.

    // Dry to wet, with enough color at both ends to read against parchment.
    // The step from straw to water at moderate marks the level the fields
    // actually want.
    const FLOOD_LEVEL_COLORS = [
        [196, 140, 52], // scant: parched
        [208, 184, 112], // low: straw
        [118, 170, 190], // moderate
        [56, 122, 172], // high
        [22, 70, 118], // abundant: deep water
    ];

    // Wide enough that neighbors in a cluster overlap, since a cluster's
    // settlements share their water.
    const FLOOD_LEVEL_RADIUS = 52;

    function drawFloodLevels() {
        context!.save();
        for (const settlement of world.allSettlements) {
            if (settlement.abandoned) continue;
            const [r, g, b] = FLOOD_LEVEL_COLORS[settlement.floodLevel.index];
            const x = settlement.x;
            const y = settlement.y;
            const gradient = context!.createRadialGradient(
                x, y, 0, x, y, FLOOD_LEVEL_RADIUS);
            // Flat-ish in the middle, falling off only near the rim, so the
            // blob reads as a patch of country rather than a dot.
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.75)`);
            gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.6)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
            context!.fillStyle = gradient;
            context!.beginPath();
            context!.arc(x, y, FLOOD_LEVEL_RADIUS, 0, 2 * Math.PI);
            context!.fill();
        }
        context!.restore();
    }

    // --- Extreme flood lens -------------------------------------------------
    //
    // The area each of this year's floods covered, washed over the map, with
    // a ring on every settlement the water actually reached.

    // Water for the wash, and the warm accent from the flood icons for the
    // outline and the rings, which have to stay legible over the blue of the
    // flood-level heat map underneath.
    const FLOOD_LENS_WASH = {
        flood20: "#2b6cb0",
        flood100: "#2c5282",
        flood500: "#1a365d",
    } as const;

    const FLOOD_LENS_ACCENT = {
        flood20: "#b7791f",
        flood100: "#c05621",
        flood500: "#742a2a",
    } as const;

    // The stretch a flood covered, inset a little so an edge that runs along
    // the map border still shows.
    function floodAreaPath(area: ExtremeFlood["area"]): Path2D {
        const path = new Path2D();
        const [i, w, h] = [3, MAP_WIDTH - 3, MAP_HEIGHT - 3];
        if (area.kind === "map") {
            path.rect(i, i, w - i, h - i);
        } else if (area.kind === "half") {
            if (area.half === "upriver") {
                path.moveTo(i, i);
                path.lineTo(w, i);
                path.lineTo(i, h);
            } else {
                path.moveTo(w, i);
                path.lineTo(w, h);
                path.lineTo(i, h);
            }
            path.closePath();
        } else {
            const cluster = area.cluster;
            let radius = 30;
            for (const s of cluster.settlements) {
                radius = Math.max(
                    radius,
                    Math.hypot(s.x - cluster.x, s.y - cluster.y) + 22,
                );
            }
            path.arc(cluster.x, cluster.y, radius, 0, 2 * Math.PI);
        }
        return path;
    }

    function drawFloodAreas() {
        for (const flood of world.extremeFloods) {
            if (flood.clansAffected === 0) continue;
            const path = floodAreaPath(flood.area);

            context!.save();
            // A harder flood washes darker, so severity reads off the map.
            context!.globalAlpha = 0.1 + 0.25 * flood.impact;
            context!.fillStyle = FLOOD_LENS_WASH[flood.kind.key];
            context!.fill(path);

            // Pale under-stroke first, so the dashes hold their own wherever
            // the wash beneath them is dark.
            context!.globalAlpha = 0.75;
            context!.lineWidth = 4;
            context!.strokeStyle = "#fdfbf2";
            context!.stroke(path);

            context!.globalAlpha = 1;
            context!.lineWidth = 2;
            context!.strokeStyle = FLOOD_LENS_ACCENT[flood.kind.key];
            context!.setLineDash([6, 4]);
            context!.stroke(path);
            context!.setLineDash([]);
            context!.restore();
        }
    }

    function drawFloodMarks() {
        const scaleMultiplier = isBig ? 1 : 2;
        for (const settlement of world.allSettlements) {
            const impacts = settlement.clans.flatMap((c) => c.floodDamage.impacts);
            if (impacts.length === 0) continue;

            // Ring size tracks how much of the crop went; color, the worst
            // flood that reached here.
            const loss =
                impacts.reduce((t, i) => t + i.cropLoss, 0) / impacts.length;
            const worst = impacts.reduce((a, b) =>
                a.flood.kind.returnPeriod >= b.flood.kind.returnPeriod ? a : b,
            );
            const radius = (5 + 7 * loss) * scaleMultiplier;

            context!.save();
            context!.beginPath();
            context!.arc(settlement.x, settlement.y, radius, 0, 2 * Math.PI);
            context!.lineWidth = 4 * scaleMultiplier;
            context!.strokeStyle = "rgba(253, 251, 242, 0.8)";
            context!.stroke();
            context!.lineWidth = 2 * scaleMultiplier;
            context!.strokeStyle = FLOOD_LENS_ACCENT[worst.flood.kind.key];
            context!.stroke();
            context!.restore();
        }
    }

    function drawRivers() {
        context!.strokeStyle = "#0185bb";
        context!.lineWidth = 5;
        context!.fillStyle = "#A0D8F0";

        // Euphrates
        context!.beginPath();
        context!.moveTo(55, 0);
        context!.quadraticCurveTo(78, 39, 88, 142);
        context!.quadraticCurveTo(100, 320, 448, 313);
        context!.stroke();

        // Tigris
        context!.beginPath();
        context!.moveTo(152, 0);
        context!.quadraticCurveTo(210, 80, 288, 71);
        context!.quadraticCurveTo(430, 53, 425, 122);
        context!.bezierCurveTo(455, 215, 470, 145, 499, 256);
        context!.stroke();

        // Persian Gulf
        context!.lineWidth = 3;
        context!.beginPath();
        context!.moveTo(310, 495);
        context!.quadraticCurveTo(416, 328, 567, 193);
        context!.lineTo(567, 495);
        context!.lineTo(310, 495);
        context!.fill();
        context!.stroke();
    }

    function drawPeople() {
        for (const cluster of world.clusters) {
            drawCluster(cluster);
        }
        for (const planned of worldDTO.plannedSettlements) {
            drawPlannedSettlement(planned);
        }
    }

    function drawPlannedSettlement(planned: any) {
        const x = planned.x;
        const y = planned.y;
        const scaleMultiplier = isBig ? 1 : 2;

        context!.strokeStyle = "#d69e2e";
        context!.lineWidth = 2 * scaleMultiplier;
        context!.setLineDash([3 * scaleMultiplier, 3 * scaleMultiplier]);
        context!.beginPath();
        context!.arc(x, y, 4.5 * scaleMultiplier, 0, 2 * Math.PI);
        context!.stroke();
        context!.setLineDash([]);
    }

    function drawCluster(cluster: SettlementCluster) {
        for (const settlement of cluster.settlements) {
            drawSettlement(settlement);
        }
    }

    function drawSettlement(settlement: Settlement) {
        const x = settlement.x;
        const y = settlement.y;
        const scaleMultiplier = isBig ? 1 : 2;

        context!.font = `${14 * scaleMultiplier}px sans-serif`;

        // Symbol
        context!.fillStyle = settlement.abandoned ? "#777" : "#333";
        if (settlement.abandoned) {
            fillTextCentered("x", x, y);
        } else {
            const pop = settlement.population;
            if (pop < 50) {
                // Tiny upward-pointing triangle (width 4, height 4)
                const size = 2 * scaleMultiplier;
                context!.beginPath();
                context!.moveTo(x, y - size);
                context!.lineTo(x - size, y + size);
                context!.lineTo(x + size, y + size);
                context!.closePath();
                context!.fill();
            } else if (pop < 150) {
                // Black dot, radius 1.8 (approx same size/slightly smaller than tiny 4x4 square)
                context!.beginPath();
                context!.arc(x, y, 1.8 * scaleMultiplier, 0, 2 * Math.PI);
                context!.fill();
            } else if (pop < 500) {
                // Black dot, radius 2.8 (approx same size/slightly smaller than large 6x6 square)
                context!.beginPath();
                context!.arc(x, y, 2.8 * scaleMultiplier, 0, 2 * Math.PI);
                context!.fill();
            } else {
                // Circle a little larger (radius 4.5)
                context!.beginPath();
                context!.arc(x, y, 4.5 * scaleMultiplier, 0, 2 * Math.PI);
                context!.fill();
            }
        }

        // Name
        if (!settlement.parent && !settlement.abandoned) {
            fillTextCentered(
                settlement.name,
                x + 18 * scaleMultiplier,
                y + 17 * scaleMultiplier,
            );
        }

        // TODO - Clean this up. For now, it's just too much,
        // especially when sites are near each other or water.
        return;

        // Lens label (e.g., population)
        drawLensLabel(settlement, x, y, 3 + 32);

        const qol = weightedAverage(
            settlement.clans,
            (c) => c.qol.value,
            (c) => c.population,
        );

        const stats = `QoL: ${signed(qol, 1)}`;

        let yo = 49;
        //context!.font = '12px sans-serif';
        fillTextCentered(stats, x, y + 3 + yo);
    }

    function drawLensLabel(settlement: any, x: number, y: number, yo: number) {
        context!.fillStyle = "#333";
        context!.font = "12px sans-serif";

        const label = `${settlement.population} | \
${settlement.cluster.population} \
(${signed(settlement.cluster.lastPopulationChange)})`;
        fillTextCentered(label, x, y + yo);
    }

    function fillTextCentered(text: string, x: number, y: number) {
        const textWidth = context!.measureText(text).width;
        context!.fillText(text, x - textWidth / 2, y);
    }

    let hoveredSettlement = $state<any>(null);
    let hoveredPlannedSettlement = $state<any>(null);
    let tooltipX = $state(0);
    let tooltipY = $state(0);

    function handleMouseMove(e: MouseEvent) {
        if (!canvas) return;
        const scaleX = canvas.width / canvas.clientWidth;
        const scaleY = canvas.height / canvas.clientHeight;
        const mouseX = e.offsetX * scaleX;
        const mouseY = e.offsetY * scaleY;

        let best = null;
        let bestPlanned = null;
        let bestds = 8 * 8; // within 8 pixels is a reasonable hover radius

        // Check regular settlements
        for (const s of world.allSettlements) {
            const dx = s.x - mouseX;
            const dy = s.y - mouseY;
            const ds = dx * dx + dy * dy;

            if (ds < bestds) {
                bestds = ds;
                best = s;
                bestPlanned = null;
            }
        }

        // Check planned settlements
        for (const ps of worldDTO.plannedSettlements) {
            const dx = ps.x - mouseX;
            const dy = ps.y - mouseY;
            const ds = dx * dx + dy * dy;

            if (ds < bestds) {
                bestds = ds;
                best = null;
                bestPlanned = ps;
            }
        }

        tooltipX = e.offsetX + 12;
        tooltipY = e.offsetY + 12;

        if (best) {
            const dto = worldDTO.clusters
                .flatMap((c) => c.settlements)
                .find((s) => s.uuid === best.uuid);
            hoveredSettlement = dto;
            hoveredPlannedSettlement = null;
        } else if (bestPlanned) {
            hoveredSettlement = null;
            hoveredPlannedSettlement = bestPlanned;
        } else {
            hoveredSettlement = null;
            hoveredPlannedSettlement = null;
        }
    }

    function handleMouseLeave() {
        hoveredSettlement = null;
        hoveredPlannedSettlement = null;
    }

    function onWorldUpdate() {
        worldDTO = world.dto!;
        draw();
    }

    onMount(() => {
        context = canvas!.getContext("2d");

        world.watch(onWorldUpdate);
        draw();

        //resizeCanvas();
        //window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
        };
    });

    onDestroy(() => {
        world.unwatch(onWorldUpdate);
    });

    $effect(() => {
        if (isBig !== undefined && lens !== undefined && canvas && context) {
            draw();
        }
    });
</script>

<div
    class="map-container"
    style="position: relative; display: inline-block; width: {isBig
        ? '564px'
        : '282px'}; transition: width 0.2s;"
>
    <div class="canvas-wrapper" style="position: relative; line-height: 0;">
        <button
            onclick={() => (isBig = !isBig)}
            class="map-size-toggle"
            title={isBig ? "Minimize Map" : "Maximize Map"}
        >
            {#if isBig}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
                </svg>
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
            {/if}
        </button>
        <button
            type="button"
            class="map-lens-toggle"
            class:active={lens !== "none"}
            class:full={lens === "all"}
            onclick={cycleLens}
            title={LENS_TITLES[lens]}
        >
            <span class="lens-glyph">&#x1F30A;</span>
            <span class="lens-label">{LENS_LABELS[lens]}</span>
        </button>
        <a
            href="/sessions"
            class="map-stats-link"
            title="šid - Statistics"
        >
            𒋃
        </a>
        <a
            href="/tuning"
            class="map-tuning-link"
            title="balaĝ - Tuning"
        >
            𒁄
        </a>
        <a
            href="https://github.com/dmandelin/world2/blob/main/README.md"
            target="_blank"
            rel="noopener"
            class="what-is-this-link"
            title="Open Readme"
        >
            &#x1F517; What is this?
        </a>
        <canvas
            bind:this={canvas}
            onclick={click}
            onmousemove={handleMouseMove}
            onmouseleave={handleMouseLeave}
            width="564"
            height="492"
            style="width: {isBig ? '564px' : '282px'}; height: {isBig
                ? '492px'
                : '246px'};"
        >
        </canvas>
    </div>

    {#if hoveredSettlement}
        {@const pop = hoveredSettlement.population}
        {@const popDelta = hoveredSettlement.lastSizeChange}
        {@const perCapitaFood =
            pop > 0
                ? weightedAverage(
                      hoveredSettlement.clans,
                      (c: any) => c.consumption.perCapitaFood,
                      (c: any) => c.population,
                  )
                : 0}
        {@const qol =
            pop > 0
                ? weightedAverage(
                      hoveredSettlement.clans,
                      (c: any) => c.qol.value,
                      (c: any) => c.population,
                  )
                : 0}
        <div
            class="map-tooltip"
            style="position: absolute; left: {tooltipX}px; top: {tooltipY}px;"
        >
            <div class="tooltip-title">{hoveredSettlement.name}</div>
            <div class="tooltip-row">
                <span class="label">Population:</span>
                <span class="value">
                    {pop}
                    {#if popDelta !== 0}
                        <span class="delta {popDelta > 0 ? 'pos' : 'neg'}"
                            >({signed(popDelta)})</span
                        >
                    {/if}
                </span>
            </div>
            <div class="tooltip-row">
                <span class="label">Food/Capita:</span>
                <span class="value">{perCapitaFood.toFixed(2)}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Avg QoL:</span>
                <span class="value {qol > 0 ? 'pos' : 'neg'}"
                    >{signed(qol, 1)}</span
                >
            </div>
            <div class="tooltip-row">
                <span class="label">Flood:</span>
                <span class="value">{hoveredSettlement.floodLevel.name}</span>
            </div>
            {#each hoveredSettlement.extremeFloods as flood, i (i)}
                <div class="tooltip-row">
                    <span class="value flood-alert">{flood.kind.name}!</span>
                </div>
            {/each}
        </div>
    {/if}

    {#if hoveredPlannedSettlement}
        <div
            class="map-tooltip"
            style="position: absolute; left: {tooltipX}px; top: {tooltipY}px;"
        >
            <div class="tooltip-title">
                {hoveredPlannedSettlement.name}
                <span class="planned-tag">(Planned)</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Cluster:</span>
                <span class="value">{hoveredPlannedSettlement.clusterName}</span
                >
            </div>
            <div class="tooltip-row">
                <span class="label">Parent:</span>
                <span class="value">{hoveredPlannedSettlement.parentName}</span>
            </div>
            <div
                class="tooltip-row"
                style="flex-direction: column; align-items: flex-start; margin-top: 4px; border-top: 1px dashed #62531d; padding-top: 4px; width: 100%;"
            >
                <span class="label" style="margin-bottom: 2px;"
                    >Founding Clans:</span
                >
                <ul
                    class="clan-list"
                    style="margin: 0; padding-left: 16px; font-weight: 500; list-style-type: square; color: #2c1e05;"
                >
                    {#each hoveredPlannedSettlement.clans as clan}
                        <li>{clan.name}</li>
                    {/each}
                </ul>
            </div>
        </div>
    {/if}

    <div class="map-alerts">
        <AlertBadges world={worldDTO} orientation="horizontal" />
    </div>
    <NotificationBar notes={worldDTO.notes} />
</div>

<style>
    /* Same rhythm as the gaps between the other bordered blocks. */
    .map-alerts {
        margin-top: var(--clay-gap);
        margin-bottom: var(--clay-gap);
    }

    canvas {
        display: block;
        /* Its inline width is the column width, so keep the border inside it;
           otherwise the canvas juts past its column and the gap to the next
           block measures short. */
        box-sizing: border-box;
        border: var(--clay-edge-width) solid var(--clay-edge-color);
        border-image: var(--clay-edge-source) var(--clay-edge-slice) repeat;
    }

    .map-tooltip {
        position: absolute;
        padding: 8px 12px;
        background-color: #f9f6eb;
        opacity: 0.95;
        z-index: 100;
        border: var(--clay-edge-width) solid var(--clay-edge-color);
        border-image: var(--clay-edge-source) var(--clay-edge-slice) repeat;
        font-size: 0.825rem;
        color: #2c1e05;
        font-family: sans-serif;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        pointer-events: none;
        min-width: 170px;
    }

    .tooltip-title {
        font-weight: bold;
        border-bottom: 1px solid #62531d;
        margin-bottom: 6px;
        padding-bottom: 2px;
        font-size: 0.875rem;
    }

    .tooltip-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 2px;
    }

    .tooltip-row .label {
        color: #62531d;
        margin-right: 8px;
    }

    .tooltip-row .value {
        font-weight: 500;
    }

    .delta {
        font-size: 0.75rem;
        font-weight: bold;
    }

    .delta.pos {
        color: #38a169;
    }

    .delta.neg {
        color: #e53e3e;
    }

    .high-stress {
        color: #e53e3e;
    }

    .flood-alert {
        color: #2b6cb0;
        font-weight: bold;
    }

    .planned-tag {
        color: #d69e2e;
        font-size: 0.75rem;
        font-weight: normal;
        margin-left: 6px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .clan-list {
        font-size: 0.8rem;
        line-height: 1.3;
        margin: 0;
        padding-left: 14px;
    }

    .map-size-toggle {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 10;
        width: 28px;
        height: 28px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(249, 246, 235, 0.9);
        border: var(--clay-edge-width) solid var(--clay-edge-color);
        border-image: var(--clay-edge-source) var(--clay-edge-slice) repeat;
        cursor: pointer;
        color: #62531d;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        transition:
            background-color 0.2s,
            transform 0.1s;
    }

    .map-size-toggle:hover {
        background-color: #f0ebd1;
    }

    .map-size-toggle:active {
        transform: scale(0.95);
    }

    /* Below the size toggle; the statistics and tuning links follow it. */
    .map-lens-toggle {
        position: absolute;
        top: 44px;
        left: 8px;
        z-index: 10;
        box-sizing: border-box;
        width: 28px;
        /* Taller than the other controls: it has three states, so it names
           the one it is in rather than making the player hover to find out. */
        height: 38px;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        color: #62531d;
        background-color: rgba(249, 246, 235, 0.9);
        border: var(--clay-edge-width) solid var(--clay-edge-color);
        border-image: var(--clay-edge-source) var(--clay-edge-slice) repeat;
        cursor: pointer;
        font-size: 0.95rem;
        line-height: 1;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        transition:
            background-color 0.2s,
            transform 0.1s;
    }

    .map-lens-toggle:hover {
        background-color: #f0ebd1;
    }

    .map-lens-toggle:active {
        transform: scale(0.95);
    }

    .map-lens-toggle.active {
        background-color: #cfe3ef;
        box-shadow:
            0 2px 4px rgba(0, 0, 0, 0.15),
            inset 0 0 0 2px #2b6cb0;
    }

    .map-lens-toggle.full {
        background-color: #a9cfe4;
    }

    .lens-glyph {
        font-size: 0.9rem;
        line-height: 1;
    }

    .lens-label {
        font-size: 0.5rem;
        line-height: 1;
        font-variant: small-caps;
        letter-spacing: 0.04em;
    }

    .map-stats-link {
        position: absolute;
        top: 90px;
        left: 8px;
        z-index: 10;
        /* Match the size toggle, which is a button and so border-box. */
        box-sizing: border-box;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(249, 246, 235, 0.9);
        border: var(--clay-edge-width) solid var(--clay-edge-color);
        border-image: var(--clay-edge-source) var(--clay-edge-slice) repeat;
        cursor: pointer;
        color: #62531d;
        font-size: 1rem;
        line-height: 1;
        text-decoration: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        transition:
            background-color 0.2s,
            transform 0.1s;
    }

    .map-stats-link:hover,
    .map-tuning-link:hover {
        background-color: #f0ebd1;
    }

    .map-stats-link:active,
    .map-tuning-link:active {
        transform: scale(0.95);
    }

    /* Directly below the statistics link. */
    .map-tuning-link {
        position: absolute;
        top: 126px;
        left: 8px;
        z-index: 10;
        box-sizing: border-box;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(249, 246, 235, 0.9);
        border: var(--clay-edge-width) solid var(--clay-edge-color);
        border-image: var(--clay-edge-source) var(--clay-edge-slice) repeat;
        cursor: pointer;
        color: #62531d;
        font-size: 1rem;
        line-height: 1;
        text-decoration: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        transition:
            background-color 0.2s,
            transform 0.1s;
    }

    .what-is-this-link {
        position: absolute;
        top: 8px;
        left: 44px;
        z-index: 10;
        background-color: rgba(249, 246, 235, 0.9);
        border: var(--clay-edge-width) solid var(--clay-edge-color);
        border-image: var(--clay-edge-source) var(--clay-edge-slice) repeat;
        padding: 0 10px;
        height: 28px;
        display: flex;
        align-items: center;
        text-decoration: none;
        color: #62531d;
        font-weight: bold;
        font-size: 0.8rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        transition:
            background-color 0.2s,
            transform 0.1s;
    }

    .what-is-this-link:hover {
        background-color: #f0ebd1;
    }

    .what-is-this-link:active {
        transform: scale(0.95);
    }
</style>
