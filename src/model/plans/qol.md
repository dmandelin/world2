The QoL model needs an overhaul. We'll start with some base concepts,
then try to assemble a relatively simple model that reflects them.

## Appeal

Appeal is a primary concept, and represents the attractiveness of a
choice to a clan (or other primary entity), such as where to live, what
rites to practice, and what to eat. Appeal is an Elo/softmax rating of 
the choice based on the clan's psychology, including:

*   beliefs about the choice
*   short-term experiences relating to the choice
*   social learning about the choice
*   social rewards or penalties expected for the choice
*   idiosyncracies

It is then possible to aggregate clan appeal ratings to form a standard-
of-living rating, which is how appealing the average clan would find a
given situation.

### Satisfaction and dissatisfaction

Having an option with higher appeal is not necessarily enough to trigger
a clan taking it. They may not know the option exists, they may not know
how to go about it, etc. Triggers can include:

*   innovator in the clan (low-probability random)
*   notable learning-about event (visiting the big city can trigger a
    desire to live there that did not exist before)
*   dissatisfaction with the present state

Therefore, dissatisfaction becomes a key concept, and is a part of the
appeal rating that can trigger a desire to move. Examples:

*   lean season: may or may not produce dissatisfaction based on culture,
    but probably at least some because clan deaths matter
*   poor housing: could affect health and appeal, but might not affect 
    dissatisfaction for someone used to it
*   fishing vs farming: insufficient food or lack of dietary variety
    could trigger dissatisfaction, but otherwise there probably isn't
    too much dissatisfaction here
*   clay figurines: to people not used to having them, not having them
    is not dissatisfying

The opposite of dissatisfaction isn't really satisfaction, it's supernormality,
"pull", "draw", "glory", "shine". Something that's a stronger motivator
than things like improvement in health. Clay figurines could produce pull,
as could increased yields, for people who measure and value them.

It may turn out that appeal is simply (pull - push), in which case we can
simplify things a bit, and that's fine. But it's possible there will remain
important but less salient factors.

## Demographics

Previously QoL monotonically affected birth and death rates. That worked
OK, but it would not make sense to have demographics depend so simply on
appeal, as unhealthy choices may be appealing. Here are some more detailed
factors we could track:

### Health

Based on nutrition and disease load. 
*   Influences both birth and death rates substantially.
*   Known health effects may substantially affect appeal, but more for
    short-term than long-term effects.

### Safety

Based on things like dangers from farm animals and tools, and ditches vs
floods.
*   High influence on death rate
*   Not necessarily any direct influence on birth rate

### Conflict

Warfare appears not to be a huge factor in our starting period, but there
must have been social conflict within, including some cases of violence.

TODO - simple model where crowding vs peacekeeping influence this
TODO - demographic effects

### Mood

Mood will tend to influence birth rates, with optimism and ease of
starting out in life increasing them.

TODO - more on this, it's subtle

### Culture

Various cultural practices such as brideprices, dowries, marriage customs,
and so on have a substantial influence. Unlike the other items, this one
is under collective control: if all the clans change family structures,
then they change. This is how people are able to adjust to secular trends

TODO - model

## Happiness

The above concepts mostly replace what we have today, except for two
issues:

*   There isn't any real way to rate how happy people are, how well they
    think they're doing.
*   Mood in the birth rate model would seem to need that rating.

This one is very interesting. I think it's similar to (appeal - expectations),
but not quite. Certain factors seem to produce happiness independent of measurable
things:

*   Family, social relationships, and celebrations
*   Rituals and achievements
*   Experiences and vision quests

Those are weighted differently for different people. For our farmers, rituals
and achievements are probably most important, then celebrations, then quests.
But there might be fishers who prioritize family and celebrations. In these
societies quests might be more occasional things from certain individuals, but
perhaps this is more common for fishers.

Pretty much everyone values plentiful food, good housing, good clothes, safety,
security, leisure, and prestige, so those can go straight into a happiness score
as before. Material items will be mostly relative to expectations, but almost
no one is happy with sub-survival levels.

This is obviously incredibly complicated, so let's do a quick take that we might
revise later. We can group happiness into 3 categories of equal typical effect:

*   Survival and comfort
    *   Includes food, shelter, clothes, and most things that promote health,
        fertility, and survival
    *   An extreme low rating here generally can't be made up for elsewhere
    *   There isn't necessarily an extreme high rating possible here
*   Security and society
    *   Includes peace, goodwill, good relationships, political stability,
        and things that promote the belief in a sustainable society with a
        place for our descendants. Also prestige, I think
    *   An extreme low rating here generally can't be made up for elsewhere
    *   An extreme high rating is possible, especially coming out of a crisis
        successfully, but it generally wouldn't last forever as conditions
        can't rapidly improve forever
*   Values and satisfaction
    *   Depends on the clan values. Sketching a few clusters:
        *   Early farmer cluster - celebrations and somewhat achievements
            *   Celebrations are important and better celebrations have a
                substantially improved effect
            *   Comfort items valued a lot
        *   Later farmer cluster - more achievements
            *   Prestige, formal rituals, and wealth become more important
        *   Fisher cluster - celebrations and somewhat visions
            *   Similar to early farmers but celebration quality less important,
                inter-relations more important
        *   Clan visionary - could pop anywhere and inspire the clan
            *   This can generate happiness for fairly arbitrary choices!