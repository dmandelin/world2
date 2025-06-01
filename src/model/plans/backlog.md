## Original settlement

- Start out people as semi-nomadic

## Learning and status

### Discussion

- There are potentially a few factors to track:
  - How much we can learn from other clan
  - How much other clan can punish or reward us
  - How much we expect they'll help or hurt us
  - Relatedness: how much helping them helps us

- For now we want to focus on culture and learning, so
  how much can we learn is the relevant thing. We'll
  call that prestige.
  - We can pretty much make up the metric
  - Then people will adjust their beliefs and behavior
    to be more like the prestige-weighted average

- What stuff we adjust:
  - Farming knowledge/skill
  - Ritual knowledge/lore
  - At first, we could have just a single knowledge score
    - Knowledge can grow or decay over the generations
    - Clan size, intelligence, and information storage
      systems determine a maximum knowledge level
    - Knowledge can be randomly gained or lost

- Prestige depends on what clans know about each other
  - Note that although clans in a settlement are all up
    in each others' business, this doesn't mean they 
    know everything!
    - In particular, they'll learn about a subset of
      events, but keep in mind they don't have measurement
      and recording systems, so knowledge will be a lot
      more spotty

- Society features
  - Whenever parameters depend on features of our society
    that will change in the future, we should add those as
    nominally changeable society features, to help fill
    out that idea.

- More on rituals and trade goods
  - Split out to two needs gauges: subsistence and spirit
    - Display values
    - Compute values
    - Show some effects
      - Most important effect is too low on either =>
        some kind of outmigration
      - Show those outmigrations in the UI
  - Now add trade goods, rituals, etc to affect these
    - Village rituals: +health, +relatedness, +monitoring, +learning
  - For learning might need to update the skill model

### Items

x Add farming skill stat and display with no initial effects or dynamics
x Add prestige stat and display with no initial effects or dynamics
x Add effects for farming skill
x Add dynamics for prestige
  x Initial ratings based on observations and noise
  x Add something for seniority
  x Add something for clan size
  x Syncing of ratings with each other
  x Persistence of ratings in history
  x Make imitation coefficient depend on own relative prestige
x Add dynamics for farming skill
  x Display skill delta calc
  x Fix bug in skill deltas
  x Reset skill somewhat when migrating
x Add QoL effects for prestige
x Display population delta info

x basic rituals
- further stuff on rituals
  - bigger could be higher quality, if people want that
  - but also harder to run -- something breaks down with too many ppl
- interaction stress and justice: will need to replace this with something real soon
- move-out if values get too low

Understanding results:
- Historical graphs of key numbers
- Visualization of leading clans over time
- Display clan moves again

Liveliness:
- Thumbnails or backgrounds to represent settlement or clan

Model refinements:
- Better skill growth after migrants arrive
  Probably want to pair this with making specific breakthroughs
- Maybe also do something will skill tending a bit more to pull upward,
  maybe a bigger prestige factor when using skill.
- Some small benefit for being leading clan/clans depending on political system
- Maybe something about clan elders

## Trade

- QoL for traded goods
- Off-map flint
- Map overlay view
