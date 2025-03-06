import type { Clan } from "./people";

export class Settlement {
    constructor(
        readonly name: string, 
        readonly x: number,
        readonly y: number,
        readonly clans: Clan[]) {}
}