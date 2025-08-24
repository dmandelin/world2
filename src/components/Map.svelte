<script lang="ts">
    import ButtonPanel from './ButtonPanel.svelte';
    import NotificationBar from './NotificationBar.svelte';

    import { onDestroy, onMount } from 'svelte';
    import { signed } from '../model/lib/format';
    import { world } from '../model/world';
    import type { SettlementCluster } from '../model/people/cluster';
    import { Settlement } from '../model/people/settlement';
    import TrendsPanel from './TrendsPanel.svelte';
    import { weightedAverage } from '../model/lib/modelbasics';
    
    let { selection = $bindable() } = $props();
    let selectedLens = $state('Pop');

    let canvas: HTMLCanvasElement|null;
    let context: CanvasRenderingContext2D|null;

    let worldDTO = $state(world.dto);

    function click(e: MouseEvent) {
        console.log('click', e.offsetX, e.offsetY);

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
            console.log('select', best.name, event);
            selection = best;
        } else {
            selection = undefined;
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
            const fieldsRadius = 0.5 * Math.sqrt(settlement.population)
            const fieldsColor = settlement.abandoned ? '#eee' : '#dfd';
            context!.fillStyle = fieldsColor;
            context!.beginPath();
            context!.arc(x, y, fieldsRadius, 0, 2 * Math.PI);
            context!.fill();
        }

        drawRivers();
        drawPeople();
    }

    function drawRivers() {
        context!.strokeStyle = '#0185bb';
        context!.lineWidth = 5;
        context!.fillStyle = '#A0D8F0';

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
    }

    function drawCluster(cluster: SettlementCluster) {
        drawSettlement(cluster.mother);
        for (const settlement of cluster.daughters) {
            drawSettlement(settlement);
        }
    }

    function drawSettlement(settlement: Settlement) {
        const x = settlement.x;
        const y = settlement.y;
        const s = 3;

        context!.font = '14px sans-serif';

        // Symbol
        context!.fillStyle = settlement.abandoned ? '#777' : '#333';
        if (!settlement.parent) {
            if (!settlement.abandoned) {
                context!.fillRect(x - s, y - s, s * 2, s * 2);
            } else {
                fillTextCentered('x', x, y);
            }
        } else {
            context!.fillRect(x - 2, y - 2, 4, 4);
        }

        // Name
        if (!settlement.parent && !settlement.abandoned) {
            fillTextCentered(settlement.name, x, y + s + 15);
        }

        if (settlement.parent) return;

        // Lens label (e.g., population)
        drawLensLabel(settlement, x, y, s + 32);

        // Basic stats
        const subsistence = weightedAverage(
            settlement.clans,
            c => c.happiness.subsistenceTotal.appeal,
            c => c.population,
        );
        const appeal = weightedAverage(
            settlement.clans,
            c => c.happiness.total.appeal,
            c => c.population,
        );
        const happiness = weightedAverage(
            settlement.clans,
            c => c.happiness.total.value,
            c => c.population,
        );

        const stats = `${signed(subsistence)} | ${signed(appeal)} | ${signed(happiness)}`;

        let yo = 49;
        //context!.font = '12px sans-serif';
        fillTextCentered(stats, x, y + s + yo);
}

    function drawLensLabel(settlement: any, x: number, y: number, yo: number) {
        context!.fillStyle = '#333';
        context!.font = '12px sans-serif';

        let label = '';
        if (selectedLens === 'Pop') {
            label = `${settlement.population} | \
${settlement.cluster.population} \
(${signed(settlement.cluster.lastPopulationChange)})`;
        } else if (selectedLens === 'Rit') {
            label = `${signed(settlement.clans.rites.appeal)}`;
        }
        fillTextCentered(label, x, y + yo);
    }

    function fillTextCentered(text: string, x: number, y: number) {
        const textWidth = context!.measureText(text).width;
        context!.fillText(text, x - textWidth / 2, y);
    }

    onMount(() => {
        canvas = document.querySelector('canvas');
        context = canvas!.getContext('2d');

        world.watch(() => {
            worldDTO = world.dto;
            draw();
        });
        draw();

        //resizeCanvas();
        //window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    });

    onDestroy(() => {
        world.unwatch(draw);
    });
</script>

<style>
    canvas {
        display: block;
        border: 4px solid #62531d;
    }
</style>

<div>
    <canvas 
        onclick={click} 
        width="564" 
        height="492" 
        style="width: 564px; height: 492px">
    </canvas>
    <div style="display: flex; justify-content: space-between">
        <ButtonPanel config={{
            buttons: [
                { label: 'Pop' },
                { label: 'Rit' },
            ],
        }} onSelected={label => { selectedLens = label; draw(); } } />
        <TrendsPanel config={{
            trends: worldDTO.trends,
        }} />
    </div>
    <NotificationBar notes={worldDTO.notes} />
</div>