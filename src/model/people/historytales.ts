// How a clan tells the things in its history.
//
// The voice depends on how far back the story lies:
//
//     recent   plain fact, as the clan understands the facts
//     living   grandparents' tales: a little embellished, more dramatic
//     family   handed down: exaggerated, with touches that couldn't quite be
//     ancient  myth, but a simple, homespun kind
//
// There is no pantheon yet, so nobody says "the gods". The powers in these
// stories are the ones the clans live beside: the River, the Waters.
//
// Which of several tellings a clan uses is picked by the item's id, so a story
// reads the same from one year to the next and a split clan's two halves keep
// telling it the way they did together.

import { EuNode } from "../self/eudaimonia";
import type {
    AnyHistoryItem,
    FloodMemory,
    FortuneMemory,
    HistoryTimeframe,
    OriginMemory,
} from "./history";

function pick<T>(item: { id: number }, options: readonly T[]): T {
    return options[item.id % options.length];
}

const COUNT_WORDS = [
    "no", "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "ten", "eleven", "twelve",
];

function count(n: number): string {
    return n < COUNT_WORDS.length ? COUNT_WORDS[n] : String(n);
}

function cap(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// A short name for the item, as the clan would put it.
export function historyItemTitle(item: AnyHistoryItem): string {
    switch (item.kind) {
        case "origin":
            if (!item.split) return "Origin";
            return item.split.role === "senior"
                ? "Origin: the senior house"
                : "Origin: the cadet house";
        case "flood":
            switch (item.size) {
                case "river": return "The River's flood";
                case "great": return "The great water";
                case "world": return "The Waters over the world";
            }
        case "fortune":
            return `${item.polarity === "best" ? "Best" : "Worst"} year ${TITLE_PERIOD[item.headline]}`;
    }
}

export function tellHistoryItem(
    item: AnyHistoryItem,
    timeframe: HistoryTimeframe,
    clanName: string,
): string {
    switch (item.kind) {
        case "origin": return tellOrigin(item, timeframe, clanName);
        case "flood": return tellFlood(item, timeframe);
        case "fortune": return tellFortune(item, timeframe);
    }
}

// --- Origins ----------------------------------------------------------------

function tellOrigin(m: OriginMemory, tf: HistoryTimeframe, clanName: string): string {
    const M = m.maternalAncestor;
    const P = m.paternalAncestor;

    if (!m.split) {
        switch (tf) {
            case "recent":
                return `${M} and ${P} made the first hearth of our line, and all the ${clanName} are their children.`;
            case "living":
                return `The old ones still remember ${M} and ${P}, who came to the River with one boat, one fire-pot, and a basket of seed grain, and made the first hearth of the ${clanName}. Every one of us is their child or grandchild.`;
            case "family":
                return `${M} and ${P} were the first of the ${clanName}. They say ${M} could sing fish into the net, and ${P} could hear the barley growing.`;
            case "ancient":
                return pick(m, [
                    `In the beginning, ${M} and ${P} came down the River in a reed boat. Where they stepped ashore they planted the first barley, and all the ${clanName} are their children.`,
                    `Long ago, ${M} came out of the marshes as the first mother, and ${P} came out of the reeds as the first father. They sat down together at one hearth, and from that hearth come all the ${clanName}.`,
                ]);
        }
    }

    const O = m.split.otherName;
    if (m.split.role === "senior") {
        switch (tf) {
            case "recent":
                return `We grew too many for one hearth, and the ${O} went out from us to make their own. ${M} and ${P} are the mother and father of our line, and we are the senior house.`;
            case "living":
                return `When the old ones were young, ${M} and ${P} kept the old hearth, and the ${O} went out from under their roof with our blessing and our second-best goat. We are the elder house, and the ${O} have never quite forgotten it.`;
            case "family":
                return `${M} and ${P} had so many children that no roof could hold them, so they sent the ${O} out to fill the land. That is why we are the elder house, and why the ${O} ought to bring us the first fish of every year.`;
            case "ancient":
                return `In the beginning there was one hearth, and ${M} and ${P} tended it. Sparks flew up from it and became the ${O}, but the fire itself stayed with us.`;
        }
    }
    switch (tf) {
        case "recent":
            return `The house of the ${O} grew too many for one hearth, so ${M} and ${P} took their share of the seed grain and made a hearth of their own. They are the mother and father of our line, and the ${O} are our senior house.`;
        case "living":
            return `Grandmother remembers when ${M} and ${P} led our people out of the crowded houses of the ${O} with nothing but seed grain and a pot of embers, and made a home of our own. The ${O} are still our elder house.`;
        case "family":
            return `${M} and ${P} walked out of the house of the ${O} carrying fire in their bare hands, and wherever they set it down, our hearth has burned ever since. The ${O} are our elder house.`;
        case "ancient":
            return `In the beginning ${M} and ${P} were two sparks from the hearth of the ${O}. The wind carried them off, and where they fell to earth, our people began.`;
    }
}

// --- Floods -----------------------------------------------------------------

type Loss = "none" | "some" | "much" | "most";

// Grain lost, against what the clan needed to eat that year.
function lossOf(m: FloodMemory): Loss {
    const s = m.foodShareLost;
    if (s < 0.02) return "none";
    if (s < 0.15) return "some";
    if (s < 0.4) return "much";
    return "most";
}

function tellFlood(m: FloodMemory, tf: HistoryTimeframe): string {
    const size = m.size;
    const loss = lossOf(m);
    // The twenty-year flood never drowns anyone, so there is nothing to say
    // about the people it spared.
    const couldDrown = size !== "river";

    switch (tf) {
        case "recent": {
            const it = size === "river" ? "It" : "They";
            const parts = [
                size === "river"
                    ? pick(m, [
                        "The River came over its banks and into the fields.",
                        "The River rose out of its bed and spread across the fields.",
                    ])
                    : size === "great"
                        ? "The Waters rose higher than anyone had seen and lay over the land for many days."
                        : "The Waters rose over the whole land, from the marshes to the high ground, and did not go down for a month.",
                {
                    none: "The grain was spared.",
                    some: `${it} took some of the grain standing in the fields.`,
                    much: `${it} took much of the harvest, a hard part of the year's food.`,
                    most: `${it} took nearly all the harvest, and most of the year's food with it.`,
                }[loss],
            ];
            if (m.deaths === 1) parts.push("One of our people drowned.");
            else if (m.deaths > 1) parts.push(`${cap(count(m.deaths))} of our people drowned.`);
            else if (couldDrown) parts.push("No one was lost.");
            if (m.ditchHelped) parts.push("The ditches carried some of the water away.");
            return parts.join(" ");
        }

        case "living": {
            const told = Math.ceil(m.deaths * 1.5);
            let s = size === "river"
                ? "Grandmother still tells of the year the River broke loose and came roaring through the fields"
                : size === "great"
                    ? "The old ones still speak of the great water, when the River stood up like a wall and the land turned into a sea"
                    : "The old ones speak of the year the Waters swallowed the world, when there was water from one edge of the sky to the other";
            s += {
                none: ", yet it passed over the barley and left every stalk standing.",
                some: ", and it carried off a good part of the harvest.",
                much: ", and it ate half the harvest out of the fields in a single night.",
                most: ", and when it went down there was not one ear of grain left standing.",
            }[loss];
            if (told === 1) s += " It dragged one of ours down into the dark water.";
            else if (told > 1) s += ` It took ${count(told)} of ours, and they were never found.`;
            else if (couldDrown) s += " By the River's mercy, not one of us was lost.";
            if (m.ditchHelped) s += " Our people stood in the ditches all night, fighting the water back.";
            return s;
        }

        case "family": {
            const told = m.deaths * 3;
            let s = size === "river"
                ? "In our great-grandparents' days the River grew angry and climbed out of its bed, and fish swam in and out of the houses"
                : size === "great"
                    ? "In our great-grandparents' days the Waters rose so high that herons nested on the rooftops and people lived in their boats for a whole season"
                    : "In our great-grandparents' days the Waters rose until even the birds had nowhere to land, and people slept on reed rafts tied to the tops of the palms";
            s += {
                none: ", but the barley held its head above the water the whole time, which was a wonder.",
                some: ", and the River drank the barley like beer.",
                much: ", and the River ate the whole harvest in one night and was still hungry.",
                most: ", and for a year afterward the fields grew nothing but mud and fish.",
            }[loss];
            if (told > 0) s += ` It carried off ${count(told)} of ours, and on still nights you can hear them singing under the water.`;
            else if (couldDrown) s += " But the River knew our people, and set every one of them down again on dry land.";
            if (m.ditchHelped) s += " Our ancestors dug a ditch in one night so deep that it swallowed half the flood.";
            return s;
        }

        case "ancient": {
            // The River is a person in myth; the Waters are many.
            const [S, o] = size === "river" ? ["She", "her"] : ["They", "them"];
            let s = size === "river"
                ? "Once, the River wanted to see what lay beyond her banks, and she walked out across the fields."
                : size === "great"
                    ? "Once, the Waters and the Land quarreled, and the Waters lay down on top of the Land to show which was stronger."
                    : "Once, the Waters rose and covered everything, and there was no land anywhere, only water and sky.";
            s += loss === "none"
                ? ` But ${S.toLowerCase()} stepped carefully around the barley, and that is why barley grows best beside the water.`
                : ` ${S} ate the grain as ${S === "She" ? "she" : "they"} went, and that is why a share of every harvest still goes back to the water.`;
            if (m.deaths > 0) s += ` ${S} took some of our people home with ${o}, and they are ${o === "her" ? "her" : "their"} fish now.`;
            else if (couldDrown) s += " Our people climbed onto a reed mat and floated until the land came back.";
            if (m.ditchHelped) s += ` The first ditch was dug that year, to lead ${o} home again.`;
            return s;
        }
    }
}

// --- Fortune ----------------------------------------------------------------

const TITLE_PERIOD: Record<HistoryTimeframe, string> = {
    recent: "in twenty",
    living: "in living memory",
    family: "in the family stories",
    ancient: "ever told",
};

const SUPERLATIVE: Record<HistoryTimeframe, string> = {
    recent: "in twenty years",
    living: "that anyone living can remember",
    family: "in all the family stories",
    ancient: "there has ever been",
};

// What going short looked like, to follow "we".
function shortfall(ratio: number): string {
    if (ratio >= 0.85) return "went a little short";
    if (ratio >= 0.7) return "ate three meals in four";
    if (ratio >= 0.55) return "ate two meals in three";
    if (ratio >= 0.4) return "had half of what we needed";
    return "had barely a third of what we needed";
}

function tellFortune(m: FortuneMemory, tf: HistoryTimeframe): string {
    const r = m.snapshot.explainFortune();
    const ratio = r.get(EuNode.FoodRatio);
    const fish = r.get(EuNode.FishShare);
    const diet = fish >= 0.65 ? "fish" : fish <= 0.35 ? "cereal" : "mixed";
    const fed = ratio >= 0.95;
    const sup = SUPERLATIVE[m.headline];

    if (m.polarity === "best") {
        switch (tf) {
            case "recent":
                return fed
                    ? `It was the best year ${sup}: ${{
                        fish: "the nets came up full every day, and there was honey besides",
                        cereal: "the barley stood thick, and there was beer for everyone",
                        mixed: "the nets were full, the storehouse was full, and there was beer and honey besides",
                    }[diet]}.`
                    : `It was the easiest year ${sup}, though even then we ${shortfall(ratio)}.`;
            case "living":
                return fed
                    ? `The old ones still talk about the fattest year ${sup}, ${{
                        fish: "when the fish jumped into the boats and the children got sick of honey",
                        cereal: "when there was so much beer that even the dogs were singing",
                        mixed: "when the nets and the storehouse were both too full to close",
                    }[diet]}.`
                    : `The old ones remember the kindest year ${sup}, when for once there was almost enough to go around.`;
            case "family":
                return fed
                    ? {
                        fish: "In our great-grandparents' days there was a year when the River gave so many fish that people walked across the water on their backs, and the bees made honey in every empty pot.",
                        cereal: "In our great-grandparents' days there was a year when every ear of barley grew as long as an arm, and beer ran in the ditches like water.",
                        mixed: "In our great-grandparents' days there was a year when the fish and the barley argued over who could feed our people best, and both of them won.",
                    }[diet]
                    : "In our great-grandparents' days there came one kind year among the hard ones, when the storehouse stayed full no matter how much was taken out of it.";
            case "ancient":
                return fed
                    ? "Once, in the first days, the River loved our people so well that she fed them from her own hand, and every night was a feast."
                    : "Once, in the hard first days, the River took pity on our people and gave them almost enough for a whole year. That is why we still thank her at the harvest.";
        }
    }

    switch (tf) {
        case "recent":
            return fed
                ? `It was the leanest year ${sup}, though no one went to bed hungry.`
                : `It was the hungriest year ${sup}: we ${shortfall(ratio)}.`;
        case "living":
            return fed
                ? `The old ones still grumble about the thinnest year ${sup}, when there was no beer and nothing to eat but plain porridge.`
                : `Grandmother still hides bread in her sleeve because of the hungriest year ${sup}, when the children cried all night and the grown people ate reeds.`;
        case "family":
            return fed
                ? "In our great-grandparents' days there was a year when the beer turned to water in the jars and the honey to sand, though there was always bread."
                : "In our great-grandparents' days there was a year so hungry that people boiled their sandals for soup, and even the fish swam away downriver to stay out of the pot.";
        case "ancient":
            return fed
                ? "Once, the River grew sulky and gave our people nothing but plain porridge for a whole year, to teach them not to be proud."
                : "Once, in the first days, Hunger came and sat at every hearth for a whole year and ate from every bowl. Since then our people have always kept a store of grain against its coming back.";
    }
}
