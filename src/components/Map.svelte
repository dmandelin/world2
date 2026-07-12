<script lang="ts">
    import ButtonPanel from "./ButtonPanel.svelte";
    import NotificationBar from "./NotificationBar.svelte";

    import { onDestroy, onMount } from "svelte";
    import { signed } from "../model/lib/format";
    import { world } from "../model/world";
    import type { SettlementCluster } from "../model/people/cluster";
    import { Settlement } from "../model/people/settlement";
    import TrendsPanel from "./TrendsPanel.svelte";
    import { weightedAverage } from "../model/lib/modelbasics";

    let { onSelect } = $props();
    let selectedLens = $state("Pop");

    let canvas: HTMLCanvasElement | null;
    let context: CanvasRenderingContext2D | null;

    let worldDTO = $state(world.dto!);

    function click(e: MouseEvent) {
        console.log("click", e.offsetX, e.offsetY);

        const clickX = e.offsetX;
        const clickY = e.offsetY;

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
        context!.clearRect(0, 0, canvas!.width, canvas!.height);

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

        drawRivers();
        drawPeople();
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

        context!.strokeStyle = "#d69e2e";
        context!.lineWidth = 2;
        context!.setLineDash([3, 3]);
        context!.beginPath();
        context!.arc(x, y, 4.5, 0, 2 * Math.PI);
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

        context!.font = "14px sans-serif";

        // Symbol
        context!.fillStyle = settlement.abandoned ? "#777" : "#333";
        if (settlement.abandoned) {
            fillTextCentered("x", x, y);
        } else {
            const pop = settlement.population;
            if (pop < 50) {
                // Tiny upward-pointing triangle (width 4, height 4)
                context!.beginPath();
                context!.moveTo(x, y - 2);
                context!.lineTo(x - 2, y + 2);
                context!.lineTo(x + 2, y + 2);
                context!.closePath();
                context!.fill();
            } else if (pop < 150) {
                // Black dot, radius 1.8 (approx same size/slightly smaller than tiny 4x4 square)
                context!.beginPath();
                context!.arc(x, y, 1.8, 0, 2 * Math.PI);
                context!.fill();
            } else if (pop < 500) {
                // Black dot, radius 2.8 (approx same size/slightly smaller than large 6x6 square)
                context!.beginPath();
                context!.arc(x, y, 2.8, 0, 2 * Math.PI);
                context!.fill();
            } else {
                // Circle a little larger (radius 4.5)
                context!.beginPath();
                context!.arc(x, y, 4.5, 0, 2 * Math.PI);
                context!.fill();
            }
        }

        // Name
        if (!settlement.parent && !settlement.abandoned) {
            fillTextCentered(settlement.name, x + 18, y + 17);
        }

        // TODO - Clean this up. For now, it's just too much,
        // especially when sites are near each other or water.
        return;

        // Lens label (e.g., population)
        drawLensLabel(settlement, x, y, 3 + 32);

        // Basic stats
        const subsistence = weightedAverage(
            settlement.clans,
            (c) => c.happiness.subsistenceAppeal,
            (c) => c.population,
        );
        const appeal = weightedAverage(
            settlement.clans,
            (c) => c.happiness.appeal,
            (c) => c.population,
        );
        const happiness = weightedAverage(
            settlement.clans,
            (c) => c.happiness.value,
            (c) => c.population,
        );

        const stats = `${signed(subsistence)} | ${signed(appeal)} | ${signed(happiness)}`;

        let yo = 49;
        //context!.font = '12px sans-serif';
        fillTextCentered(stats, x, y + 3 + yo);
    }

    function drawLensLabel(settlement: any, x: number, y: number, yo: number) {
        context!.fillStyle = "#333";
        context!.font = "12px sans-serif";

        let label = "";
        if (selectedLens === "Pop") {
            label = `${settlement.population} | \
${settlement.cluster.population} \
(${signed(settlement.cluster.lastPopulationChange)})`;
        } else if (selectedLens === "Rit") {
            label = `${signed(settlement.clans.rites.appeal)}`;
        }
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
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

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
                .flatMap(c => c.settlements)
                .find(s => s.uuid === best.uuid);
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

    onMount(() => {
        canvas = document.querySelector("canvas");
        context = canvas!.getContext("2d");

        world.watch(() => {
            worldDTO = world.dto!;
            draw();
        });
        draw();

        //resizeCanvas();
        //window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
        };
    });

    onDestroy(() => {
        world.unwatch(draw);
    });
</script>

<div class="map-container" style="position: relative; display: inline-block;">
    <canvas
        onclick={click}
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
        width="564"
        height="492"
        style="width: 564px; height: 492px"
    >
    </canvas>

    {#if hoveredSettlement}
        {@const pop = hoveredSettlement.population}
        {@const popDelta = hoveredSettlement.lastSizeChange}
        {@const perCapitaFood = pop > 0 ? weightedAverage(
            hoveredSettlement.clans,
            (c: any) => c.consumption.perCapitaFood,
            (c: any) => c.population
        ) : 0}
        {@const foodSecurity = pop > 0 ? weightedAverage(
            hoveredSettlement.clans,
            (c: any) => 1 - c.consumption.foodInsecurity.value,
            (c: any) => c.population
        ) : 0}
        {@const stress = pop > 0 ? weightedAverage(
            hoveredSettlement.clans,
            (c: any) => c.stress.value,
            (c: any) => c.population
        ) : 0}
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
                        <span class="delta {popDelta > 0 ? 'pos' : 'neg'}">({signed(popDelta)})</span>
                    {/if}
                </span>
            </div>
            <div class="tooltip-row">
                <span class="label">Food/Capita:</span>
                <span class="value">{perCapitaFood.toFixed(2)}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Food Security:</span>
                <span class="value">{(foodSecurity * 100).toFixed(0)}%</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Avg Stress:</span>
                <span class="value {stress > 0 ? 'high-stress' : ''}">{signed(stress, 1)}</span>
            </div>
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
                <span class="value">{hoveredPlannedSettlement.clusterName}</span>
            </div>
            <div class="tooltip-row">
                <span class="label">Parent:</span>
                <span class="value">{hoveredPlannedSettlement.parentName}</span>
            </div>
            <div class="tooltip-row" style="flex-direction: column; align-items: flex-start; margin-top: 4px; border-top: 1px dashed #62531d; padding-top: 4px; width: 100%;">
                <span class="label" style="margin-bottom: 2px;">Founding Clans:</span>
                <ul class="clan-list" style="margin: 0; padding-left: 16px; font-weight: 500; list-style-type: square; color: #2c1e05;">
                    {#each hoveredPlannedSettlement.clans as clan}
                        <li>{clan.name}</li>
                    {/each}
                </ul>
            </div>
        </div>
    {/if}

    <div style="display: flex; justify-content: space-between">
        <ButtonPanel
            config={{
                buttons: [{ label: "Pop" }, { label: "Rit" }],
            }}
            onSelected={(label) => {
                selectedLens = label;
                draw();
            }}
        />
        <TrendsPanel
            config={{
                trends: worldDTO.trends,
            }}
        />
    </div>
    <NotificationBar notes={worldDTO.notes} />
</div>

<style>
    canvas {
        display: block;
        border: 4px solid #62531d;
    }

    .map-tooltip {
        position: absolute;
        padding: 8px 12px;
        background-color: #f9f6eb;
        opacity: 0.95;
        z-index: 100;
        border: 2px solid #62531d;
        border-radius: 4px;
        font-size: 0.825rem;
        color: #2c1e05;
        font-family: sans-serif;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
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
</style>
