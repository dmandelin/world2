# Regular Settlement-Level Rituals

## Initial Thoughts

*   The prototype is the harvest festival, but we assume there are
    various regular rituals
*   Why do people do it?
    *   Incredibly deep question, but we'll assume major motivations
        are:
        *   Custom/habit
        *   Desire to maintain connection with ancestors, natural
            forces, and other powerful beings
        *   Experience of happiness and other positive emotions and
            outcomes in previous iterations
    *   Note that those map on fairly clearly to existing patterns
        of modeling relationships and attitudes
*   What do they do?
    *   So far, we've abstracted away from any notion of craft or
        trade goods, but there probably were special materials and
        foods used. The key point here would be it's something
        special that's not necessarily easy to get or available to
        everyone
    *   Music, dance, food, costumes - "party" features
        *   Beer
    *   Sacrifice and other formal rituals - "gifts", which at the
        beginning could be very simple but apparently both the gifts
        and the procedures for giving them can become elaborate
*   What skills are involved?
    *   Production skills - indirect, to produce needed supplies
    *   Ritual skill - what this is is somewhat murky but based on
        how it works so far it's basically skill at the formal parts
    *   Craft/performance skills
*   What does it cost?
    *   Time: to perform the ritual itself
    *   Labor: practice, setup, acquiring special goods
    *   Cereals: need beer
    *   Other foods: gruel and beer only wouldn't be a festival
    *   Stress: there could be stress costs in extensive preparation
        or worrying whether the sacrifices will turn out
*   What are the effects?
    *   These could impact many many simulation values:
        *   More opportunities to meet
            *   For marriage - improves birth rates by making
                marriage easier
            *   For initiating other kinds of relationships
            *   For general interaction
            *   Skill and behavior learning opportunities
        *   Health, happiness, and stress
            *   Empirically, people seem to derive mental and
                physical health benefits, but the mechanisms aren't
                entirely clear
        *   Behavioral focus
            *   Can influence choices about what to do/learn
        *   Respect / Holiness
            *   People who pull off difficult aspects of rituals
                will gain respect
        *   Alignment
            *   Alignment boost via another channel for positive
                interaction
            *   Can more explicitly align depending on content
                of rituals
        *   Conflict mitigation
            *   Some conflict resolution could be done under ritual
                auspices, giving a similar effect to a powerful
                mediator
        *   New considerations
            *   Appeal
                *   People might gain choices about which rituals to
                    do or attend, so there could be an appeal factor
                *   But also, in general, if the ritual is more
                    appealing, people will give it more attention and
                    so it will have greater effects
            *   Intensity
                *   Even assuming full attendence, some rituals demand
                    more than others and then would have greater effect
            *   We could start by subsuming both under a "ritual power"
                value
*   Structures of cooperation
    *   These could be done in various ways, but at the start we'll
        assume it's a blend of communal sharing and authority ranking,
        with it basically being a sharing occasion but elders
        coordinating
    *   Coordination games
        *   Let's think about coordination games ("coordination problems")
            that may naturally arise in this kind of setting:
            *   Scheduling: choosing when to gather, or allocating time
                for scarce infrastructure
            *   Agreement on roles and procedures: what items will be
                sacrificed, what order things will be done in, how
                rituals are started and ended
                *   For example, what gift is fit for the gods in a critical
                    situation could become a major point of argument if two
                    clans are both convinced only their gift will work!
            *   Allocating shared resources collected for the event
        *   At this point, we probably need something like loose agreement:
            it's probably OK if a lot of what people do is "their clan's
            way" as long as it's similar enough to what "their clan's way"
            has been and meshes with the others
        *   A key point here is that everything is bespoke for the exact
            people of this community.
            *   => If the set of clans changes, the rituals must change
                Probably want an effectiveness value that decreases after
                a shift
            *   => To mesh with each other and bring up effectiveness,
                each clan needs to mesh with each other clan
                *   That implies that with scale, clans have to adapt
                    to a larger number of N, so it takes longer.
                *   But also, there can be more variance among what
                    they're trying to mesh with, so it's harder to
                    even reach a state of meshing
                *   Clans could try to solve by being very conformist to
                    each other, but error happens. Without synchronization
                    mechanisms such as writing, even though they're trying
                    to do the same thing, if they're not mixing frequently
                    they'll end up doing different things
