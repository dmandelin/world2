<script lang="ts">
  import type { TrendDTO } from "../model/records/trends";

  let { trend } : { trend: TrendDTO } = $props();
</script>

<style>
</style>

<div>
{trend.current}
</div>
