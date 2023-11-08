import { UserGroupRole } from "./user-group-role";

export interface UserGroup {
    id: string;
    label: string;
    roles: UserGroupRole[];
}