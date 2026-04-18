<script lang="ts">
    import Tooltip from "../Tooltip.svelte";

    let { children, tip }: { children: any; tip: string } = $props();
</script>
  
<Tooltip>
    {@render children()}
    <span slot="tooltip">{tip}</span>
</Tooltip>
