export interface FactData<T> {
    collectionId: string;
    fields: T;
    ownerId: string;
    lastModifiedDate: string;
    createdDate: string;
    id: string;
    /** Whether the caller may edit this fact (Claviz 2026-11 and later). */
    canUpdate?: boolean;
    /** Whether the caller may delete this fact (Claviz 2026-11 and later). */
    canDelete?: boolean;
}