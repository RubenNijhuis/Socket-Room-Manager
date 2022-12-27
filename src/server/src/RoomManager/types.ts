import {Server, Socket} from "socket.io";

namespace Member {
    export type ID = string;

    export interface Instance {
        uid: Member.ID;
        roomID: string;
        connection: Socket;
        data: any;
    }
}

namespace Room {
    export type ID = string;
    
    export interface Instance {
        id: ID;
        members: Map<Member.ID, Member.Instance>;
        data: any;
    }
}


export type { Socket }
export type { Member, Room };
