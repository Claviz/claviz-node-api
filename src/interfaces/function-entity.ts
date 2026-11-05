import { BaseEntity } from './base-entity';

export interface FunctionEntity extends BaseEntity {
    aiEnabled?: boolean;
    aiReadOnly?: boolean;
    description: string;
    parameters: {
        key: string;
        description: string;
        type?: 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array';
        required?: boolean;
    }[];
    runInBackground: boolean;
    script: string;
}
