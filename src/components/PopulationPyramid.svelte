<script lang="ts">
    import { Clan } from '../model/people';
  
    let { clan } = $props();
  </script>
  
  <style>
    .pyramid {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 200px;
    }
    .slice {
      display: flex;
      margin: 2px 0;
    }
    .barc {
      margin: 0 1px;
      width: 50px;
    }
    .bar {
      height: 20px;
      background-color: #4caf50;
    }
  </style>
  
  <div class="pyramid">
    {#each clan.slices.toReversed() as slice, index}
      <div class="slice">
        <div class="barc"><div class="bar" style="text-align: right; margin-left: auto; width: {slice[0]*15}%; background-color: #eaa;">{slice[0] ? slice[0] : ''}</div></div>
        <div class="barc"><div class="bar" style="width: {slice[1]*15}%; background-color: #aae;">{slice[1] ? slice[1] : ''}</div></div>
      </div>
    {/each}
  </div>