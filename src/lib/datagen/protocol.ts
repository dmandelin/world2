// Messages exchanged with the data-generation worker.

import type { GenerationParams, SerializedSession } from "../../model/data/sessions";

export type GenerateRequest = {
    name: string;
    params: GenerationParams;
};

export type GenerateProgress = {
    type: 'progress';
    yearsDone: number;
    yearsTotal: number;
};

export type GenerateDone = {
    type: 'done';
    session: SerializedSession;
    elapsedMs: number;
};

export type GenerateError = {
    type: 'error';
    message: string;
};

export type GenerateResponse = GenerateProgress | GenerateDone | GenerateError;
