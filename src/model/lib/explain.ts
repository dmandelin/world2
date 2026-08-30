// Explanations, produced only if somebody asks.
//
// Nearly every scored item in the model carries a line of prose saying where
// its number came from -- "Generosity estimate 4.2", "63% of effort on the
// ditches vs 55% expected". Those lines are for the breakdown tables, and
// almost none of them are ever read: the items are rebuilt for every directed
// pair of clans twice a turn, and a headless run has no tables at all.
//
// So an explanation is given either as a string, when it is a constant, or as
// a *function of something* -- and deliberately not as a closure. A closure
// would capture the numbers it needs, which costs a function object and a
// scope context for every item built, which is most of what deferring the
// text was meant to save. A plain function taking its inputs as an argument
// is created once, when its module loads, and passed by reference forever
// after.
//
// The argument is whatever the text needs. Where that is only the item's own
// fields, the item passes itself and nothing is allocated at all. Where the
// text needs figures the item does not keep, the caller hands over a small
// record of them -- one object, against a closure's two.
//
// Either way the numbers are settled when the item is built, so the text
// cannot drift away from the value printed beside it when a snapshot is read
// long after the world has moved on.
export type Explainer<T> = string | ((subject: T) => string);

export function explain<T>(e: Explainer<T>, subject: T): string {
    return typeof e === 'string' ? e : e(subject);
}
