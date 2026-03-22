<script lang="ts">
  import type { ClanDTO, SettlementDTO } from './dtos';

  let { settlement }: { settlement: SettlementDTO } = $props();

  const width = 400;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 40; // Paddiing

  interface ClanDisplay {
    clan: ClanDTO;
    x: number;
    y: number;
  }

  let clanDisplays: ClanDisplay[] = $derived.by(() => {
    const clans = settlement.clans;
    if (!clans) return [];
    const angleStep = clans.length > 0 ? (2 * Math.PI) / clans.length : 0;
    return clans.map((clan, i) => {
      const angle = i * angleStep;
      return {
        clan,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  });

  interface RelationshipDisplay {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thickness: number;
  }

  let relationshipDisplays: RelationshipDisplay[] = $derived.by(() => {
    const lines: RelationshipDisplay[] = [];
    for (const subject of clanDisplays) {
        for (const [objectClan, r] of subject.clan.ref.marriagePartners) {
            const objectDisplay = clanDisplays.find(c => c.clan.ref === objectClan);
            if (!objectDisplay) continue;
            lines.push({
                key: `${subject.clan.uuid}-${objectClan.uuid}`,
                x1: subject.x,
                y1: subject.y,
                x2: objectDisplay.x,
                y2: objectDisplay.y,
                thickness: r * 20,
            });
        }
    }
    return lines;
  });
</script>

<style>
  .relationship-graph {
    border: 1px solid #eee;
    margin: 1em 0;
  }
  .clan-node {
    cursor: pointer;
    transition: transform 0.2s;
  }
  .clan-node:hover {
    /* transform: scale(1.1);   TODO - fix */
  }
  .relationship-line {
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  .relationship-line:hover {
    opacity: 1;
  }
</style>

<div class="relationship-graph">
  <svg {width} {height} viewBox="0 0 {width} {height}">
    <g class="lines">
      {#each relationshipDisplays as line (line.key)}
        <line
          class="relationship-line"
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="grey"
          stroke-width={line.thickness}
        />
      {/each}
    </g>

    <g class="clans">
      {#each clanDisplays as pos (pos.clan.uuid)}
        <g class="clan-node" transform="translate({pos.x}, {pos.y})">
          <circle r="15" fill={pos.clan.color}></circle>
          <text
            text-anchor="middle"
            y="-20"
            font-family="sans-serif"
            font-size="12px"
            fill="#333"
          >
            {pos.clan.name}
          </text>
        </g>
      {/each}
    </g>
  </svg>
</div>
