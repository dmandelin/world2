# The attention economy

## Ritual cycles

- Various parties can offer ritual cycles, which are sets of
  related rituals.
- Ritual cycles have varying appeal depending on the skills and
  resources used to perform the ritual, and the number of people
  involved.
- Clans have a ritual attention budget, which they partition
  among the rituals on offer in a Boltzmann-type distribution
  - If ritual A has somewhat higher appeal than ritual B, we
    assume there still some occasions where B is preferred,
    accounting for the diversity of needs.
- Rituals are a direct quality-of-life good for clans. Note
  that at this level of abstraction, ritual subsumes medicine,
  teaching, and various other things.
- Performing rituals keeps up ritual skill. Skill or appeal can
  decline for rituals not performed often.

## Ritual cycle types

### Common rituals

Common rituals are rituals where clans participate in a way
that's formally equal, but may allow some variation in exactly
how it's done.

The appeal of this ritual rises fast with the number of people
at the low end, because they can interact densely, but the
"infrastructure" of "everyone gathers in the middle of the
village" only supports so many people. If there are too many,
various rituals will have to be held less often, combined, or
otherwise done in a less satisfactory way.

A CES function with ρ=-5 and scale parameter ν=1.5 with fixed
"capital" of 300 in a (1 participant, 1 capital) -> 1 ritual
process gives good results, with rituals serving decently well
for population 100-500. 

Modifiers for traits and skills will be applied as TFP. For
a basic ritual of this type, maybe 1 SD is worth 1.2x output.
This will also result in some differential prestige. 

Base appeal will be 1000. Sub-100% ritual quality will scale
down appeal proportionately. 

At the very beginning this won't allow for major scaling, but
having a separate avenue mildly allows more scale. Later we'll
have temples or additional donation and specialization
institutions to allow really scaling up.

### Sponsored rituals

We need a better name, but these are rituals where people from
one or more clans create a ritual that's more of a performance
than a common participatory ritual.

This could take various forms:
- Special dance: more elaborate dance, music, costumes, narratives
- Special effects: pyrotechnics, appearing to raise people from
  the dead, etc
- Feast: provide quantity, quality, and variety of good
- Healing: individual healing rituals and special medicines

In the beginning, we won't worry about any of that and instead
specify some sort of different ritual cycle that can scale up
a bit bigger. However, at first clans won't be able to produce
sponsored rituals with that great of appeal for any size, because
they lack the skills and resources.

The first step here would be something that's more skill-based
than the common ritual, so maybe then 1 SD is worth 1.4x output.
At first, these might account for maybe 1/6 of ritual activity,
so a 700 appeal or so -- for a clan that does this well.
- When these first start up, they'll be smaller, so their appeal
  will naturally be relatively low.
- A basic version of this would be to put on the same kinds of
  things as the village, except the sponsor clan does everything.
  But it would typically be difficult for them to do anything
  that big at first, because it's a smaller resource base trying
  to serve the same group. 

How exactly does this scale? It's not entirely clear, but the
initial basic idea may be that attention can be focused on the
common point, where in a larger group it just can't be synced
by mutual entrainment. However, the common rituals can have
leaders and things, so maybe there leadership structure should
affect scaling.

Perhaps it's not that big a deal in terms of scaling at first,
but rather starts to create some more differentiation. The more
intensive role in performance can generate more prestige, skill
gain, and invention than in the common rituals.

For clans to put on special rituals costs something. At first,
we'll make it cost QoL, which can be balanced against gains.

## Dividing attention

Appeal will be treated similarly to Elo ratings, so that a ritual
with appeal A has weight proportional to 10^(A/400). We could use
other bases and constants if we want, that's not important.

Clans won't immediately move to optimize. In general there is a
lot of weight of tradition, and they need to gradually modify things.

Clans have some starting distribution of attention. Then, each
turn they update at some rate toward a weighted average of:
- softmax distribution over appeal
- other clans' distributions
- noise

## Ritual effects

- As before, ritual is a quality-of-life good.

- Ritual should generate some level of solidarity among the
  participants.
  - Rename relatedness to solidarity?
  - Have a higher amount of solidarity for common rituals than
    sponsored.
  - Solidarity depends on quality.
  - Also allow for ritual to generate discord.
    - The basic idea is to allow some incompatible choices for
      how to do the ritual or how to organize it. Clans could
      then disagree on this, either generating discord penalties
      or allowing further moves to resolve the disagreement.

- Ritual generates prestige for people in prominent roles
  - Common rituals don't generate a lot of prestige (their effect
    is more solidarity). However, to the extent that roles and
    performances can vary, they can generate some.
  - Sponsored rituals generate more prestige for sponsors.

- Ritual generates learning for participants
  - Learning is proportional to participation
    - Sponsors learn more than participants, who learn more than
      audience members

- Different rituals should produce different effects, e.g., on QoL,
  productivity, etc.
  - TODO - detail effects of this. We can wait on this, though, by
    assuming some common standard tradition at first.

## Enhancing rituals

People can try to enhance rituals in various ways. At the beginning,
we'll assume it's limited to:
- applying more skill and knowledge (medicine, dance, etc)
- expending more resources (food for feasting, setup labor)

Features that can be added (assume all add appeal)
- (P1) Dance style: invent a new dance style
  - Produces a new named dance style that adds some variable appeal
    to the ritual cycle.
- (P1) Feasting/Sacrifice: rituals transfer food
  - Transfers food resources to audience
  - Have option for attending clans to donate food to the event
- (P2) Trade goods
- (P2) Myth (levels?)
- (P2) Additional leadership
- (P2) Medical (herbs, surgery, incense, pottery?)
- (P3) Staging (areas, buildings?)
- (P3) Calendar synchronization
- (P3) Specialist performers/makers