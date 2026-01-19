In the current simulation, productivity is somewhat stagnant, so
clans have a hard time generating much of a surplus. There are also
some related issues around how the model mostly assumes there is
one product per skill, but things aren't really that simple. Time to 
think harder about productivity and where it comes from.

## Productivity in general

General factors affecting labor productivity:

*   Environment
*   Capital (land etc)
*   Tools
*   Implicit practices (mechanical and human)
*   Explicit practices (mechanical and human)
*   Worker health

## Agricultural productivity

Agricultural productivity improvements included:

*   Already present at game start
    *   Original crops: wheat, barley
    *   New crops: lentils, chickpeas, flax
    *   Flint sickles
    *   Grinding stones
    *   Clay-lined storage pits
    *   Hoeing
    *   Seed selection
    *   Seasonal planting
*   At game start or right after
    *   Soaking/fermenting grains
    *   Collective harvests
    *   Communal storage
*   Later
    *   (?) Salt-tolerant barley
    *   (early?) Small-canal irrigation
    *   (6000) Labor coordination
    *   (5000) Floodplain irrigation (larger scale, take advantage of
        natural landscape)
    *   (5000) Canal networks
    *   (5000) Other flood-control improvements
    *   (5500) Clay granaries
    *   (5500-5000) Pottery for storage and cooking
    *   (5000) Bread baking
    *   (5000) Tithing/donations

## Prehistorical technological development and learning

Toolkits could remain the same for hundreds of millennia in the
Paleolithic. Things seemed to start happening faster with the
appearance of "modern" humans 100,000-50,000 years ago, but it
seems that most of the time people did their best to precisely
imitate what had been done before. Obviously there were innovations,
which may have been created by rare tinkerers, in response to
necessity, by implicit domestication, or in by random chance.

Innovations were probably often ignored or suppressed. We could subsume
that into the model for now, but at some point we will most likely want
a concept of more or less innovation-accepting cultures.

We can model many "minor" innovations as part of skill level. The sources
of skill gain are then:

*   Diffusion from outside: Could definitely be a factor in our start
    state, especially along trade routes.
*   Innovators: Low-probability logistic skill growth.
*   Necessity:
    *   Small-scale: Various glitches and problems (like missing an
        ingredient one day) can prompt trying new things, which might
        result in skill gain. This could be a baseline source of skill
        gain up to some limit, depending on how much local entropy there
        is.
    *   Large-scale: We can have bigger changes happen by necessity
*   Auto-domestication: More salt-tolerant barley will develop through
    natural behavior of farmers.
*   Error: People will sometimes do things wrong, but apparently they
    tried very hard to exactly copy what had worked before, so we can
    dial down that factor. We may also want a small amount of innovation
    available here.

One issue is that each of these sources should lead to only so much skill/
productivity gain, but if we have one combined skill rating, they could
take people all the way to the top. This can probably be fudged in a simple
model (have the small stuff grow up to a certain level, innovators needed
after that) or there could be subscores.

## How people increase their productivity

Note that all the learning modes can help each other, and all are relevant
for all of human history.

*   Implicit knowledge
    *   Imitation learning of implicit knowledge probably goes back to
        the LCA with chimpanzees or earlier, at least 6M years ago
    *   This is a relatively slow method of teaching all by itself and
        would have a very limited skill level.
    *   There could have been early rituals based on this type of knowledge
        only: simple dances (sequencing needs explicit knowledge), special
        places, special sounds.
*   Tools
    *   Start 2.6M (Oldowan) to 3.3M (pre-homo hominins such as 
        Australopithecus afarensis) years ago
    *   Can be used with imitation learning and likely enhance it
    *   Usually require raw materials
    *   Can typically model as current expenses but in reality tools or
        materials such as metals could be used a very long time
*   Explicit knowledge
    *   Language, perhaps developed enough for carrying explicit production
        knowledge 1M-100K years ago
    *   Can't teach all the micro-details of implicit knowledge, but key pieces
        of knowledge can be encoded very cheaply; a much richer collection of
        if-then cases becomes available to social learning
    *   Writing enables a longer library of this to be retained
*   Infrastructure, capital, and environmental modification
    *   Probably started by 10,000 BC
    *   Includes irrigation, soil enhancement, buildings

### "Social" vs "technical" practices

Knowledge can be classified as either of:

*   Social: dealing with people and relationships
    *   Example: harvest ritual with collective work routines
*   Technical: dealing with the rest of the world
    *   Example: craft flint sickles for harvesting grain

But the distinction is mushy. Most technical practices require some sort
of cooperation (getting sickles to the harvesters and having them use them).
Most social practices require tools and supplies. Some practices may deal
intensively with both and aren't easily classified.

