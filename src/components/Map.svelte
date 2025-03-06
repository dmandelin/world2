<script lang="ts">
    import { onMount } from 'svelte';

    let canvas: HTMLCanvasElement|null;
    let context: CanvasRenderingContext2D|null;

    function click(e: MouseEvent) {
        console.log(e.offsetX, e.offsetY);
    }

    function resizeCanvas() {
        canvas!.width = canvas!.clientWidth;
        canvas!.height = canvas!.clientHeight;
        draw();
    }

    function draw() {
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

    onMount(() => {
        canvas = document.querySelector('canvas');
        context = canvas!.getContext('2d');
        draw();

        //resizeCanvas();
        //window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    });
</script>

<style>
    canvas {
        display: block;
    }
</style>

<canvas onclick={click} width="564" height="492" style="width: 564px; height: 492px"></canvas>

