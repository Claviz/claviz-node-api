export interface Branch {
    collaborators: string[];
    createdDate: string;
    id: string;
    isMaster: boolean;
    label: string;
    modifiedDate: string | null;
    ownerId: string;
    private: boolean;
    version: string;
}
