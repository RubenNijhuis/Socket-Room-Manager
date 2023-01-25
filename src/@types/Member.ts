import { Socket } from "socket.io";

export type ID = string;

export interface Instance {
    uid: ID;
    roomID: string;
    connection: Socket;
    data: any;
}