*   Skill differentials
    *   Craft has more impact on appeal and less impact on intensity
    *   Ritual skill has more impact on intensity and less impact on appeal
*   Leadership opportunities
    *   If it's a standard set of rituals people are very used to
        carrying out, in theory they could "just do it" collectively,
        each doing a required piece. However:
        *   That assumes that everyone has a defined role, whether
            each clan has a specific role, or each clan does the same
            thing.
    *   Based on real-world experience with village-sized organizational
        structures, a heavy leadership apparatus isn't needed, but
        something is:
        *   Communicating with other groups (when applicable) and making
            a decision with the other group that will stick
        *   Resolving conflicts and coordination issues as they come up.
            E.g., due to illness someone can't do a certain thing, and
            now an adjustment must be made. Or a schedule conflict between
            two rituals.
        *   Supplying special skills and resources that not just anyone
            has.
        *   Supplying expertise for key components of the rituals that
            must be done correctly.
        *   Reminding people to do their necessary tasks.
        *   Marshalling people during the rituals and gatherings.
        *   Resolving disputes that could otherwise disrupt the rituals.
        *   Creating opportunities for new people to learn how to take up
            these roles
*   Scaling limits
    *   Scaling could get a bit murky because it would depend on details
        of organization that we're not necessarily modeling, e.g., exactly
        how many elders are involved doing what
    *   We could instead ask the question, at what point would a tradition-
        oriented elder-led system start having a hard time functioning?
        *   It's not entirely obvious there'd be a hard limit to scale
            there, but we can definitely see some situations where it
            wouldn't work:
            *   Need highly specialized skills and materials that the
                elder collective can't produce/organize
            *   High disruption, diversity, or internal conflict, so that
                there isn't a common way of working that elders easily
                slot into and maintain; more intentionality and cultural
                innovations start being needed
        *   It appears that acephalous societies can scale up to a pretty
            big size (20K+), but they don't seem to generate large
            settlements, which is interesting. 
        *   Perhaps a core idea is that in this type of society, we don't
            actually have a lot of common infrastructure or organization,
            so each clan has to be processed as a unique entity rather
            than a member of a class.
            *   Thus, information processing costs rise dramatically as
                either settlement or society scales up, but the limit is
                a lot more relevant at settlement level since the
                interaction density is much higher. It's probably also
                true that in a 20K-person society of this type, they're
                not all interacting together that much, but rather in a
                mesh by proximity. 
            *   Thus (2), rituals need a structure where each clan is
                going to have an appropriate part. 
                *   Here, we assume some a mix of communal sharing and 
                    authority ranking at first.
                *   The ritual thus needs to be structured so that:
                    *   Each clan plays a part and that is common knowledge
                    *   Elders have priority in some way and that is common
                        knowledge
                *   How might those conditions be satisfied or not?
                    *   With <=3 clans, probably fairly obvious everyone
                        plays a part
                    *   Above 7, it might start becoming more unclear who
                        played a part, or some might start to be missed
                    *   Each clan has to know what the local ritual is and
                        perform it in more or less the right way
                    *   There will probably always be some differences in
                        how well people participate and how much notice they
                        get for this, even in egalitarian or ascetic settings.
                        But as wealth and size build, differences might
                        become large enough to dominate attention, and so
                        those with less attention have to choose between
                        becoming spectators, starting something new, or
                        protesting in some way
                    *   Elder priority might be easily satisfied by seating
                        and placement

## Synthesis

That was a lot of stuff. Now we need to pull out some key features for a
kernel model. Some of the most important points are:

