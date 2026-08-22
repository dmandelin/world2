<script lang="ts">
    let { world } = $props();

    function advance(years?: number) {
        world.advanceFromPlanningView(years);
    }
</script>

<div class="sidebar">
    <button id="advance" class="clay-edge" onclick={() => advance()}
        >{world.year} ▶</button
    >
    <div class="sub-advance-buttons">
        <button class="sub-advance clay-edge" onclick={() => advance(5)}>+5</button>
        <button class="sub-advance clay-edge" onclick={() => advance(10)}>+10</button>
        <button class="sub-advance clay-edge" onclick={() => advance(20)}>+20</button>
    </div>
</div>

<style>
    .sidebar {
        position: fixed;
        /* Level with the map and the folder tab, which start at the body inset. */
        top: 8px;
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

        background-color: #4f6b45;
        color: #f3edd8;
        cursor: pointer;
    }

    #advance:hover, .sub-advance:hover {
        background-color: #5f7d54;
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
        background-color: #4f6b45;
        color: #f3edd8;
        cursor: pointer;
    }
</style>
