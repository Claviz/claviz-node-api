import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { BackgroundFunction } from './interfaces/background-function';
import { CollectionEntity } from './interfaces/collection-entity';
import { ComponentEntity } from './interfaces/component-entity';
import { FactData } from './interfaces/fact-data';
import { FactHistory } from './interfaces/fact-history';
import { FactValidationRequest } from './interfaces/fact-validation-request';
import { FactValidationResult } from './interfaces/fact-validation-result';
import { FunctionEntity } from './interfaces/function-entity';
import { SavedFact } from './interfaces/saved-fact';
import { UserInfo } from './interfaces/user-info';
import { Branch } from './interfaces/branch';
import { MigrateFacts } from './interfaces/migrate-facts';
import { FunctionInstance } from './interfaces/function-instance';
import { UserGroup } from './interfaces/user-group';
import { ClavizApiError, toClavizApiError } from './claviz-api-error';

/**
 * Returns a token for the user.
 * @param url The url of the server.
 * @param username The username of the user.
 * @param password The password of the user.
 * @returns A token string.
 */
export async function getClavizToken(url: string, username: string, password: string): Promise<string> {
    try {
        const response = await axios.get(`${url}/api/version`);
        const { clavizIdAppName, clavizIdAuthority } = response.data;
        if (clavizIdAuthority.includes('/realms/')) {
            const params = new URLSearchParams();
            params.append('client_id', clavizIdAppName);
            params.append('grant_type', 'password');
            params.append('username', username);
            params.append('password', password);
            const tokenResponse = await axios.post(`${clavizIdAuthority}protocol/openid-connect/token`, params.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            return `Bearer ${tokenResponse.data.access_token}`;
        }
        const tokenResponse = await axios.post(`${clavizIdAuthority}/api/token`, {
            client_id: `${clavizIdAppName}.resource`,
            grant_type: 'password',
            username,
            password,
        });

        return `Bearer ${tokenResponse.data.access_token}`;
    } catch (error) {
        throw toClavizApiError(error);
    }
}

export interface ClavizClientAuthOptions {
    /** Returns a new token, with or without the `Bearer ` prefix. */
    getFreshToken: () => Promise<string>;
}

// The Authorization header for a token given with its scheme (`Bearer eyJ…`, as `$meta.authToken` and getClavizToken
// return it) or without one (`eyJ…`). An empty token stays empty.
function authorizationHeader(token: string): string {
    const value = (token ?? '').trim();
    return !value || /^[A-Za-z]+ /.test(value) ? value : `Bearer ${value}`;
}

interface AuthenticatedRequestConfig extends AxiosRequestConfig {
    clavizAuthRetried?: boolean;
}

export class ClavizClient {

    private axiosInstance: AxiosInstance;
    private token: string;
    private refreshPromise?: Promise<string>;

    /**
     * @param url The url of the Claviz instance, for example `$meta.url`.
     * @param token The caller's token, with or without the `Bearer ` prefix: `$meta.authToken`, getClavizToken's result
     * or a token copied elsewhere all work.
     * @param authOptions Optional: how to get a new token when a request is refused with 401.
     */
    constructor(url: string, token: string, private authOptions?: ClavizClientAuthOptions) {
        token = authorizationHeader(token);
        this.token = token;
        this.axiosInstance = axios.create({
            baseURL: url,
            headers: {
                'Authorization': token,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });
        if (authOptions) {
            this.axiosInstance.interceptors.response.use(
                response => response,
                async error => {
                    const config = error?.config as AuthenticatedRequestConfig | undefined;
                    if (error?.response?.status !== 401 || !config || config.clavizAuthRetried) {
                        return Promise.reject(error);
                    }
                    config.clavizAuthRetried = true;
                    if (config.headers?.Authorization === this.token) {
                        await this.refreshToken();
                    }
                    config.headers = { ...config.headers, Authorization: this.token };
                    return this.axiosInstance.request(config);
                },
            );
        }
        this.axiosInstance.interceptors.response.use(
            response => response,
            error => Promise.reject(toClavizApiError(error)),
        );
    }

    private async refreshToken(): Promise<string> {
        if (!this.refreshPromise) {
            const refresh = Promise.resolve()
                .then(() => this.authOptions!.getFreshToken())
                .then(fresh => {
                    const token = authorizationHeader(fresh);
                    this.token = token;
                    Object.assign(this.axiosInstance.defaults.headers, { Authorization: token });
                    return token;
                });
            this.refreshPromise = refresh.then(token => {
                    this.refreshPromise = undefined;
                    return token;
                }, error => {
                    this.refreshPromise = undefined;
                    throw error;
                });
        }
        return this.refreshPromise!;
    }

    /**
     * Executes provided expression for collection with the caller's fact rights: `{{collections.x}}` holds only the facts they may view.
     * Claviz runs queries only for administrators and for app code (scripts Claviz runs, with their `$meta.authToken`).
     * @param expression The expression to execute.
     * @param userAgnostic If true, the expression skips the caller's fact rights and sees every fact. Never set it in code that runs for users.
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
     * Removes facts by IDs, if the caller's rights in their collections allow it.
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
     * Returns a fact the caller may view; canUpdate and canDelete say whether they may also edit or delete it.
     */
    async getFactData<T>(factId: string): Promise<FactData<T>> {
        const response = await this.axiosInstance.get(`/api/facts/fact-data?factId=${factId}`);

        return response.data;
    }

    /**
     * Returns the history of a fact the caller may view.
     */
    async getFactHistory<T>(factId: string, pageIndex = 0, pageSize = 10): Promise<FactHistory<T>> {
        const response = await this.axiosInstance.get(`/api/facts/fact-history?factId=${factId}&pageIndex=${pageIndex}&pageSize=${pageSize}`);

        return response.data;
    }

    /**
     * Returns all branches in the system. Administrators only.
     */
    async getBranches(): Promise<Branch[]> {
        const response = await this.axiosInstance.get(`/api/branchesManager`);

        return response.data;
    };

    /**
     * Returns current user branch.
     */
    async getCurrentUserBranch(): Promise<Branch> {
        const response = await this.axiosInstance.get(`/api/branchesManager/working`);

        return response.data;
    };

    /**
     * Migrates facts from one branch to another. Administrators only.
     * @param options The options for migration.
     */
    async migrateFacts(options: MigrateFacts): Promise<any> {
        const response = await this.axiosInstance.post(`/api/branchesManager/migrate-facts`, options, {
        });

        return response.data;
    }

    /**
     * Returns all function entities. Administrators only.
     */
    async getFunctionEntities(): Promise<FunctionEntity[]> {
        const response = await this.axiosInstance.get(`/api/functionsManager/full`);

        return response.data;
    }

    /**
     * Returns all component entities. Administrators only.
     */
    async getComponentEntities(): Promise<ComponentEntity[]> {
        const response = await this.axiosInstance.get(`/api/components/full`);

        return response.data;
    }

    /**
     * Returns all collection entities. Administrators only.
     * @param branchId The branch ID to get collections from.
     */
    async getCollectionEntities(branchId = null): Promise<CollectionEntity[]> {
        const response = await this.axiosInstance.get(branchId ? `/api/collections/full?branchId=${branchId}` : `/api/collections/full`);

        return response.data;
    }

    /**
     * Returns all started background functions. Administrators only.
     */
    async getStartedBackgroundFunctions(): Promise<BackgroundFunction[]> {
        const response = await this.axiosInstance.get(`/api/functionsManager/background`);

        return response.data;
    }

    /**
     * Returns everyone with access to Claviz (the User or Admin role), disabled accounts included. Any signed-in person may call it.
     */
    async getUserList(): Promise<UserInfo[]> {
        const response = await this.axiosInstance.get(`/api/system/user-list`);

        return response.data;
    }

    /**
     * Returns every user group with its members (`roles`: userId and role). Any signed-in person may call it.
     */
    async getUserGroupList(): Promise<UserGroup[]> {
        const response = await this.axiosInstance.get(`/api/userGroups`);

        return response.data;
    }

    /**
     * Imports facts in batch: new facts need the caller's add right, existing ones (with id) their edit right.
     */
    async importFacts<T>(collectionId: string, facts: T[]): Promise<void> {
        const response = await this.axiosInstance.post(`/api/facts/import?collectionId=${collectionId}&verbose=true`, facts);

        return response.data;
    }

    /**
     * Saves a new fact (no factId) or updates one, within the caller's rights. The collection's validation runs first.
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
     * Starts background function. Administrators only.
     */
    async startBackgroundFunction(functionId: string): Promise<void> {
        await this.axiosInstance.put(`/api/functionsManager/background/${functionId}/start`);
    }

    /**
     * Stops background function. Administrators only.
     */
    async stopBackgroundFunction(functionId: string): Promise<void> {
        await this.axiosInstance.put(`/api/functionsManager/background/${functionId}/stop`);
    }

    /**
     * Returns info about all started function instances. Administrators only.
     */
    async getStartedFunctionInstances(): Promise<FunctionInstance[]> {
        const response = await this.axiosInstance.get(`/api/functions/functionInstances`);

        return response.data;
    }

    /**
     * Stops function (if it is processing) and deletes it. People who aren't administrators can stop only their own runs.
     */
    async destroyFunctionInstance(functionId: string): Promise<void> {
        await this.axiosInstance.delete(`/api/functions/functionInstances/${functionId}`);
    }

    /**
     * Returns started function info by instance id. People who aren't administrators see only their own runs.
     */
    async getFunctionInstanceStatus(functionInstanceId: string): Promise<FunctionInstance> {
        const response = await this.axiosInstance.get(`/api/functions/functionInstances/${functionInstanceId}`);

        return response.data;
    }

    /**
     * Executes a cancellable Claviz Function in separate thread. The function's API access decides who may call it.
     * @param functionId Function ID.
     * @param parameters Object representing function parameters.
     * @param signal A signal object that can be used to cancel the execution.
     * @param engineName Name of the engine to use for function execution.
     * @returns A promise that resolves to the result of the function.
     */
    async executeFunction<T>(functionId: string, parameters: any, signal?: AbortSignal, engineName?: string): Promise<T> {
        if (engineName) {
            parameters = {
                engineName,
                functionId,
                parameters,
            };
            functionId = `remoteRunner`;
        }
        const response = await this.axiosInstance.post(`/api/functions/${functionId}`, parameters, {
            signal,
        });
        if (response.status === 202) {
            const functionInstanceId = response.data.functionInstanceId;
            let statusReadFailures = 0;

            while (!signal?.aborted) {
                let functionInstanceStatus: FunctionInstance;
                try {
                    functionInstanceStatus = await this.getFunctionInstanceStatus(functionInstanceId);
                    statusReadFailures = 0;
                } catch (err) {
                    statusReadFailures += 1;

                    if (statusReadFailures >= 3) {
                        throw err;
                    }

                    await this.sleep(1000 * 10);
                    continue;
                }

                if (functionInstanceStatus.status === 'success' || functionInstanceStatus.status === 'error') {
                    await this.destroyFunctionInstance(functionInstanceId);
                }
                if (functionInstanceStatus.status === 'success') {
                    return functionInstanceStatus.result;
                } else if (functionInstanceStatus.status === 'error') {
                    throw new ClavizApiError(functionInstanceStatus.error || 'Function execution failed', functionInstanceStatus);
                }

                await this.sleep(1000 * 10);
            }

            await this.destroyFunctionInstance(functionInstanceId);
            throw new ClavizApiError('Request canceled');
        }

        return response.data;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Runs the collection's validation for facts without saving them. Needs the caller's view right on the collection.
     */
    async validateFact<T>(collectionId: string, facts: FactValidationRequest<T>[], signal?: AbortSignal): Promise<FactValidationResult<T>> {
        const response = await this.axiosInstance.post(`/api/factValidation`, {
            collectionId,
            facts,
        }, {
            signal,
        });

        return response.data;
    }
}
