<script lang="ts">
    import type { Clan } from '../model/people/people';
  import type { ClanDTO, SettlementDTO } from './dtos';

  let { settlement }: { settlement: SettlementDTO } = $props();

  const width = 400;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;
  const innerRadius = Math.min(width, height) / 2 - 60; // Paddiing
  const outerRadius = Math.min(width, height) / 2 - 20; // Paddiing

  const localClanRadius = 15;
  const externalClanRadius = 8;

  interface ClanDisplay {
    clan: Clan;
    x: number;
    y: number;
    angle: number;
    radius: number;
  }

  let localClanDisplays: ClanDisplay[] = $derived.by(() => {
    const clans = settlement.clans;
    if (!clans) return [];

    // Local clans
    const angleStep = clans.length > 0 ? (2 * Math.PI) / clans.length : 0;
    const localClans = clans.map((clan, i) => {
      const angle = i * angleStep;
      return {
        clan: clan.ref,
        x: cx + innerRadius * Math.cos(angle),
        y: cy + innerRadius * Math.sin(angle),
        angle: angle,
        radius: localClanRadius,
      };
    });
    return localClans;
  });

  interface RelationshipDisplay {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    thickness: number;
  }

  let [clanDisplays, relationshipDisplays] = $derived.by(() => {
    // Index existing clan displays.
    const clanDisplayIndex: Record<string, ClanDisplay> = {};
    const clanDisplays = [];
    for (const cd of localClanDisplays) {
      clanDisplayIndex[cd.clan.uuid] = cd;
      clanDisplays.push(cd);
    }

    const lines: RelationshipDisplay[] = [];
    for (const subject of localClanDisplays) {
        for (const [objectClan, r] of subject.clan.marriagePartners) {
            let objectDisplay = clanDisplayIndex[objectClan.uuid];
            if (!objectDisplay) {
                // Object is an external clan - add it to the display.
                const angle = subject.angle + ((Math.random() * 2) - 1) * 2 * Math.PI / 8;
                objectDisplay = {
                    clan: objectClan,
                    x: cx + outerRadius * Math.cos(angle),
                    y: cy + outerRadius * Math.sin(angle),
                    angle,
                    radius: externalClanRadius,
                };
                clanDisplayIndex[objectClan.uuid] = objectDisplay;
                clanDisplays.push(objectDisplay);
            }
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
    return [clanDisplays, lines];
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
          <circle r="{pos.radius}" fill={pos.clan.color}></circle>
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