*   Effects
    *   Rituals can boost alignment, sense of security, health, and information
    *   Rituals can also boost productivity or make certain choices
        (such as farming) more appealing
    *   Leadership positions can increase or decrease holiness, depending
        on results
    *   Rituals can boost identity (not mentioned above)
*   Requirements and Costs
    *   Basic stuff - time, labor, cereals, other foods and goods
    *   Effective common knowledge - everyone has to know that everyone
        knows everyone participated as expected for the ritual to have
        full effect
        *   If everyone's supposed to be seen and our clan wasn't seen
            because time ran out, we are not going to feel a great sense
            of security
    *   Agreement on ritual structure and procedures
        *   Even if people think they're just upholding standard traditions,
            sometimes they'll randomly do something else!
        *   Similarly, even if the culture is to uphold standard traditions,
            sometimes a clan or person will not.
*   Ritual Structure
    *   Rituals will always have a named, defined *structure* that determines
        who can participate and on what basis.
    *   The initial structure will be "Communal Festivals".
        *   This indicates events that are more about festival than ritual
            but have possibly quite important ritual aspects.
        *   Each clan contributes what they expect and are expected to
            contribute.
        *   Effective common knowledge works up to 200 or so but then
            falls off.
*   Combining Inputs
    *   Our first rituals require time, food, craft/performance skill
        (e.g., dance), ritual skill, effective common knowledge, and elder
        leadership
    *   Maybe there isn't just one ritual success value: different inputs
        will affect different aspects. Real-world events also influence
        the result:
        *   The "party" aspects (more from craft skill) have the most
            influence on alignment, health, and information
        *   The "ritual per se" aspects (more from ritual skill) have the
            most influence on respect, sense of security, and behavioral
            choices aspect
        *   Events in the world will indicate to people whether their
            rituals were successful.
    *   The generalized factors we do have:
        *   Ritual Appeal: Which aspect matters more could vary by clan,
            but in general, we might imagine that in an average clan,
            roughly 15% will go just for the ritual, 15% just for the
            party, and the other 70% for some combination of those two
            along with the other 15-30% going. At this level there appears
            to be strong complementarity - driven partly by the need to
            have something for everyone. Maybe r=-2 or -5?
        *   Ritual Intensity: This would seem to feature more substitutability
            across the aspects, but it would depend somewhat on what people
            are expecting.
            *   Assuming people have enough time to adapt to their rituals
                and vice versa, then the height of intensity is what counts,
                so that's like a big value of r for CES
            *   If they don't, then each clan is going to have a sensitivity
                to each aspect, and the one that is highest for them counts.
                Or their own weights for CES.
        *   Note that the two above also go with the clusters of what inputs
            affect what outputs
        *   Ritual Power: If we summarize as one stat, presumably we can use
            an intermediate value of r, which here could be somewhere around 0.
*   Leadership
    *   In Communal Festivals
        *   There is initially no recognized leader
        *   There may be individuals or families who:
            *   Contribute more or less of the usual goods and performances
            *   Contribute special kinds of goods and performances
            *   Exert more influence in addressing coordination and free-
                riding problems
        *   People would be aware that they're doing those things, and
            probably have vocabulary and concepts that recognize leadership
            occurring (that seems to go back prior to *homo*) but it would
            not initially refer to a special social role or separate class
            of person
            *   How would that start happening?
                *   Continuity of the same family leading for a long time
                *   Continuity of visible symbols of leadership
                *   Continuity of patterns for who leads
        *   People providing special services would get some sort of recognition,
            possibly alignment impact
        *   Elders normally provide some of this leadership
