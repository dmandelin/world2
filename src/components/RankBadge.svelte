<script lang="ts">
    import type { RankBadgeData } from "./rankbadge";
    import SimpleTooltip from "./widgets/SimpleTooltip.svelte";

    let { badge }: { badge: RankBadgeData } = $props();
</script>

<SimpleTooltip tip={badge.title}>
    <div class="rank-badge" style="background-color: {badge.color};">
        {badge.rank}
    </div>
</SimpleTooltip>

<style>
    .rank-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        color: #ffffff;
        font-weight: bold;
        font-size: 0.75rem;
        line-height: 1;
        cursor: default;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }
</style>
