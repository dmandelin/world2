export interface NoteTaker {
    addNote(shortLabel: string, message: string): void;
}

export class Note {
    constructor(
        public readonly year: string,
        public readonly shortLabel: string,
        public readonly message: string,
    ) {
    }
}