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

- General items we'll need
  x Recenter prestige to zero: we already did that with QoL, will help
    make comparisons more cogent.
  - Fix up migration code after deleting obsolete things it depends on
    x Migrate based on crowding
    - Show reason for migration in notification
    - Also consider relative status
    - Also consider ritual quality
    - Use Boltzmann model
  - Model how much clans are able to pay attention to each other
  - Desired rituals/roles/laws structure and sat/dissat with present state
  - Conflict over rituals/roles/laws
  - Have daughter settlements interact somehow -- allow mutual trade and/or
    learning

- Better display of hamlets
  - new settlement area main view
    x total population
    x qol
    x list of settlements with pop and qol
  - show area values on the map
  - show per-individual settlement pop and qol somewhere
  x have hamlets appear around towns in a circular pattern
  x avoid granddaughters for now
  - give hamlets better names
  - enhance buttonpanel
    - smaller font or different size or format so buttons look better here
    - better layout options
    - data item option

- Small but important
  - more reticence to emigrate to a different cluster / or allow migrating to cluster
  - scale bonuses for learning in settlements
  - connectivity bonuses for related settlements
  - merge annals and notetaker

- Introduce new ritual model
  x different rituals at same granularity as production pot
    - later allow option for subsets of clans or multiple clans
  x calculate appeal for each one
  - distribute attention per appeal
  - rename relatedness to solidarity
  - solidarity effects of ritual
  - prestige effects of ritual
  - learning effects of ritual
  - feasting add-on to ritual
  - dance style add-on to ritual
  - add multi-settlement ritual

- Problems inflicting our people in recent tests:
  - prestige of new junior clans craters as they can be many steps down
  - clans with more ritual skill may have a hard time gaining prestige if
    small or low in traits

- Smaller updates
  - Fix super-low consumption on migration
  - Use population-weighted averages for baselines where appropriate
  - Clean up field names and redundancy in ClanImpact

- Help villages with low subsistence

- Help villages with bad rites
  x allow them to actually change leadership selection

  - debug selection options: current selection doesn't appear neutral
  - lose more information about prestige when things get too big

  - for each clan, record their actual preference for
    leadership selection, possibly including favorability
    of each item
  - add qol penalty for non-agreement
  - add conservatism to leadership selection
    - give the current choice more weight
  - add conformity to leadership selection
    - adjust weights to be more similar to other clans
  - add some noise to leadership selection
    - random noise to weights

  - show leadership selection on map
  - apply society effects for disagreements and/or not getting way on
    leadership selection methods
  - allow a one-time gift to override a small disagreement

  - option to increase the authority of offices
  - option to travel more to pick up new practices
  - option to experiment more with new practices
  - option to modify rituals for scale so that some people
    become observers (and other role splits)
  - structural elements to add to elaborate the ritual
    - will affect quality, prestige, etc
    - may have skill thresholds
    - may have trade good requirements
    - effects wear off over time
  - option to build new types of ritual building

  - different structure options:
    x add ritual lens to map for visualizations
    - implement roles having different effects on prestige, quality, and skill gain
      x first, show expected skill changes to make it clearer what's going on
    - give villages the option to switch structure
    - add notifications to show ritual structure changes
  - get people do a better job moving out if the rites are all messed up
  - make ritual skill increase faster/more than farming skill since elaboration is free
  - (P2) option to invite another village to help

- Fix up learning model
  x verify tuning of basic changes
  x overhaul learning model to get continuity and learning rates
  - have it depend on population pyramid
  - add breakthroughs
  - give a bigger self weight bonus for education vs imitation

- Give people preferences for different settlement types, which can change
- Make coordination costs and scale effects more dynamic, 
  e.g., dependent on settlement relations

Understanding results:
x Historical graphs of key numbers
  x Include satisfaction subscores
- Lenses: show ritual quality and other things on map
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