*   Coordination Games
    *   For the ritual to work, people have to agree on various things such
        as schedules and what to bring
    *   Why might people fail to coordinate?
        *   Gain: It might be advantageous in various ways to do something
            else, e.g., gain more status by doing something different, provide
            a good that's easier to provide, etc.
        *   Ignorance: They might not know what others are doing. The more
            people there are, the more difficult it will be to communicate.
        *   Time: It might take too long to coordinate everyone.
        *   Error: Someone might accidentally do the wrong thing.
    *   There are two main factors here:
        *   Fundamental: Scale and information limits
        *   Different interests: Different benefits to different clans
    *   Scale and Information Limits
        *   Elders provide extra coordination
        *   Have effectiveness fall off a bit after population goes over
            60-150 or so
    *   Different interests
        *   For wiggle room in how things are done, each clan can choose
            "our way" or "the group way".
            *   Our way => clan benefits in QoL, food, time, etc. but less
                success for the ritual as a whole
            *   Free riding is a particular version of "our way"
        *   There can also be disagreements on binary (or small-choice)
            issues
            *   Imagine some issue, such as whether children are present at
                key rituals, that clans have different preferences on due
                to different age structures and values.
            *   Each clan has their preference, but it's also valuable to
                each clan to actually come to agreement.
            *   Clans could pursue lots of different strategies, but to
                start with we could give them a threshold or factor for
                population or prestige to sway them to the other side.
    *   Differential leaders and coordination
        *   Greater skill and effort to coordinate helps fundamental factors
            *   Also respect and alignment
        *   Leaders could punish clans for choosing "our way"
        *   Leaders could put their weight behind one choice or the other
            to help get to agreement

## TODOs

*   Bring up initial settlement-level rituals as a new Activity that has
    an Operation, but this should be separate from the Production Activity.
    *   Ritual structure is "Communal Festivals"
    *   Ritual leadership is "Clan Elders"
    *   Ritual has two aspects: Feast and Rite
        *   Feast
            *   "Notional standard" costs 5% of time, 0.05 of food
                *   Use a CES function with r around -0.5 with diminishing
                    returns to convert time + food into a base value
                *   Initially clans all do the notional standard
            *   Include random factor as usual
            *   Total value here called "Appeal"
            *   Boosts alignment, health (better birth, death rates)
                information level (broadcast-style), and a new QoL
                factor for joy at gatherings
                (boost amounts increasing with value but limits or
                diminishing returns)
            *   Add a total scale factor for this structure + leadership
                combination that is 0 at population 1, goes up from there
                to 1.0 at around 200 people, and then goes down.
        *   Rite
            *   "Notional standard" costs 5% of time, 0.05 of food
                (Quantity of food is lower but this requires the highest
                quality so we scale up to account for that)
                *   Use a CES function with r around -2 with diminishing
                    returns to convert time + food into a base value
                *   Initially clans all do the notional standard
            *   Include random factor as usual
            *   Total value here called "Power"
            *   Boosts respect, sense of security (a new QoL factor),
                (boost amounts increasing with value but limits or
                diminishing returns)
            *   Can influence behavior, e.g., farming-type rituals
                make farming more appealing
                (boost amounts increasing with value but limits or
                diminishing returns)
            *   Add a total scale factor for this structure + leadership
                combination that is 0 at population 1, goes up from there
                to 1.0 at around 100 people, and then goes down.

*   Differential effort
    *   Set this up similarly to food aid - give clans standard amounts
        they want to give (say a scaling factor to the default contribution)
        and expectations from them for what other clans will give
    *   To the extent they have information on each other, they'll adjust
        alignment toward other clans based on how they are relative to
        expectations

*   Differential craft skill
    *   Let's also combine skills in a CES-like way
    *   For this ritual structure, use geometric mean weighted by
        clan size

*   Differential ritual skill
    *   Here use CES with weight -5 weighted by clan size

