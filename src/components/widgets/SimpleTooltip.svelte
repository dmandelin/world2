<script lang="ts">
    import Tooltip2 from "../Tooltip2.svelte";

    let { children, tip }: { children: any; tip: string } = $props();
</script>
  
{@render children()}
<Tooltip2>
    <span>{tip}</span>
</Tooltip2>
