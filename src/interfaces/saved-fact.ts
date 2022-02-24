export interface SavedFact<T> {
    fact: {
        collectionId: string;
        fields: T;
        statusId: string;
        ownerId: string;
        lastModifiedDate: string;
        createdDate: string;
        id: string;
    };
}


