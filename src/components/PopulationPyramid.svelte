<script lang="ts">
    import { pct } from "../model/lib/format";
    import { MARITAL_STATUS_NAMES } from "../model/people/demography";
    import type { MarriageCounts } from "../model/relations/marriage";

    // A clan, or anything with its slices and population, such as a
    // settlement's clans added up. With slicesByStatus ([slice][sex][status])
    // the bars are split by marital status, and with marriageCounts the
    // marriage figures are listed under them.
    let { clan }: {
        clan: {
            slices: number[][];
            population: number;
            slicesByStatus?: number[][][];
            marriageCounts?: MarriageCounts;
        };
    } = $props();

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

    // By sex, then status: unmarried, betrothed, married, widowed. Married
    // is the old bar color; the rest are lighter, striped, and gray.
    const STATUS_COLORS = [
      ['#f6d5d5', 'repeating-linear-gradient(45deg, #eaa 0 3px, #f6d5d5 3px 6px)', '#eaa', '#c8c8c8'],
      ['#d5d5f6', 'repeating-linear-gradient(45deg, #aae 0 3px, #d5d5f6 3px 6px)', '#aae', '#c8c8c8'],
    ];
    // Drawn from the middle of the pyramid out: married, betrothed,
    // unmarried, widowed.
    const STATUS_ORDER = [2, 1, 0, 3];

    function segments(sliceIndex: number, sex: number): { status: number, count: number }[] {
      const byStatus = clan.slicesByStatus?.[sliceIndex]?.[sex];
      if (!byStatus) return [{ status: 2, count: clan.slices[sliceIndex][sex] }];
      return STATUS_ORDER.map(status => ({ status, count: byStatus[status] }))
          .filter(s => s.count > 0);
    }

    function segmentTitle(sex: number, status: number, count: number): string {
      return `${count} ${MARITAL_STATUS_NAMES[status].toLowerCase()} ${sex ? 'men' : 'women'}`;
    }
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
      display: flex;
      box-sizing: border-box;
    }
    .bar-female {
      flex-direction: row-reverse;
      margin-left: auto;
    }
    .segment {
      height: 100%;
    }
    .legend {
      display: flex;
      gap: 0.6em;
      margin-top: 4px;
      font-size: 0.85em;
    }
    .swatch {
      display: inline-block;
      width: 0.8em;
      height: 0.8em;
      margin-right: 0.2em;
      vertical-align: middle;
    }
    .counts {
      margin-top: 4px;
      font-size: 0.9em;
      text-align: left;
    }
  </style>

  <div class="pyramid">
    {#each clan.slices.toReversed() as slice, index}
      {@const sliceIndex = clan.slices.length - 1 - index}
      <div class="slice">
        <div style="white-space: nowrap; width: 50px;">{SLICE_NAMES[index]}</div>
        <div class="barc">
          <div style="position: absolute; right: 0; padding-right: 2px;">{slice[0] ? slice[0] : ''}</div>
          <div class="bar bar-female" style="width: {slice[0]*pctPerPerson}%;">
            {#each segments(sliceIndex, 0) as seg}
              <div
                  class="segment"
                  title={segmentTitle(0, seg.status, seg.count)}
                  style="width: {100 * seg.count / slice[0]}%; background: {STATUS_COLORS[0][seg.status]};"
              ></div>
            {/each}
          </div>
        </div>
        <div class="barc">
          <div style="position: absolute; padding-left: 2px;">{slice[1] ? slice[1] : ''}</div>
          <div class="bar" style="width: {slice[1]*pctPerPerson}%;">
            {#each segments(sliceIndex, 1) as seg}
              <div
                  class="segment"
                  title={segmentTitle(1, seg.status, seg.count)}
                  style="width: {100 * seg.count / slice[1]}%; background: {STATUS_COLORS[1][seg.status]};"
              ></div>
            {/each}
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
    {#if clan.slicesByStatus}
      <div class="legend">
        {#each STATUS_ORDER as status}
          <span>
            <span class="swatch" style="background: {STATUS_COLORS[0][status]};"></span>{MARITAL_STATUS_NAMES[status]}
          </span>
        {/each}
      </div>
    {/if}
    {#if clan.marriageCounts}
      {@const m = clan.marriageCounts}
      <div class="counts">
        <div>Married couples: {m.marriedCouples}</div>
        <div>Betrothed: {m.betrothedWomen} women, {m.betrothedMen} men</div>
        <div>Looking to marry: {m.eligibleWomen} women (18+), {m.eligibleMen} men (20+)</div>
        <div>Widowed: {m.widowed}</div>
      </div>
    {/if}
  </div>
