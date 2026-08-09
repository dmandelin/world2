<script lang="ts">
    import AlertBadges from "./AlertBadges.svelte";

    let { world } = $props();

    function advance(years?: number) {
        world.advanceFromPlanningView(years);
    }
</script>

<div class="sidebar">
    <button id="advance" onclick={() => advance()}>{world.year} ▶</button>
    <div class="sub-advance-buttons">
        <button class="sub-advance" onclick={() => advance(5)}>+5</button>
        <button class="sub-advance" onclick={() => advance(10)}>+10</button>
        <button class="sub-advance" onclick={() => advance(20)}>+20</button>
    </div>
    <AlertBadges {world} />
</div>

<style>
    .sidebar {
        position: fixed;
        top: 1em;
        right: 1em;
        background-color: transparent;
        z-index: 100;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    #advance {
        width: 150px;
        height: 50px;
        margin-bottom: 6px;
        font-size: 20px;

        background-color: bisque;
        border: 2px solid #62531d;
        border-radius: 5px;
        color: #62531d;
        cursor: pointer;
    }

    #advance:hover, .sub-advance:hover {
        background-color: #f7e4c2;
    }

    .sub-advance-buttons {
        display: flex;
        gap: 6px;
        width: 150px;
        justify-content: space-between;
    }

    .sub-advance {
        flex: 1;
        height: 28px;
        font-size: 13px;
        font-weight: bold;
        background-color: bisque;
        border: 1.5px solid #62531d;
        border-radius: 4px;
        color: #62531d;
        cursor: pointer;
    }
</style>
