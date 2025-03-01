import { Clan } from "./people";

export class World {
    readonly clans = [
        new Clan('Abgal'),
        new Clan('Ninshubur'),
        new Clan('Didanu'),
    ];
}

export const world = new World();