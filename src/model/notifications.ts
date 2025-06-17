export interface NoteTaker {
    addNote(note: Note): void;
}

export class Note {
    constructor(
        public readonly shortLabel: string,
        public readonly message: string,
    ) {
    }
}