We need to have meaningful and understandable differences in
clan productivity:

*   Historically, productivity does seem to have varied greatly
    for both hunter-gatherers and farmers.
*   These differences will have much social significance in the
    model.

# Discussion: Farming productivity differences

I'll focus on farming, since the growth of agriculture is an
important part of the early simulation. These things seem to
be broadly true:

*   The base technologies developed rather slowly
*   Local land quality has a big impact on productivity, perhaps
    as big as 4x best/marginal
*   Differences in farming skill and cognitive ability have a
    significant impact, and are maybe responsible for 1/3 of
    the between-people variation in output
*   There may or may not be lots of differences in practice in
    a region. When skills are mainly tranmitted within families,
    there will be more differences. When there's more horizontal
    transmission among peers, there will be fewer differences
*   Knowledge of the local land has a big impact, as big as
    1.5x best/baseline. This in particular has to be transmitted
    very locally, e.g., inside the clan
*   Physical strength seems to have mattered in some cases, but
    perhaps less than motivation, with family firms being more
    motivated than big work groups
*   Conscientiousness probably matters. In the modern day, it
    seems its main effect is via working harder, but there might
    have also been more call for forethought back then
*   Systems thinking and other cultural factors. Apparently an
    "ecological" viewpoint is associated with greater farming
    success. This ties into skill and cognitive ability, but
    also suggests a rich separate domain of cultural and
    personality traits that can help with different activities.
*   Local relationships definitely matter: help from neighbors,
    women skilled at navigating local relationships, etc., may
    have as great or a greater impact than anything listed
    above

Some brief notes on factors affecting hunter-gatherer productivity,
in case it's important to contrast with farming in the simulation.
They include spatial memory, local knowledge, strength and endurance,
and persistence. These can give 2x the reproductive success, which
might correspond to a 2x productivity difference or even more.
Comparing with farming, it seems that persistence and local knowledge
are important in both cases; cognitive ability shows up but somewhat
different kinds; and physical qualities are perhaps more important
for hunter-gatherers, as they're "in the field" and have high-stakes
"contests" with animals. It would seem the cognitive demands are
pretty significant, too, but the impression is that farmers tend
more to generate education; lower cognitive ability and/or persistence
should probably be less of a survival threat to hunter-gatherers
than to farmers.

Now let's try to pull the above into a bit more order so we can
start thinking about how to model that. Let's just list factors
by some guess at total variation possible on that factor:

*   [H] Land quality
*   [H] Local relationships
*   [M] General skill
*   [M] Local knowledge
*   [M] Abilities - cognitive ability and others
*   [M] Traits - persistence and others

If [H] is twice as big a deal as [M], then "General skill + abilities"
is 1/3 the total from non-land factors, as noted above. If local knowledge
can generate up to 50% productivity improvement, that implies land can
be 2.25x (and we might actually want it to be more, though that value
is reasonable). All the human factors together would amount to 10x, which
is a lot, but hardly unprecedented, and it would be rare to be outstanding
on every point. Relationships aren't entirely internal, and without 
those it's more like a 5x difference, and without local knowledge 4x --
that's about what we can see inherently.

Abilities and traits seem relatively easy to handle, and we can probably
continue to use the existing system. It may be good to add a persistence
trait, but in general we should probably have both advantages and disadvantages
for traits we choose to include, otherwise it wouldn't make sense for there
to be variation. In particular, a trait that basically measures hunting
and gathering vs farming traits could be interesting. Social vs object
orientation would also be primary.

We probably do need separate tech level and skill level concepts. The
two things work different ways and both are important. Skill level is
the more important thing at first given the slow pace of change.

## Land quality

The first farmers might be able to focus on relatively good land and
so achieve good productivity despite low skill. As the best land gets
used up, it would be more important to gain skill.

To avoid jumping into major model changes right away, we can simply
assume that at small scales, the land quality for farming is good,
and give an output bonus. That way, we can continue to start with
less farming skill, yet have it have some point early on.

## Local relationships

We have this concept, now time to let it be a major productivity boost.
But, getting that major boost should be conditional on maintaining and
navigating those relationships well -- it may depend on relationship
status and skills, and there may be costs.

This should probably apply to hunter-gatherers as well, but perhaps
those relationships are more within the "clan", since they're at a
smaller scale. That justifies adding an "inherent bonus" in this category
should that be useful for tuning.

## General skill

Skill originally represented this, but at some point I made changes that
made skill more like technology. We're actually going to need both fairly
early on:

*   Farming, hunting, and gathering all involve general skill, and there
    could be significant variations. This could probably also vary quite
    a bit generation to generation.
*   Irrigation works beyond the simplest probably start to depend on
    specific technical innovations.

The model has always had both horizontal and vertical transmission, but
we can also think about how different factors might boost one vs the
other.

## Local knowledge

This is similar to skill, except that it resets if you move. (Skill could
reset too, if you switch to a different techne.) The knowledge needed by
farmers isn't identical to that needed by foragers, but there's probably
some overlap, so we could even let it carry over somewhat through that
change.

# Changes to make

*   Bring back productivity bonuses for relationships, but make them
    have costs
    *   The idea here is that people really need these relationships
        to be fully productive
    *   We could look at this either with "help" as a required input
        type, or as a trade. In this case we're mostly trading the
        same stuff, so it seems to make more sense to think of as "help"
    *   To start, we could let clans exchange help. With 0 help,
        output is maybe 75% of baseline. With help from 2x additional
        workers, output is baseline. With help from 4x additional 
        workers, output is 1.25x.
        *   Implementation details:
            *   To help each other, clans must have a relationship.
            *   Both have to decide to send help to the other.
            *   For now have them send equal amounts (equal matching)
            *   Because everyone tends to need more help around the
                same time, there's a limit (maybe 10-20%) on how much
                help a clan can send.
            *   Help costs labor from the sender, and generates "help"
                for the recipient
            *   Help looks like an input to the production process
                but isn't in proportion to output -- it's a more
                complicated relationship.
            *   Available help affects output as above, except also
                for larger harvests, some amount of help is probably
                required to bring it in
        *   Implementation steps:
            x   Review relationships code and existing relationship
                types
            x   Add planning step near effort allocation for clans to
                decide where to send help
            x   Deal with any issues around not everyone being able to
                help each other in simple ways for now -- be sure to
                respect constraints, but strategy doesn't have to be
                any good
            x   Make sure help labor gets charged
            x   Generate help resource before main economic production
            *   Add help to production process.
            
    *   Make help value depend on relationship status. No relationship
        => no help.
    *   Make relationship status depend on positive interactions with
        each other. However, this should probably be pretty cheap,
        with the cost maybe 10-20% of the benefit.
    *   The bigger limiter should probably be how many relationships
        can be maintained, and then bidding for those relationships.
*   (Bug) Look into food security, seems to make foraging depend too
    much on storage
*   Add a local knowledge skill that builds internally and resets on
    a move
*   Make general skill vary a bunch
*   Make skill change a combination of vertical transmission, horizontal
    transmission, error, and learning by observation
*   Make sure relationships matter for horizontal skill transmission
*   Add a foraging vs farming trait that affects each productivity
    and possibly other things
*   Add a social vs object trait that gives bonuses to relationships
    or production, respectively
*   Add inherent land quality bonus if needed
*   Tune so that farming and foraging productivity are similar at 
    start conditions

Bigger

*   Add land and land quality differences
*   Add slow techne development