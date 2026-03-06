import axios, { AxiosRequestConfig } from 'axios';

export class ClavizApiError extends Error {
    readonly data?: unknown;

    constructor(message: string, data?: unknown) {
        super(message);
        this.name = 'ClavizApiError';
        this.data = data;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export function toClavizApiError(error: unknown): ClavizApiError {
    if (error instanceof ClavizApiError) {
        return error;
    }

    if (axios.isAxiosError(error)) {
        const requestDescription = getRequestDescription(error.config);

        if (error.response) {
            return new ClavizApiError(`${requestDescription} failed with ${error.response.status}`, error.response.data);
        }

        const message = error.message || 'Request failed';

        if (requestDescription === 'Request') {
            return new ClavizApiError(message);
        }

        return new ClavizApiError(`${requestDescription} failed: ${message}`);
    }

    if (error instanceof Error && error.message) {
        return new ClavizApiError(error.message);
    }

    return new ClavizApiError('Request failed');
}

function getRequestDescription(config?: AxiosRequestConfig): string {
    const method = config?.method?.toUpperCase();
    const url = config?.url;

    if (method && url) {
        return `${method} ${url}`;
    }

    return url ?? method ?? 'Request';
}
