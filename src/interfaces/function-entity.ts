export interface FunctionEntity {
    description: string;
    parameters: {
        key: string;
        description: string;
    }[];
    runInBackground: boolean;
    script: string;
    id: string;
    label: string;
    folderId: string;
    initialHash: string;
    currentHash: string;
    modifiedDate: string;
    createdDate: string;
    isDefault: boolean;
}
