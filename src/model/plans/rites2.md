 # Rites

 Rites need another overhaul. The latest version added some of the
 important ideas, but the implemenation is lacking. The next social
 change is figurines, which have religious significance, so we
 need to treat this now.

 Key aspects and initial notes:

*   Infrastructural scaling: depending on how the rites work,
    there is a limited capacity for how many people they can
    properly serve.

*   Key components of rites
    *   Key components of rites in general are:
        *   Ceremony, sacrifice
        *   Show, music, dancing
        *   Crafts, clothing, decoration
        *   Food, drink
    *   At the moment we don't have differentiation. Everything
        goes under the Ritual skill, which is probably enough for
        now.

*   Appeal
    *   The rites have to be "good enough" to work. "Good enough"
        can mean various things, but the most important component
        would be that it seems pleasing to the venerated.
    *   What makes rites appealing?
        *   Quality/quantity/impressiveness of the key components
            *   On the negative side, there's correctness, with problems
                potentially spoiling rituals
            *   On the positive side, depending on the ritual, there
                are varying amounts of freedom over what to do, which
                could make things more appealing
        *   For parties and community festivals, usually more people
            makes things more exciting, but there can be logistical
            limits, and as usual there are diminishing returns on that.

*   Effects
    *   Effects of not having any rituals at all
        *   For now, this is something people wouldn't do
    *   Effects of more appealing rituals vs less appealing
        *   Quality of life
        *   Influencing learning or behavior. All by itself probably a
            10% factor or so, but depending on system dynamics that can
            be decisive
        *   Influences opinion of each other based on getting something
            good via mutual effort - effect can be strengthened if people
            attribute good things to the ritual
        *   Special events - when some unusual event happens, people may
            look to rituals to make sense of it, which could make them
            better or worse

*   Leadership
    *   Model somewhat after leadership in the general sense
    *   Base numbers of leaders (conceptually):
        *   Clan level: 1-2
        *   Village level: 1-2 per clan plus one overall
    *   Leadership structures for village rituals
        *   Common rite: leaders act together
        *   Turn-taking rite: leaders take turns in rotation
        *   Ranked rite: leaders act in sequence and/or with
            more and less important roles
    *   Effects
        *   Prestige generated for leadership
        *   Skill change

*   Elaboration
    *   Main things to achieve with elaboration:
        *   Skill/invention ladder that goes up higher than before
        *   Disagreement over details
    *   Model
        *   Let's imagine the ritual cycle has a bunch of different
            components. Elaboration basically means adding a new
            component, which creates the possibility of different
            clans adding different components.
        *   At some point in time there's the expected version of it
        *   But clans may start wanting to add a component.
            *   In a common ritual, everyone has to do the same thing for
                it to really work. If clans innovate on their own, it could
                reduce the ritual quality, or start giving it a ranked aspect.
            *   Similar seems to apply to a turn-taking ritual, except
                that there is some scope to build in a bit of individuality,
                which could start becoming a bit competitive.
            *   In a ranked ritual, there is scope for different people
                to act differently, but lower roles should not act more
                impressively than higher roles. They could try, though.
        *   Adding a component has effects:
            *   Can increase appeal of ritual
            *   Can increase expense
            *   Can increase prestige effects
            *   Increases skill required to perform ritual correctly

