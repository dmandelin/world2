<script>
    let { world } = $props();

    function click() {
        world.advance();
    }
</script>

<style>
    #advance {
        width: 150px;
        height: 50px;
        margin-bottom: 20px;
        font-size: 20px;

        background-color: bisque;
        border: 2px solid #62531d;
        border-radius: 5px;
        color: #62531d;
    }
</style>

<div>
<button id="advance" onclick={click}>{world.year} ▶</button>
</div>