Thus, there doesn't appear to be an explicit need for a hard distinction
between the two. Instead, it's a meaningful spectrum where each represents
one of the two post-bipedalism pillars of humanism:

*   Social
    *   Reflects the fundamental human concerns of care and cooperation
        People may particularly excel in this dimension and not the other
    *   Often (but not always) requires matching choices by other people
        nearby for a practice to take effect
    *   More relevant to people's view of themselves and each other
*   Technical
    *   Reflects the fundamental human concerns of tools and resources
        People may particularly excel in this dimension and not the other
    *   Often more cumulative than social developments, improving from 
        step to step rather than changing with fashion or power shifts
    *   More likely to require specialized skills
    *   Typically more relevant to differences in power and prosperity

## Modeling discussion

For now, many factors can be subsumed into the skill model, with 
appropriate adjustments. There will be some continual improvement
via domestication and various minor improvements in tools and practices.

*   Permanent settlements
    *   There's a new practice, time/activities spent in the farming area.
        *   Intelligence would be the relevant ability
            *   We haven't split social vs technical intelligence yet
                but at some point we might want to if people start to get
                different specialties
        *   We don't have a skill for living in a village, but maybe
            we should!
            TODO - research that (but also including village social skills
            in farming would be a simple option)
        *   No particular requirements, but people won't want to unless
            technical comfort factors have been arranged
    *   Ditching is also relevant here.
        *   We'll need a more complicated skill model eventually, but the
            current need is to model basic ditches that avoid the need for
            moving farms and help productivity a bit
        *   For now irrigation can be a normal skill factor
        *   But the difference is less about productivity and more about
            quality.
            *   Thinking through how to model that:
                *   The obvious move is to have the ditch be a "saving throw"
                    against washout with an Elo or recall model
                *   For the productivity part, we should probably just include
                    irrigation skill as an adjunct when determining farming
                    productivity
                *   Elo is exponential-like, so our skill values can be used
                *   Thus, ditch quality = skill
                *   We'll want some randomness; could be interesting to apply
                    to the ditch and having flood difficulties relatively
                    similar
                    *   In general we need randomness in only one place
                        Might want to favor what's easier to communicate
*   Farming
    *   Collective farming rituals probably help here.
        *   How to model:
            *   We could subsume into farming skill, but if people shift away
                from collective production, that part wouldn't be relevant any
                more. Probably better to use this to create a bonus, which is
                a realistic and understandable benefit of collective production
                and rituals.
            *   People also need the rituals for morale purposes, as it's weird/
                scary/whatever to work all season, hoping you get something at
                the end.
                *   Probably need to think about this more, but we could have
                    an anxiety happiness penalty for farming (until people get
                    more culturally used to it?) that can be countered by
                    rituals. Allow elaboration to make it more than countered.
                *   Should also help farming skill learning, but not innovation
            *   Ritual skill means more elaboration than skill carrying things
                out
    *   Farming skill is mostly micro stuff for the first millennium
    *   We can add irrigation to expand farmland if populations get to the
        point of requiring it
*   Housing
    *   Initially we'll have small houses.
        *   Not clear if there should be a skill requirement, but probably.
        *   Can use the Elo/recall model, have low but nonzero difficulty for
            huts, higher difficulty for cottages
        *   Consider skill not being able to go beyond cottage level unless they
            actually build cottages
            *   Not that important, though, maybe they built a few but not enough
                to model, so they do have the knowledge
*   Clay figurines
    *   The precise significance is somewhat unclear, so let's try thinking
        about "the most graphical object we have". Today that would be phones,
        obviously the most important thing as any baby could tell you. Formerly
        it seems people were pretty excited to get cheap photo posters and such.
        The item is obviously too simple to play the same role as a phone, but
        we should probably assume it was either a "magical" object or a "holy"
        or "powerful" object with "magical"-level powers.
        *   A very detailed version of this would have the figurines gain
            significance over time. For example, someone would get sick, a
            ritual would be done, they'd get better, and the ritual with the
            object would be preserved.
        *   But it might be good enough to simply assume the object has a
            powerful status. It would provide morale, prestige, and happiness.
        *   Clay figurines will also enhance the effectiveness of ritual, but
            as they are small that probably would have a major effect on small
            audiences only.
        *   By firing the imagination, clay figurines will give a small bonus
            to innovation in *all* skills
        *   Finally, our clans may be inspired to produce their own.
            *   Usually they would need a teacher but in rare cases they could
                develop the art largely on their own
            *   We'd need another skill for that, but really, we should be
                thinking more about basic pottery for that.