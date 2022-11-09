import { BaseEntity } from './base-entity';

export interface ComponentEntity extends BaseEntity {
    script: string;
    parameters: ComponentParameter[];
    parametersComponentId: string;
}

export interface ComponentParameter {
    key: string;
    description: string;
}
