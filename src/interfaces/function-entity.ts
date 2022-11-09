import { BaseEntity } from './base-entity';

export interface FunctionEntity extends BaseEntity {
    description: string;
    parameters: {
        key: string;
        description: string;
    }[];
    runInBackground: boolean;
    script: string;
}