*   Preference issues and ritual changes
    *   At times, there will be significant changes to rituals:
        *   A clan may voluntarily introduce a change
        *   The set of clans in a settlement may change
        *   Circumstances may prevent the ritual from being performed
            in the usual way, e.g., certain knowledge or special
            resources being lost
    *   In the initial model, ritual change events will be triggered
        like this:
        *   On any change to the set of clans participating in the
            ritual, e.g., from a clan splitting and the junior staying,
            or from a clan dying out or merging with another.
        *   A small random chance each turn for each settlement ritual,
            proportional to (settlement ritual size)^(7/6), such that for a
            settlement ritual of 300 the probability is 4% per year.
            (Settlement ritual size is the total population of clans
            participating -- not just workers.)
    *   When a ritual change event is triggered, one or more clans are
        the Initiators:
        *   For a random event, choose a clan at random, weighted by
            intellect (baseline at 50 piety; 10x at 80 piety) factor
            times population to be the initiator.
        *   For a clan change event, again choose a clan at random,
            but weight any new clans 10x.
    *   Other clans then initially sort into Supporters and Opponents
        *   To determine if clan C is a supporter:
            *   First take C's alignment toward Initiator
            *   Then take C's pop-weighted alignment toward everyone else
                in the clan
            *   Feed the difference between those two into a sigmoid function
                to get a support probability
                *   Difference 0 should give 50% probability of accepting
    *   What's at stake:
        *   Let's do a thought experiment ritual change. 
            *   Imagine that there's a ritual dance that only elders do, and 
                it's believed that only they can do it right. But then some clan
                who particularly loves to dance has a few young people start
                practicing it and learn it really well. Some say omens indicate
                the ancestors are pleased as well. But others say otherwise.
                Some like a fresh new approach. Some are envious of the
                attention the new dancers are getting. Some fear this will upend
                elder authority. And so on.
            *   Clearly the stakes will depend on the exact issue, but we
                can say something about what people care about in generalized
                terms:
                *   The ritual may be more or less effective (Gatherings and/or 
                    Serenity QoL change)
                *   Relationships in the village: alignment, respect, holiness
        *   If the change is accepted:
            *   +Ritual change QoL for Initiator+Supporters (in that turn, then
                decays 20% per turn and removed after 20 turns)
                *   1.25x QoL change for Initiator
                *   1.00x QoL change for Supporters
            *   -Ritual change QoL for Opponents (decays 10% per turn and removed
                after 40 turns)
            *   +Respect of other clans toward Initiator
            *   +Holiness of other clans toward Initiator
            *   +Alignment of Supporters toward Initiator+Supporters
            *   -Alignment of Opponents toward Initiator+Supporters
        *   If the change is rejected:
            *   -Respect of other clans toward Initiator
            *   -Holiness of other clans toward Initiator
            *   -Alignment of Initiator+Supporter toward Opponents
            *   +Alignment of Opponents toward Opponents
        *   If there is deadlock: no decision reached:
            *   -Ritual disruption QoL for everyone (decays 5% per turn and
                removed after 80 years)
            *   -Respect of Opponents toward Initiator
            *   -Holiness of Opponents toward Initiator
            *   -Alignment of Initiator+Supporters toward Opponents
            *   -Alignment of Opponents toward Initator+Supporters
        *   The alignment changes should be implemented as items in our events
            ledger, and alignment indexed off there as we already have.
        *   Ritual change QoL should be implemented as a "changelog" on the
            ritual operation (Festival?) where each change lists whether each
            clan was in Initiator, Supporter, or Opponent
    *   Now go through multiple rounds of voting (accept or reject change)
        until clans reach assent or deadlock.
        *   Give clans a new stat Rigidity, between 0 and 1.
        *   In each round, have the clans go in some order. If the % of
            clans currently voting the other way as this clan is > Rigidity,
            this clan will switch its vote.
            *   However, the clan retains its original Supporter or Opponent
                status for purposes of outcomes at the end. They didn't change
                what they wanted, they changed what they'd go along with.
            *   The Initiator can also switch their vote (and others don't
                necessarily drop the issue!) but their Rigidity is considered
                1.25x for this, and if the Initiator drops, the Supporters
                Rigidity is considered 0.75x.
        *   No assent after 3 rounds => deadlock

