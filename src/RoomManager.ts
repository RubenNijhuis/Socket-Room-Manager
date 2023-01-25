import { Server, Socket } from "socket.io";

// Types
import * as Room from "./@types/Room";
import * as Member from "./@types/Member";

////////////////////////////////////////////////////////////

class RoomManager {
    private readonly _members: Map<Member.ID, Member.Instance>;
    private readonly _rooms: Map<Room.ID, Room.Instance>;
    private readonly _server: Server;

    constructor(server: Server) {
        if (!server) {
            throw Error(
                "No server instance supplied in room manager constructor"
            );
        }

        this._members = new Map<Member.ID, Member.Instance>();
        this._rooms = new Map<Room.ID, Room.Instance>();
        this._server = server;
    }

    //////////////////////////////////////////////////////////

    /**
     * Finds the room based on roomID
     * @param roomID
     * @returns a room if found otherwise null
     */
    getRoomByID(roomID: Room.ID): Room.Instance {
        const retrievedRoom = this._rooms.get(roomID);

        if (!retrievedRoom) {
            throw Error(`No room found with id: ${roomID}`);
        }

        return retrievedRoom;
    }

    /**
     * Finds a member based on ID
     * @param memberID
     * @returns a member if found otherwise null
     */
    getMemberByID(memberID: Member.ID): Member.Instance | null {
        const retrievedMember = this._members.get(memberID);

        if (!retrievedMember) {
            throw Error(`No member found with id: ${memberID}`);
        }

        return retrievedMember;
    }

    /**
     * Finds a member based on ID
     * @param memberID
     * @returns a member if found otherwise null
     */
    getMemberByConnectionID(connectionID: Member.ID): Member.Instance | null {
        for (const [, member] of this._members) {
            if (member.connection.id === connectionID) {
                return member;
            }
        }

        return null;
    }

    //////////////////////////////////////////////////////////

    /**
     * Creates a member with the memberID
     * and socket connections
     * @param memberID
     * @param connection
     * @returns a new member instance
     */
    createMember(memberID: Member.ID, connection: Socket): Member.Instance {
        const newMember: Member.Instance = {
            uid: memberID,
            roomID: Room.DefaultID,
            connection,
            data: null
        };

        this._members.set(memberID, newMember);

        return newMember;
    }

    /**
     * Creates a room with the given roomID.
     * @param roomID
     * @returns a room instance
     */
    private createRoom(roomID: Room.ID): Room.Instance {
        const newRoom = {
            id: roomID,
            members: new Map<Member.ID, Member.Instance>(),
            data: null
        };

        this._rooms.set(roomID, newRoom);

        return newRoom;
    }

    //////////////////////////////////////////////////////////

    /**
     * Adds a member to the room. If the room doesn't
     * exist it will be created.
     * @param memberID
     * @param roomID
     * @param connection
     */
    addMemberToRoom(
        memberToAdd: Member.ID | Member.Instance | Member.Instance[],
        roomID: Room.ID
    ): void {
        let member: Member.Instance[] = [];
        let roomToAddMemberTo = this.getRoomByID(roomID);

        // Create the room if it doesn't exist yet
        if (!roomToAddMemberTo) {
            roomToAddMemberTo = this.createRoom(roomID);
        }

        /**
         * Due to overloading we have multiple ways
         * to assign the variables
         */
        if (Array.isArray(memberToAdd)) {
            member = memberToAdd as Member.Instance[];
        } else if (typeof memberToAdd === "object") {
            member = [memberToAdd];
        }

        /**
         * Add each member to the room, members
         * list and update their internal data
         */
        for (const newMemberOfRoom of member) {
            // Remove them from any room they could still be in
            if (newMemberOfRoom.roomID !== Room.DefaultID) {
                this.removeMemberFromRoom(newMemberOfRoom);
                newMemberOfRoom.connection.leave(newMemberOfRoom.roomID);
            }

            newMemberOfRoom.roomID = roomID;

            roomToAddMemberTo.members.set(newMemberOfRoom.uid, newMemberOfRoom);
            newMemberOfRoom.connection.join(roomID);

            this.addMemberToMemberList(newMemberOfRoom);
        }

        this._rooms.set(roomID, roomToAddMemberTo);
    }

    /**
     * Removes a member from a room and deletes
     * the room if it's empty.
     * @param memberID
     * @param roomID
     */
    removeMemberFromRoom(
        memberToRemove: Member.ID | Member.Instance | Member.Instance[],
        roomID?: Room.ID
    ): void {
        let roomToRemoveID: Room.ID;
        let memberList: Member.Instance[];

        ////////////////////////////////////////////////////////

        /**
         * Due to overloading we have multiple ways
         * to assign the variables
         */
        if (Array.isArray(memberToRemove)) {
            memberList = memberToRemove;
            roomToRemoveID = memberList[0].roomID;
        } else if (typeof memberToRemove === "object") {
            memberList = [memberToRemove];
            roomToRemoveID = memberToRemove.roomID;
        } else {
            if (!roomID) return;
            roomToRemoveID = roomID;

            const retrievedMember = this.getMemberByID(memberToRemove);
            if (!retrievedMember) return;

            memberList = [retrievedMember];
        }

        ////////////////////////////////////////////////////////

        const roomToRemoveMemberFrom = this.getRoomByID(roomToRemoveID);
        if (!roomToRemoveMemberFrom) {
            throw Error(`No room found with id: ${roomID}`);
        }

        // Go through all the members that need to be removed
        for (const member of memberList) {
            roomToRemoveMemberFrom.members.delete(member.uid);

            // Update the member
            member.connection.leave(roomToRemoveID);
            member.roomID = Room.DefaultID;
            this._members.set(member.uid, member);
        }

        const updatedRoomSize = this.getRoomSize(roomToRemoveID);
        if (updatedRoomSize === 0) {
            this._rooms.delete(roomToRemoveID);
        }
    }