*   Limits to scale
    *   Logistics - certain types of village rituals, typically requiring
        the presence of everyone, can't be performed properly with too
        many people. There can be difficulties scheduling, fitting in
        village assembly spaces, etc.
        *   We might need to model this in some detail, e.g., having
            conflicts over the limited space
    *   Disagreement - there may be disagreement over exactly how to run
        the ritual
        *   There might need to be ways to managing this and then outcomes
    *   What really matters here?
        *   Probably depends a lot on the culture, but I can think about
            different actual rituals and how scale affects them.
        *   At very small scales, certain rituals depend on intimacy, everyone
            having a substantial role, etc., and this type of ritual can't
            be done in the same way with a larger group - something else
            must happen.
        *   At the clan scale or so, we don't need everyone to be seen
            quite like that on most occasions, but:
            *   We do like for everyone to know everyone. New people can be
                introduced, but somewhat gradually.
            *   With a lot of new people, there can start to be disagreement
                over how to do the ritual: how tightly to follow things, what
                behavioral tone to take, what foods to eat, etc.
                *   We probably want to model this explicitly.
            *   Note that at this scale, for the major rituals there is generally
                some somewhat substantial effect or show, which can still be
                produced communally.
        *   At the village scale, we might not quite have everyone knowing
            everyone any more, but there's still a desire for unified communal
            ritual where everyone can meaningfully participate.
            *   Issues are similar to at clan scale but bigger.
        *   At the town scale, it seems infeasible to have everyone-participates
            rituals. An 8-hour ritual still only gives 30 seconds per person if
            they take turns, or invisibility if they're all acting together.
            *   This type of ritual thus needs some way to generate audience
                draw with a smaller number of people than "everyone".
            *   This could be from raw appeal, based on some special resources.
            *   There will be some level of draw from having everyone together,
                which could hold things together a bit to get things started
            *   But perhaps the biggest draw at these things is the presence of
                special people (actual people or powerful beings)
            *   Finally, bullying can play some level of role.
            *   There can be neighborhood rituals similar to village rituals,
                but they must compete in the attention space.
        *   At the city scale:
            *   Town dynamics apply but bigger in every way
            *   There can be multiple competing kinds of rituals - unity can no
                longer be mostly assumed

## The pace of ritual innovation

Some factors that can affect the amount of ritual innovation:

*   Competition/emulation
    *   For example, if 3 villages newly come into contact, some might
        decide they like other rituals better and become more like them.
        So the more settlements in contact who can compete, the faster 
        things change overall.
*   Monopoly
    *   If one entity controls the ritual, they might suppress change, or
        just make there be fewer change inputs.
    *   But they could also intentionally try to drive fast change.
*   Priestly roles and institutionalization
    *   Supposedly they tended to be conservative. 
    *   But in some cases they would compete.
    *   This is somewhat similar to monopoly, but it's less about being
        the only game in town, and more about being big and rule-based
        in ways that make it hard to turn the ship.
*   Economic resources
    *   More wealth enables more elaboration and more experimentation.
*   Crisis
    *   Crises often induce rapid change and new religious movements.
*   Diversity and immigration
    *   More distinct cultural sources allow more change.
*   Oral culture
    *   More drift
*   Culture
    *   Different cultures and ritual cycles allow different levels of
        variation both structurally and in terms of norms.

## Plans

Based on the above, what do we want to add? Start with things that give
us social dynamism:

*   norms
*   elaboration
*   ritual and leadership structures

And we want village rituals to serve villages well, but to either break up
or transform as the village approaches town size. The problems will be:

*   logistics given ritual structure - one factor is that we can basically
    see that everyone is doing the same thing, also scheduling
*   difficulty agreeing on ritual features and structures

The way transformation works is:

*   There has to be a new ritual structure that satisfies people by being
    "good enough" (for the venerated) while being different. We should probably
    imagine gradual change processes here.
*   Basically they have to replace "whole village does stuff" with something
    else at the relevant points. For that to work the ritual has to be able
    to represent either the whole town, or, more likely, a god, which can
    then be an attractor point that starts to create a sense of town membership
    that doesn't depend on knowing all the people.

Let's brainstorm some specific model pieces we can build up:

*   Start with common rites and leader per clan with overall leader
    *   The overall leader is chosen by consensus
    *   Failure to achieve consensus may cause problems
    *   We might want allow not choosing an overall leader too
