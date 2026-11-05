export interface UserInfo {
    email: string;
    id: string;
    /** Whether the person is a Claviz administrator now: false for one who turned Administrator access off. */
    isAdmin: boolean;
    firstName: string;
    lastName: string;
    /** A Claviz administrator who turned Administrator access off: Claviz then treats them as a member everywhere. */
    administratorAccessOff?: boolean;
}