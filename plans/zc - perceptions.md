# Perceptions

I'm starting to get a little confused by the different judgments
clans make of each other. Time to go over them again.

A key question is, what behaviors does the perception influence?
Or, for each behavior we have or care about, what perceptions
would influence it?

*   Marriage
    *   Similarity: similar but not too similar; as in same
        culture sharing local adaptations
    *   Prestige (more about what this is later)
*   Gifts by relatedness
    *   Affinity: broader than kinship, often somewhat intentional,
        as in formal friendships and gift exchanges
*   Aid in time of need
    *   Relatedness (game-theoretic)
    *   Warmth (more about what this is later)
*   Imitating production choices
    *   Prestige
    *   Competence (more about what this is later)
*   Learning skills
    *   Prestige
    *   Competence
*   Teaching
    *   Relatedness
    *   Affinity
*   Adopting opinions of others
    *   Prestige
    *   Dominance
    *   Authority
*   Religious guidance
    *   Prestige
    *   Authority
*   Targeting for conflict
    *   Low warmth/relatedness
    *   Low competence/dominance

Looking for patterns and clusters:

*   Marriage is special:
    *   Want similar but not too similar
    *   Prestige generally matters
*   Helping behaviors go with the relatedness/warmth group
    most of all, but also:
    *   People might give gifts to the prestigious and/or
        dominant to stay on their good side
    *   When the chips are down, people might act to save
        the prestigious, but not necessarily the dominant!
    *   People also do gift exchange in part as a way to
        create relatedness, e.g., to help keep the peace,
        keep lines of communication and meeting marriage
        partners open.
*   Harming behaviors go with low relatedness/warmth and
    easy targets
    *   There can be covert harm against hard targets
*   Imitation behaviors go with prestige and competence:
    *   Which is favored would depend on the learner: how
        much they're interested in prestige or not, and
        how much they can assess competence on their own.
    *   Adopting opinions is a little different - dominance
        may be relevant too.
*   Religious guidance is by prestige and authority
    *   Competence is hard to separate from prestige here.
    *   Authority here is a crystallized prestige attributed
        to a position or role; when it exists it probably
        tends to have a lot of prestige, although of course
        not for everyone.

Some further analysis:

*   Relatedness
    *   An important parameter, but it isn't necessarily the
        main influence on behavior by itself. Other factors
        matter too.
    *   In general, this should be defined as some kind of
        similarity, which might often be mainly on cultural
        dimensions.
    *   Relatedness felt between two random people in modern
        societies might be effectively 0.02-0.4, depending on
        context.
    *   With a given r, someone would generally want to donate
        as long as rY1 > Y2.
    *   With nonzero r, someone would generally be willing to
        give a lot to save a life.
*   Perceived Valence
    *   Will helping the other party help or hurt us - that's
        often the key question.
    *   Relatedness is a direct component, but also boosted by:
        *   Valued exchange
        *   Valued gifts and benefits
        *   Perceptions of others expecting us to help or hurt
    *   Whether someone follows norms seems to be an important
        empirical component of this. That appears to be an
        instance of strong reciprocity.
    *   What determines valence for our initial people?
        *   Key factors
            *   Generosity
                *   Generosity to us counts most, but general
                    generosity counts too
            *   Cooperativeness
                *   Working well together on useful things, e.g.,
                    being a good partner in the hunt
            *   Piety
                *   Proper behavior with respect to rituals and
                    customs
            *   Sociability
                *   Affability, experience of positive relations
                    and general interactions
            *   Peacefulness
                *   Not attacking, stealing, or using sorcery
                    against neighbors
        *   These are similar to what we have in respect now.
            We should update to have one valence or alignment
            value that includes relatedness and these items.
*   Perceived Power
    *   The meaning depends on valence:
        *   Positive valence
            *   High power => prestigious, deserving imitation
                and cooperation
            *   Low power => deserving compassion
        *   Low valence
            *   High power => threat, avoid or attack covertly
            *   Low power => ignore, exploit, attack directly
    *   In general, the power has to be power that can affect us
        to be of concern. However, power that can alter parts of
        society we care about is enough, so this might be easy to
        satisfy.
    *   How can our people affect each other?
        *   Gifts - being in a relationship with a richer party
            can be beneficial if they're expected to give more
            gifts.
        *   Aid in time of need - being in a relationship with
            someone who actually helps makes sense; clans have
            certain options not to aid
        *   Marriage - key relationship
        *   Conflicts - having the option to play hawk
        *   Ritual help - intercede with the gods, can be very
            significant
        *   Infrastructure projects - want cooperation, people
            doing a good job on projects
        *   Teaching skills - want to be able to gain skills
    *   What makes our people look powerful to each other?
        *   Size of clan
        *   Lots of crops grown/stored (but somehow has to be
            visible)
        *   Giving lots of gifts (requires wealth), but has to be
            visible enough
        *   Skills
        *   Ability to intercede with the gods, perhaps based on:
            *   General prosperity (signs of divine favor)
            *   Costly/supernormal signals
            *   Personality and demeanor
            *   Success in past endeavors
    *   For people with egalitarian norms, high power might automatically
        reduce alignment.
    *   For people with meritocratic norms, low power in an important
        role might reduce alignment.
    *   How does perceived power affect behavior in the simulation?
        *   Positive alignment, high power
            *   More likely to copy opinions/behavior
            *   More likely to want to marry
            *   Higher desire for help relationships
            *   Higher desire to learn skills from
            *   More likely to elect as leader or ritual specialist
        *   Positive alignment, low power
            *   More likely to send aid; but really, we can have aid
                pretty much go by alignment except in dire straits
        *   Negative alignment, high power
            *   Spread gossip
            *   Attack via sorcery
            *   Leave
        *   Negative alignment, low power
            *   Ignore, shun

Main things we need to do:

*   Firm up concepts of similarity, alignment ("warmth"), and respect
    ("competence"):
    *   Similarity based on similarity on perceived factors
        *   For now come from:
            *   Kinship
            *   Marriage
            *   Vicinity (assume some level of cultural similarity
                for now)
            *   Habits (residence, farming %)
            *   Traits (personality)
        *   Later also:
            *   Language
            *   Culture
            *   Style
    *   Alignment based on:
        *   Similarity
        *   Benevolence (giving gifts, doing good stuff)
        *   Cooperation (helping out, being a good partner)
        *   Piety (following rituals/customs)
        *   Sociability (being friendly/likable)
        *   Peacefulness (not attacking, stealing, etc.)
    *   Respect based on:
        *   Population
        *   Visible wealth
            *   Definitely includes gifts
        *   Visible skills
        *   Visible allies
        *   Divine favor - appearance, previous results