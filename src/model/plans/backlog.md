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

- Time to improve the learning model some more
  - Basic effects to have
    - Turnover of generations causes loss of skill
    - But the new people imitate the clan and others
      - The maximum amount they can gain this way is limited
        by information systems
      - Imitation is imperfect, so there tends to be
        loss of skill if this is all that happens
    - People also make incremental improvements based
      on experience (though they can also get worse)
    - Those two effects will tend to balance at a certain
      skill level
    - Breakthroughs will instead be new named things
      that improve output but may cost skill and other
      things to use
      - We'll need a bunch of these for ritual to
        power faster improvements

### Items

x Make stresses much clearer
  x food stress: verify display on the map
  x interaction stress: show ritual problems on the map
    x make rites break down sooner

- Fix up learning model
  x verify tuning of basic changes
  - add breakthroughs

- Help villages with bad rites
  - option to have one clan lead the rites

- Better display of hamlets
  - probably need to show on settlement panel instead of map
  - give better settlement overview with total pop and such

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
