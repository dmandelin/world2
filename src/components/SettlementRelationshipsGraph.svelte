<script lang="ts">
    import { randomClanColor, type Clan } from '../model/people/people';
    import ButtonPanel from './ButtonPanel.svelte';
    import type { ClanDTO, SettlementDTO } from './dtos';

    let { settlement }: { settlement: SettlementDTO } = $props();

    const width = 400;
    const height = 400;
    const cx = width / 2;
    const cy = height / 2;
    const innerRadius = Math.min(width, height) / 2 - 60;
    const outerRadius = Math.min(width, height) / 2 - 20;

    const localClanRadius = 15;
    const externalClanRadius = 8;

    // We need to fix state handling a bit. Really, we should just calculate
    // everything we need and then show it. But we also want to be able to
    // animate, specifically by updating some model (rather than, say, replaying
    // from start). So we will want to in fact be able to produce that model
    // by an effect and also update by step.

    interface Display {
        clans: ClanDisplay[];
        relationships: RelationshipDisplay[];
    }

    interface ClanDisplay {
        clan: Clan;
        x: number;
        y: number;
        angle: number;
        radius: number;
        local: boolean;
    }

    interface RelationshipDisplay {
        key: string;
        cd1: ClanDisplay;
        cd2: ClanDisplay;
        thickness: number;
    }

    abstract class RelationshipDisplayOption {
        abstract relationships(clan: Clan): Iterable<[Clan, number]>;
    }

    class MarriageRelationshipDisplayOption extends RelationshipDisplayOption {
        relationships(clan: Clan): Iterable<[Clan, number]> {
            return clan.marriagePartners;
        }
    }

    class KinshipRelationshipDisplayOption extends RelationshipDisplayOption {
        *relationships(clan: Clan): Iterable<[Clan, number]> {
            if (clan.parent) {
                yield [clan.parent, clan.kinshipTo(clan.parent)];
            }
            for (const cadet of clan.cadets) {
                yield [cadet, clan.kinshipTo(cadet)];
            }
        }
    }
    
    let display: Display = $state({
        clans: [] as ClanDisplay[],
        relationships: [] as RelationshipDisplay[],
    });

    let rdo = $state(new MarriageRelationshipDisplayOption());

    $effect(() => {
        const newDisplay = buildDisplay(settlement);
        for (let i = 0; i < 100; i++) {
            stepPositionNonLocalClanDisplays(newDisplay);
        }
        display = newDisplay;
    });

    function buildDisplay(settlement: SettlementDTO): Display {
        const clanDisplays = buildLocalClanDisplays(settlement);
        const relationshipDisplays = buildRelationshipDisplays(settlement, clanDisplays);
        return {
            clans: [...clanDisplays.values()],
            relationships: relationshipDisplays,
        };
    }

    function buildLocalClanDisplays(settlement: SettlementDTO): Map<string, ClanDisplay> {
        const clans = settlement.clans;
        if (!clans) return new Map();

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
                local: true,
            };
        });
        const localClanMap = new Map<string, ClanDisplay>();
        for (const cd of localClans) {
            localClanMap.set(cd.clan.uuid, cd);
        }
        return localClanMap;
    }

    function buildRelationshipDisplays(settlement: SettlementDTO, clanDisplays: Map<string, ClanDisplay>) {
        const lines: RelationshipDisplay[] = [];
        // Snapshot values, because we're going to modify this map but should
        // iterate only over the initial values.
        for (const subject of [...clanDisplays.values()]) {
            for (const [objectClan, r] of rdo.relationships(subject.clan)) {
                let objectDisplay = clanDisplays.get(objectClan.uuid);
                if (!objectDisplay) {
                    // Object is an external clan - add it to the display. Choose a
                    // random angle now but we'll fix up better later.
                    const angle = subject.angle + ((Math.random() * 2) - 1) * 2 * Math.PI / 8;
                    objectDisplay = {
                        clan: objectClan,
                        x: cx + outerRadius * Math.cos(angle),
                        y: cy + outerRadius * Math.sin(angle),
                        angle,
                        radius: externalClanRadius,
                        local: false,
                    };
                    clanDisplays.set(objectClan.uuid, objectDisplay);
                }
                lines.push({
                    key: `${subject.clan.uuid}-${objectClan.uuid}`,
                    cd1: subject,
                    cd2: objectDisplay,
                    thickness: r * 20,
                });
            }
        }

        return lines;
    }

    // Minimum potential energy model:
    // - Local clans are fixed in place.
    // - Non-local clans are fixed in radius but can move around the circle.
    // - Non-local clans repel each other and are attracted to their local clan partners.
    function stepPositionNonLocalClanDisplays(display: Display) {

        // Calculate forces on everything without moving anything yet.
        const xForces: number[] = [];
        const yForces: number[] = [];
        for (let i = 0; i < display.clans.length; i++) {
            const cd1 = display.clans[i];
            if (cd1.local) continue;
            let fx = 0;
            let fy = 0;

            // Repulsion from other non-local clans.
            for (let j = 0; j < display.clans.length; j++) {
                if (i === j) continue;
                const cd2 = display.clans[j];
                if (cd2.local) continue;
                const dx = cd1.x - cd2.x;
                const dy = cd1.y - cd2.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);
                if (dist > 0) {
                    const repulsion = 200 / distSq; // Tunable parameter
                    fx += repulsion * dx / dist;
                    fy += repulsion * dy / dist;
                }
            }

            // Attraction to local clan partners.
            for (const [partnerClan, r] of rdo.relationships(cd1.clan)) {
                const partnerDisplay = display.clans.find(cd => cd.clan.uuid === partnerClan.uuid);
                if (!partnerDisplay) continue; // Shouldn't happen
                const dx = partnerDisplay.x - cd1.x;
                const dy = partnerDisplay.y - cd1.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq);
                if (dist > 0) {
                    const attraction = 100 / distSq; // Tunable parameter
                    fx += attraction * dx / dist;
                    fy += attraction * dy / dist;
                }
            }

            xForces[i] = fx;
            yForces[i] = fy;
        }

        // Now move everything a little bit in the direction of the force
        // along the circle. Note that we're not dealing in accelerations:
        // we're really looking for minimum potential energy.
        for (let i = 0; i < display.clans.length; i++) {
            const cd = display.clans[i];
            if (cd.local) continue;
            const fx = xForces[i];
            const fy = yForces[i];

            // Convert force to a small angle change. The radius is fixed so we
            // only care about the tangential component of the force.
            const tangentialForce = -Math.sin(cd.angle) * fx + Math.cos(cd.angle) * fy;
            const angleChange = 0.01 * tangentialForce; // Tunable parameter

            cd.angle += angleChange;
            cd.x = cx + outerRadius * Math.cos(cd.angle);
            cd.y = cy + outerRadius * Math.sin(cd.angle);
        }
    }

    function onClick() {
        stepPositionNonLocalClanDisplays(display);
    }
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

<div>
    <ButtonPanel config={{buttons: [
        { label: "M", data: new MarriageRelationshipDisplayOption() },
        { label: "K", data: new KinshipRelationshipDisplayOption() },
     ]}} onSelected={(label, data) => rdo = data} />
</div>
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<div class="relationship-graph" on:click={onClick}>
  <svg {width} {height} viewBox="0 0 {width} {height}">
    <g class="lines">
      {#each display.relationships as line (line.key)}
        <line
          class="relationship-line"
          x1={line.cd1.x}
          y1={line.cd1.y}
          x2={line.cd2.x}
          y2={line.cd2.y}
          stroke="grey"
          stroke-width={line.thickness}
        />
      {/each}
    </g>

    <g class="clans">
      {#each display.clans as pos (pos.clan.uuid)}
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
