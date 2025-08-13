The skill change model needs some updates for these problems:

*   Processes such as stone tool manufacture could stay the same
    for a long time. The current model has way too much noise for
    that ever to happen.
*   Maximum skill tends to be capped at a number that's around 50
    with not much information about exactly what the cap is, why
    that's the cap, or how clans could go beyond.

Those features emerged from decisions made to model certain ideas
of skill loss, but it's not clear those ideas are even that important
for the goals. So it's time for a fresh look.

Initial things to care about:

*   Clear idea of what current skill maximum is
*   Some idea of what skill growth rate is
*   Diminishing returns to learning
*   Diffusion from the north
*   Whether to discretize things. Continuous averaging implies
    everyone's always doing some mushy combination of ideas,
    which may or may not make sense.

Random thoughts:
*   maybe 10-20% / millennium productivity growth?
*   domestication will be a major factor and that can be somewhat continuous
*   need to understand agricultural intensification and its relationship
    to innovation

Thinking things through:

*   We can imagine various changes in how people do things:
    *   Small or not so small changes in using an existing tool kit.
        For example, different exercise practices. These are small
        variations that many practitioners could dream up. The effects
        may or may not be that obvious.
    *   Bigger jumps that are not so easy to think of, or have
        preconditions. For example, it appears people did huge amounts
        of math without ever coming to the modern concept of zero as
        a number. That may have been a rare idea and/or depended on
        some preconditions like a certain number of people doing a
        certain amount of algebra.
    *   Necessity-based innovation. Need doesn't automatically cause
        innovation, but it increases the incentive to try new things
    *   The key problem for now is simply to get irrigation skill high
        enough for permanent settlements.
        TODO - make some decisions about what the skill basis is

*   Expanding populations and how this interacts
    *   Group sizes were initially small, and we imagine they were using
        naturally occurring alluvial farms that shifted in location.
    *   But they wanted to avoid floods wiping out their crops, so they
        gained skill in flood control. They could also use it to even out
        water supply.
    *   As population increased naturally, they would want more farmland,
        so they would start using their skills to irrigate areas nearby.
        *   At first, this could probably be increased skill with the same
            technology, but maybe that's not quite right. Think it through:
            *   One nice model of skill is that it's what % of possible
                tricks of the trade you've learned.
                *   It probably is reasonable to think of "small scale
                    water management" as a skill set that encompasses
                    both things
                    *   But then we have to say, once they've mastered
                        flood control (or whatever current needs are),
                        they gain further skill very slowly until there's
                        a real need
                *   The alternative would be to add a flag for having
                    irrigation. Then it becomes a lot less obvious how
                    to manage that skill model.
                *   What might be more usable at some point is to think
                    of certain innovations as obsoleting older knowledge,
                    so then we can have TFP go up but skill down.
                *   Thinking ahead to large-scale irrigation, apparently
                    it's a distinct skill.
                    *   One option is then to add it as a new skill. Small-
                        scale skill may convert over to some extent.
                    *   We could also subsume them. Then, we'd lower skill
                        with the change, but give a bonus applying to the
                        "easier" tasks.

*   How does development depend on amount of practice?
    *   For domestication, we might imagine that there's some variance
        in plant traits, and farmers "try" (intentionally or not) to
        choose more favorable plants for the next generation.
    *   This would tend to produce a change proportional to the standard
        deviation in the available traits.
    *   Then ideally improvement would scale with the square root of the
        number of crops grown, but in practice people might not be able
        to compare and communicate so accurately.

*   Skill level of practioners
    *   Consider a skill where the kit is well developed, so that experts
        have a skill level near 100. Then an apprentice (1/3 of learning
        done) would have a skill level of 60 and a journeyman around 90.
    *   A much easier skill with less to learn might have 10/20/30 for
        the levels, or 20/35/50, or 30/50/70.
    *   So around 10 points per rank for less developed skills, 20 for
        highly developed.
    *   Vaguely 2x difference for basic vs able practitioner seems reasonable,
        maybe 1/2-1/4x for punter depending on difficulty curve
    *   Implies around a 3% productivity difference per skill point.

*   Our time period
    *   Since skill is % tricks of the trade, the actual value completely
        depends on the reference definition of "the trade".
    *   For the moment, we'll take that to be "early Ubaid stuff"; it
        seems not too much was introduced in fundamental tech kit but
        there could be increasing diffusion from the north and certain
        local adaptations and changes, maybe worth 3-7 skill points
        over 50 turns = 1 skill point innovation per 10 turns (or 200
        years). Seems vaguely reasonable, and at that rate of improvement
        maybe most people get most stuff via diffusion.
    *   Naively carrying that over to irrigation we get the same idea
        but it's probably a lot less developed. Could be 1/10 the learning
        cost. Thus, they could gain a meaningful skill point each turn.
    *   Maybe then apprentice to master is going from minimal flood control
        to reliable. Since it's on the low end maybe that's 20-30 skill
        points, or around that many turns (400-600 years), which seems
        very workable.

Trying to make some decisions:

*   Let's rebase skill to 100 with discrete 1-point steps.
*   Adjust skill change details per notes above