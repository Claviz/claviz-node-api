export interface SavedFact<T> {
    fact: {
        collectionId: string;
        fields: T;
        ownerId: string;
        lastModifiedDate: string;
        createdDate: string;
        id: string;
    };
}


