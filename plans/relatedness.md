# On the relatedness concept

Things that should influence relatedness views:

*   General positive interactions
    *   Any kind of background positive interactions such
        as daily greetings, gift exchange, talking, minor
        rituals, etc. provide a base relatedness
    *   Random variations too, also including negative
        interactions
*   Kinship
    *   If having general positive interactions, kinship is
        a major boost

Implementation discussion:

We need some sort of interaction field or network describing
the interactions that generate this relatedness. Initially in
a village we may have things like:

*   Talking
*   Singing and dancing
*   Food exchange (2-way or n-way as communal feasting)
*   Gift exchange (2-way)
*   Rituals

Thinking ahead to scaling, at some point it will be hard for
every clan to interact that much with every other clan. We
can start with the idea of proximity, so that each clan
interacts with people notionally within a certain distance in
2D space. It would be nice not to have to implement a spatial
layout for clans, but it may be hard to make sense out of this
otherwise: completely separated neighborhoods don't allow
enough dynamism.

Given the interaction pairings, we then assume interactions
as listed above between them. There should be choices for
clans, but momentarily assuming everyone has is generically
cooperating, this will generate some relatedness, divided
by the number of clans involved (or fraction of attention
paid to each). For many kinds of interactions, there will
also be other effects, such as:

*   help when sick or other misfortunes
*   food variety/availability improvement
*   learning skills and opinions from each other
*   disease transmission

Clans can have different habits for how they interact. The
significance isn't entirely clear, but my intuition is that
it's important for them to have different personalities. An
obvious variation is to interact more or less than average.
Another is to emphasize certain kinds of interactions. There
is also the option to shun and not interact. There is also
the option to be selfish or generous. There should probably
also be options to break certain rules or be aggressive.

At the beginning, clans are semi-nomadic and spend much time
dispersed searching for food. We should compute clear interaction
intensities between every pair of clans, with some interactions
when dispersed (they'll still visit and gather for certain
rituals). It may make sense to separate rituals from other
kinds of interactions as for them, a little time goes a long
way, while other factors require lots of time together.