import { BaseEntity } from './base-entity';

export interface CollectionEntity extends BaseEntity {
    script: string;
    userGroupIds: string[];
    privileges: any[];
    factTitle: string;
    tags: string[];
}
