import * as Member from "./Member";

export type ID = string;

export const DefaultID = "unset";

export interface Instance {
    id: ID;
    members: Map<Member.ID, Member.Instance>;
    data: any;
}