    //////////////////////////////////////////////////////////

    /**
     * Removes a member based on it's connection ID
     * @param connectionID
     */
    removeMemberByConnectionID(connectionID: string): void {
        for (const [, member] of this._members) {
            if (member.connection.id === connectionID) {
                this.removeMemberByMemberID(member.uid);
            }
        }
    }

    /**
     * Adds a member object to the member list
     * @param member
     */
    private addMemberToMemberList(member: Member.Instance): void {
        this._members.set(member.uid, member);
    }

    /**
     * Removes a member based on the member ID
     * @param memberID
     */
    private removeMemberByMemberID(memberID: Member.ID): void {
        this.removeMemberFromRoom(memberID);
        this._members.delete(memberID);
    }

    //////////////////////////////////////////////////////////

    /**
     * Returns the amount of members in a room.
     * Will return -1 if room wasn't found
     * @param roomID
     * @returns amount of members in a aroom
     */
    getRoomSize(roomID: Room.ID): number {
        const retrievedRoom = this.getRoomByID(roomID);

        if (!retrievedRoom) {
            throw Error(`No room found with id: ${roomID}`);
        }

        const roomSize = retrievedRoom.members.size;

        return roomSize;
    }

    /**
     * Returns an array of members based on the room id.
     * Will return an empty array if the room doesn't exist
     * as rooms can only exist if there are members in them.
     *
     * Will return an empty array if no room is found
     * @param roomID
     * @returns Member.Instance[]
     */
    getRoomMembers(roomID: Room.ID): Member.Instance[] {
        const retrievedRoom = this.getRoomByID(roomID);

        if (!retrievedRoom) {
            throw Error(`No room found with id: ${roomID}`);
        }

        // Only takes the values of a list
        const members = [...retrievedRoom.members.values()];

        return members;
    }

    //////////////////////////////////////////////////////////

    /**
     * Retrieve the data in a room based on it's room ID.
     *
     * Will return null if no room is found
     * @param roomID
     * @returns the data object of a room instance
     */
    getRoomData<T>(roomID: Room.ID): T {
        const retrievedRoom = this.getRoomByID(roomID);

        if (!retrievedRoom) {
            throw Error(`No room found with id: ${roomID}`);
        }

        const roomData = retrievedRoom.data;

        return roomData;
    }

    /**
     * Sets the room data object of a room based
     * on the give room ID and data object
     * @param roomID
     * @param data
     * @returns
     */
    setRoomData(roomID: Room.ID, data: any): void {
        const retrievedRoom = this.getRoomByID(roomID);

        if (!retrievedRoom) {
            throw Error(`No room found with id: ${roomID}`);
        }

        retrievedRoom.data = data;

        this._rooms.set(roomID, retrievedRoom);
    }

    /**
     * Retrieves the member data based on ID
     * @param memberId
     * @returns data
     */
    getMemberData<T>(memberId: Member.ID): T {
        const retrievedMember = this.getMemberByID(memberId);

        if (!retrievedMember) {
            throw Error(`No member found with id: ${memberId}`);
        }

        return retrievedMember.data;
    }

    /**
     * Sets the player data based on ID
     * @param memberID
     */
    setMemberData<T>(memberId: Member.ID, data: T): void {
        const retrievedMember = this.getMemberByID(memberId);

        if (!retrievedMember) {
            throw Error(`No member found with id: ${memberId}`);
        }

        retrievedMember.data = data;

        this._members.set(memberId, retrievedMember);
    }

    /// Logging //////////////////////////////////////////////

    logRoom(roomID: Room.ID): void {
        const retrievedRoom = this.getRoomByID(roomID);

        if (!retrievedRoom) {
            throw Error(`No room found with id: ${roomID}`);
        }

        console.log(`Room ${roomID}`, retrievedRoom);
    }

    /// Attched server //////////////

    logServer(): void {
        const server = this._server;

        console.log("Server object", server.sockets.adapter.rooms);
    }

    /// Room internals //////////////

    logRoomData(roomID: Room.ID): void {
        const room = this.getRoomByID(roomID);
        if (!room) return;

        console.log(`Room data of room ${roomID}`, room.data);
    }

    logRoomMembers(roomID: Room.ID): void {
        const room = this.getRoomByID(roomID);
        if (!room) return;

        console.log(`All members of room ${roomID}`, room.members);
    }

    /// List logs //////////////

    logAllRooms(): void {
        const allRooms = this._rooms;
        console.log("All rooms: ", allRooms);
    }

    logAllMembers(): void {
        const allMembers = this._members;
        console.log("All members: ", allMembers);
    }
}

export default RoomManager;