*   Leadership
    *   Leadership so far mostly means voluntarily contributing at
        cost to make things go
    *   Baseline assumption would be that elders are leading a traditional
        amount in traditional ways
    *   Clans can gain status by contributing more or better stuff, as in
        higher levels or with more skill
    *   But clans can also help coordinate:
        *   Do work (using time and Oratory skill (new)) to resolve the
            fundamental limit problems. Maybe this can scale things up
            to 2x given extraordinary skill and effort level, or more
            like 10-20% with typical leaders
        *   Encourage higher contributions through persuasion and example
        *   Use persuasion and gifts to resolve coordination roadblocks.
            If they sway people:
            *   If this brought the settlement from discord to assent,
                everyone is more aligned to the coordinator
            *   But people also become more or less aligned to the coordinator
                depending on how much they liked the outcome of the decision
    *   Refinement: Require a certain number of elders for ideal elder
        coordination, penalize if different

*   Identity
    *   Rituals will help to create a stronger sense of identity
    *   This doesn't matter so much yet because we don't have differences,
        but let's think about it a little bit
    *   We can think about "salient shared experiences"
        *   Living in the same area would be one, so the residence level
            counts; but this probably converts to identity to the extent
            there's a "sense of place".
            *   Local burials might be a major component here, especially
                at first. That's a subcomponent of ritual, but those would
                be clan rituals, not settlement.
            *   Later, monuments, infrastructure, and family farms will
                do this too.
        *   Settlement-level festivals and rituals are the other clear
            case of a "defined entity" that everyone "belongs to".
            *   Rite would seem to be more important than feast, but
                both matter.
    *   And "salient non-shared experiences"
        *   Different groups will come up with different ways of doing their
            rituals, especially as they elaborate them
        *   People could choose to try to increase or decrease differences
            from others for various reasons
        *   We'll want some sort of similarity score. A couple of obvious
            candidates:
            *   Fingerprint that can deviate in various bits to create
                difference
            *   Tree structure with divergence levels down each branch,
                which can increase or decrease over time
        

# Other Rituals

*   Special settlement-level rituals
    *   Funerals for important figures (once per generation?)
        *   Could be a special ritual that creates a big increase in
            clan prestige and/or creates an elevated ancestor that
            multiple clans claim descent from
    *   Local crises
        *   Special ritual, has large up/down effect on prestige
            depending on ritual quality and how the crisis went
*   Work feasts
    *   Similar inputs to ritual craft aspect, get labor in return
    *   Appeal would be important to getting people in
        *   Consider modeling beer explicitly
*   Clay figurines for healing rituals
    *   Access to clay figurines => more appealing aid rituals
        (including clan own rituals)
*   Give settlements ways of observing each others rituals and picking
    things up
    *   People might start becoming rivals to having the more
        appealing or powerful rituals

*   Refinements for later
    *   Farming behavioral pull -- this is apparently less obvious how
        to implement
    *   Requirements for specific food mixes
    *   Different clan tastes
    *   Elaborating rites, and then skill requirements and influence
        go up
    *   Prestige weighting for yielding

*   High-priority tasks
    *   Pie charts for time allocation
    *   Clean up ritual bonds using their own ledger

*   Somewhat bigger but maybe becoming more urgent
    *   Improved QoL aggregation
    *   Deal with too many tiny settlements appearing
    *   Consider making serenity somewhat more like gifts between clans:
        have clans giving offerings estimate how well the recipients are
        aligned toward them (and have that be a primary stat and also
        influence QoL) (note that it's somewhat unclear whether this is
        about recipients' alignment toward clans, or the settlement as
        a whole)
    *   Make sure we have sufficient per-settlement correlation in
        enough outcomes to create a sense of shared fate (and
        probably also identity)
    *   Figure out how to let craft and ritual abilities rise over time
        and how that relates to skill level
    *   Common out clan graph data structures

*   Other major models needed
    *   Care
        *   Also get mutual help options here
    *   Land - we'll need more notions of creating, quality, and
        continuity, and differential usufruct access to land
    *   Trade - should have some notion of where that flint comes
        from
    *   Intervillage interactions
        *   For one, what exactly do they do?
        *   But this probably has some important implications for
            leadership roles (to be speaker in that context)
        *   We should also have villages have some sort of prestige-
            like rating that they can potentially compete for