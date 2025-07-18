<script lang="ts">
  import type { Trend } from "../model/records/trends";

  let { trend } : { trend: Trend } = $props();
</script>

<style>
</style>

<div>
{trend.label}
</div>
