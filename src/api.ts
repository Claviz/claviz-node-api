import axios, { AxiosInstance } from 'axios';
import { BackgroundFunction } from './interfaces/background-function';
import { FactData } from './interfaces/fact-data';
import { FunctionEntity } from './interfaces/function-entity';
import { SavedFact } from './interfaces/saved-fact';
import { UserInfo } from './interfaces/user-info';

/**
 * Returns a token for the user.
 * @param url The url of the server.
 * @param username The username of the user.
 * @param password The password of the user.
 * @returns A token string.
 */
export async function getClavizToken(url: string, username: string, password: string): Promise<string> {
    const response = await axios.get(`${url}/api/version`);
    const { clavizIdAppName, clavizIdAuthority } = response.data;
    const tokenResponse = await axios.post(`${clavizIdAuthority}/api/token`, {
        client_id: `${clavizIdAppName}.resource`,
        grant_type: 'password',
        username,
        password,
    });

    return `Bearer ${tokenResponse.data.access_token}`;
}

export class ClavizClient {

    private axiosInstance: AxiosInstance;

    constructor(url: string, token: string) {
        this.axiosInstance = axios.create({
            baseURL: url,
            headers: {
                'Authorization': token,
            },
        });
    }

    /**
     * Executes provided expression for collection.
     * @param expression The expression to execute.
     * @param userAgnostic If true, the expression will be executed as if it was run by the admin.
     * @returns 
     */
    async query<T>(expression: string, userAgnostic: boolean = false): Promise<T[]> {
        const response = await this.axiosInstance.post(`/api/factValidation/query`, {
            userAgnostic,
            expression,
        });

        return response.data;
    }

    /**
     * Removes facts by IDs.
     * @param factIds array of fact IDs.
     */
    async deleteFacts(factIds: string[]): Promise<void> {
        await this.axiosInstance.post(`/api/facts/delete-multiple`, {
            factIds,
        });
    }

    /**
     * Returns info about the current user.
     */
    async getCurrentUser(): Promise<UserInfo> {
        const response = await this.axiosInstance.get(`/api/system/current-user`);

        return response.data;
    }

    /**
     * Returns data about the fact.
     */
    async getFactData<T>(factId: string): Promise<FactData<T>> {
        const response = await this.axiosInstance.get(`/api/facts/fact-data?factId=${factId}`);

        return response.data;
    }

    /**
     * Returns all function entities.
     */
    async getFunctionEntities(): Promise<FunctionEntity[]> {
        const response = await this.axiosInstance.get(`/api/functionsManager/full`);

        return response.data;
    }

    /**
     * Returns all started background functions.
     */
    async getStartedBackgroundFunctions(): Promise<BackgroundFunction[]> {
        const response = await this.axiosInstance.get(`/api/functionsManager/background`);

        return response.data;
    }

    /**
     * Returns list of all users in system.
     */
    async getUserList(): Promise<UserInfo[]> {
        const response = await this.axiosInstance.get(`/api/system/user-list`);

        return response.data;
    }

    /**
     * Imports facts in batch.
     */
    async importFacts<T>(collectionId: string, facts: T[]): Promise<void> {
        const response = await this.axiosInstance.post(`/api/facts/import?collectionId=${collectionId}&verbose=true`, facts);

        return response.data;
    }

    /**
     * Saves/updates a fact.
     */
    async saveFact<T>(factId: string, collectionId: string, fields: T): Promise<SavedFact<T>> {
        const id = factId;
        const response = await this.axiosInstance({
            method: id ? 'PUT' : 'POST',
            url: `/api/facts`,
            data: {
                id,
                collectionId,
                fields,
            },
        });

        return response.data;
    }

    /**
     * Starts background function.
     */
    async startBackgroundFunction(functionId: string): Promise<void> {
        await this.axiosInstance.put(`/api/functionsManager/background/${functionId}/start`);
    }

    /**
     * Stops background function.
     */
    async stopBackgroundFunction(functionId: string): Promise<void> {
        await this.axiosInstance.put(`/api/functionsManager/background/${functionId}/stop`);
    }

    /**
     * Executes a cancellable Claviz Function in separate thread.
     * @param functionId Function ID.
     * @param parameters Object representing function parameters.
     * @param signal A signal object that can be used to cancel the execution.
     * @returns A promise that resolves to the result of the function.
     */
    async executeFunction<T>(functionId: string, parameters: any, signal?: AbortSignal): Promise<T> {
        const response = await this.axiosInstance.post(`/api/functions/${functionId}`, parameters, {
            signal
        });

        return response.data;
    }
}