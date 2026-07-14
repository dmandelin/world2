export interface NoteEntity {
    readonly uuid: string;
    readonly name: string;
}

export interface NoteTaker {
    addNote(shortLabel: string, message: string, tooltip?: string, entities?: NoteEntity[]): void;
}

export class Note {
    constructor(
        public readonly year: string,
        public readonly shortLabel: string,
        public readonly message: string,
        public readonly tooltip?: string,
        public readonly entities: NoteEntity[] = [],
    ) {
    }
}