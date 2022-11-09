export interface BaseEntity {
    id: string;
    label: string;
    isDefault: boolean;
    folderId: string;
    modifiedDate: Date;
    createdDate: Date;
    meta: string;
    initialHash: string;
    currentHash: string;
}
