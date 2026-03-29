<script lang="ts">
    import { pct } from "../model/lib/format";

    let { clan } = $props();

    let largestHalfSlice = 
      $derived(Math.max(...clan.slices.map((s: number[]) => Math.max(s[0], s[1]))));
    let pctPerPerson = 
      $derived(Math.min(10, largestHalfSlice > 0 ? 100 / largestHalfSlice : 0));

    let femalePopulation = $derived(clan.slices.reduce((sum: number, slice: number[]) => sum + slice[0], 0));
    let malePopulation = $derived(clan.slices.reduce((sum: number, slice: number[]) => sum + slice[1], 0));

    const SLICE_NAMES = [
      '60+',
      '40-59',
      '20-39',
      '0-19',
    ];
  </script>
  
  <style>
    .pyramid {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .slice {
      display: flex;
      margin: 2px 0;
    }
    .barc {
      margin: 0 1px;
      width: 60px;
      position: relative;
    }
    .bar {
      height: 20px;
      background-color: #4caf50;
      box-sizing: border-box;
    }
    .bar-female {
      background-color: #eaa;
      text-align: right;
    }
    .bar-male {
      background-color: #aae;
      text-align: left;
    }
  </style>
  
  <div class="pyramid">
    {#each clan.slices.toReversed() as slice, index}
      <div class="slice">
        <div style="white-space: nowrap; width: 50px;">{SLICE_NAMES[index]}</div>
        <div class="barc">
          <div style="position: absolute; right: 0; padding-right: 2px;">{slice[0] ? slice[0] : ''}</div>
          <div 
              class="bar bar-female"
              style="margin-left: auto; width: {slice[0]*pctPerPerson}%;"
          >
          </div>
        </div>
        <div class="barc">
          <div style="position: absolute; padding-left: 2px;">{slice[1] ? slice[1] : ''}</div>
          <div 
              class="bar bar-male" 
              style="width: {slice[1]*pctPerPerson}%;"
          >
          </div>
        </div>
        <div style="text-align: right; width: 30px;">{slice[0] + slice[1]}</div>
        <div style="text-align: right; width: 30px; padding-left: 1em">{pct((slice[0] + slice[1]) / clan.population)}</div>
      </div>
    {/each}
      <div class="slice">
        <div class="barc" style="width: 106px; box-sizing: border-box;">
          <div style="position: absolute; right: 0; padding-right: 12px;">
            ({pct(femalePopulation / clan.population)}) {femalePopulation}</div>
            &nbsp;
        </div>
        <div class="barc" style="width: 130px; box-sizing: border-box;">
          <div style="position: absolute; padding-left: 8px;">
            {malePopulation} ({pct(malePopulation / clan.population)})</div>
        </div>
      </div>       
  </div>