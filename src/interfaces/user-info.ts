export interface UserInfo {
    email: string;
    id: string;
    /**
     * Whether the person is a Claviz administrator. getCurrentUser says false for an administrator who turned
     * Administrator access off; getUserList reports the Admin role either way.
     */
    isAdmin: boolean;
    firstName: string;
    lastName: string;
    /** Whether the account is disabled: a disabled person can't sign in. */
    isDisabled: boolean;
    /** getCurrentUser only: a Claviz administrator who turned Administrator access off. Claviz then treats them as a member everywhere. */
    administratorAccessOff?: boolean;
}