export interface MigrateFacts {
    fromBranch: string;
    toBranch: string;
    removeFromSource: boolean;
    collectionId: string;
    removeFromDestination: boolean;
    factIds: string[];
}
