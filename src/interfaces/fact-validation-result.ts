import { FactValidationRequest } from "./fact-validation-request";

export interface FactValidationResult<T> {
    invalid: boolean;
    errors: {
        fact: FactValidationRequest<T>;
        fieldErrors: {
            [key in keyof T]?: string;
        };
    }[];
}