*   Elaboration and norms
    *   We'll start with a 3-component ritual: food, dance, sacrifice
        *   Costs food, and time to practice the dance
    *   First thing to add with elaboration will be figurines, from our
        existing list of changes
    *   Other ideas:
        *   New dance style
        *   New musical style or instrument
        *   New special effect
        *   New sacrifice
        *   New food item
        *   New clothing
        *   New decorative/ritual item
        *   New art style
        *   New myth
        *   New god
    *   Clans can accept or reject elaborations - change norms to match or not
        *   Clans can accept some level of misalignment, but otherwise
            there are quality of life penalties that increase with both
            the level of misalignment, and over time.
*   Have to decide how to run the ritual, similarly to choosing leader
    But really that one choice creates the key seed of disagreement
*   We'll need the better clan knowledge system too. Let's say that
    settlements comprise neighborhoods of up to 150 people or so.
    Within, everyone can know everyone, but they have less visibility
    across neighborhoods, and we can try various connectivities there.
    This means villages should stay highly coherent up to 150 people,
    but will start to generate more disagreement above that size.

*   Key first steps
    *   Expectations seem at the core -- maybe start near there
    *   Clan knowledge system
        * Consider making some similar changes to quality of life
    *   Leader election system
    *   Elaboration and norm system

As it often is, it's hard to see exactly where to start. Maybe it makes
sense to start with the outputs, what are they? Clearly we have something
about how many people can be served and what happens there. It would
seem that key outputs aside from quality of life (which we already have) 
are:

*   Norms
*   Solidarity

Maybe we can get started like this:

x   Simplify and correct solidarity ratings
*   Start adding norms
*   Some piece of ritual elaboration?
*   Some feature change to agree over or not?

Rethink based on the next goal of clay figurines:

*   Obvious approach is similar to ditching, add bit for using clay
    figurines based on trade model
*   But then we also have to do stuff on trade model, and should add
    norms, which makes that big
*   But we really don't need to do the trade model right away, could
    make some trivial assumption about that, then refine later.
*   And it will be good to bring in norms, because that'll be an
    important part of that shift. And then we might have enough to
    do more refinement of the first 3 shifts (next up is canal irrigation,
    which is a natural extension of ditching)

Workup on clay figurines:

*   Give clans optional off-map trade partners
*   They have an ongoing relationship and automatically send away
    some amount of goods and receive clay figurines
*   Base effects are on quality of life, ritual appeal, and
    prestige, but that could change, and maybe alignment now that
    we have it
*   Decision: clan use vs village use
    *   Clan use: QoL bonus for clan solidarity, small prestige bonus,
        also internal prestige bonus
    *   Village use: Means use in village rituals. Boosts ritual appeal
        and prestige
    *   Also consider gifts, common use, and local exchange

Next steps for clay figurines:

*   Implement exchange
    x   Send away 2-5% of produce
    x   Receive arbitrary unit of clay goods
    x   Update consumption amounts.
    x   Display in the UI
    *   Then decision about private vs public use and effects
    *   Later we may need differential appeal values, but not for now

Next steps on updating rites to work with this. We'll want to simplify
the main model a bit and make it convenient to add ritual goods.

*   Give clans two categories of satisfaction, village rites and
    clan rites.
*   Have some sort of base appeal based on the structure of the rites.
    Could be 0 to start with.
*   Work out a skill appeal function incorporating one or more of:
    *   Compounding error rate
    *   Additive errors
    *   Higher appeal based on creativity
*   Add some appeal for clan diversity
*   Consider updating skill before the rites to account for modifications
    to the rites
*   Add logarithmic appeal for scale (probably both producers and consumers)
*   Deal with overcapacity through some combination of:
    *   Appeal goes down for everyone
    *   Appeal goes down for some but not others
    *   Conflict that reduces QoL
*   Clay figurines:
    *   Most basic: add appeal to the ritual they are used in
    *   For clan use, increase internal prestige and QoL
    *   For communal use:
        *   Add a norm about this for each clan
        *   Prestige and QoL effects depend on norm
        *   Norms change through the usual mechanisms
        *   May need further conflict mechanics, but these figurines
            were probably not that controversial