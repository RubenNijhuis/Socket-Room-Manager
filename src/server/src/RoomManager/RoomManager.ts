import { Member, Room, Socket } from "./types";

////////////////////////////////////////////////////////////

/**
 * Author: Ruben Nijhuis
 * Github: RubenNijhuis
 *
 * The room manager class manages rooms for
 * websockets. With most sockets you can attach
 * data to the socket object, but it can make it
 * difficult to manager complex data.
 *
 * Using the Room Manager will give you the benefits of
 * - Easily managable rooms
 * - Easily manager members
 * - Type safety
 * - Automatic duplication and cleanup safety
 */
class RoomManager {
    members: Map<Member.ID, Member.Instance>;
    rooms: Map<Room.ID, Room.Instance>;

    constructor() {
        this.members = new Map<Member.ID, Member.Instance>();
        this.rooms = new Map<Room.ID, Room.Instance>();
    }

    //////////////////////////////////////////////////////////

    /**
     * Finds the room based on roomID
     * @param roomID
     * @returns a room if found otherwise null
     */
    getRoomByID(roomID: Room.ID): Room.Instance | null {
        const room = this.rooms.get(roomID);
        if (!room) return null;

        return room;
    }

    /**
     * Finds a member based on ID
     * @param memberID
     * @returns a member if found otherwise null
     */
    getMemberByID(memberID: Member.ID): Member.Instance | null {
        const member = this.members.get(memberID);
        if (!member) return null;

        return member;
    }

    /**
     * Finds a member based on ID
     * @param memberID
     * @returns a member if found otherwise null
     */
    getMemberByConnectionID(connectionID: Member.ID): Member.Instance | null {
        for (const [memberID, member] of this.members) {
            if (member.connection.id === connectionID) {
                return member;
            }
        }

        return null;
    }

    //////////////////////////////////////////////////////////

    /**
     * Creates a room with the given roomID.
     * @param roomID
     * @returns a room instance
     */
    private createRoom(roomID: Room.ID): Room.Instance {
        const newRoom = {
            id: roomID,
            members: new Map<Member.ID, Member.Instance>(),
            data: null,
        };

        return newRoom;
    }

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
            roomID: "unset",
            connection,
            data: null,
        };

        return newMember;
    }

    //////////////////////////////////////////////////////////

    /**
     * Adds a member to the room. If the room doesn't
     * exist it will be created.
     * @param memberID
     * @param roomID
     * @param connection
     */
    addMemberToRoom(memberToAdd: Member.Instance, roomID: Room.ID): void;
    addMemberToRoom(memberToAdd: Member.Instance[], roomID: Room.ID): void;
    addMemberToRoom(
        memberToAdd: Member.ID,
        roomID: Room.ID,
        connection: Socket
    ): void;
    addMemberToRoom(
        memberToAdd: Member.ID | Member.Instance | Member.Instance[],
        roomID: Room.ID,
        connection?: Socket
    ): void {
        let member: Member.Instance[];
        let roomToAddMemberTo = this.getRoomByID(roomID);

        // Create the room if it doesn't exist yet
        if (!roomToAddMemberTo) roomToAddMemberTo = this.createRoom(roomID);

        /**
         * Due to overloading we have multiple ways
         * to assign the variables
         */
        if (Array.isArray(memberToAdd)) {
            member = memberToAdd as Member.Instance[];
        } else if (typeof memberToAdd === "object") {
            member = [memberToAdd];
        } else {
            if (!connection) return;
            member = [this.createMember(memberToAdd, connection)];
        }

        /**
         * Add each member to the room, members
         * list and update their internal data
         */
        for (const newMemberOfRoom of member) {
            newMemberOfRoom.roomID = roomID;

            roomToAddMemberTo.members.set(newMemberOfRoom.uid, newMemberOfRoom);
            newMemberOfRoom.connection.join(roomID);

            this.addMemberToMemberList(newMemberOfRoom);
        }

        this.rooms.set(roomID, roomToAddMemberTo);
    }

    /**
     * Removes a member from a room and deletes
     * the room if it's empty
     * @param memberID
     * @param roomID
     */
    removeMemberFromRoom(memberToRemove: Member.Instance): void;
    removeMemberFromRoom(memberToRemove: Member.Instance[]): void;
    removeMemberFromRoom(
        memberToRemove: Member.Instance[],
        roomID: Room.ID
    ): void;
    removeMemberFromRoom(memberToRemove: Member.ID, roomID: Room.ID): void;
    removeMemberFromRoom(
        memberToRemove: Member.ID | Member.Instance | Member.Instance[],
        roomID?: Room.ID
    ): void {
        let roomToRemoveID: Room.ID;
        let memberList: Member.Instance[];

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

            const retrievedMember = this.getMemberByID(memberToRemove);
            if (!retrievedMember) return;

            roomToRemoveID = roomID;
            memberList = [retrievedMember];
        }

        if (roomID) roomToRemoveID = roomID;

        const roomToRemoveMemberFrom = this.getRoomByID(roomToRemoveID);
        if (!roomToRemoveMemberFrom) return;

        for (const member of memberList) {
            roomToRemoveMemberFrom.members.delete(member.uid);
            member.connection.leave(roomToRemoveID);
        }

        const updatedRoomSize = this.getRoomSize(roomToRemoveID);
        if (updatedRoomSize === 0) {
            this.rooms.delete(roomToRemoveID);
        }
    }

    //////////////////////////////////////////////////////////

    /**
     * Adds a member object to the member list
     * @param member
     */
    addMemberToMemberList(member: Member.Instance): void {
        this.members.set(member.uid, member);
    }

    /**
     * Removes a member based on the member ID
     * @param memberID
     */
    removeMemberByMemberID(memberID: Member.ID): void {
        this.members.delete(memberID);
    }

    /**
     * Removes a member based on it's connection ID
     * @param connectionID
     */
    removeMemberByConnectionID(connectionID: string): void {
        let memberIDFromConnectionID;

        for (const [memberID, member] of this.members) {
            if (member.connection.id === connectionID) {
                memberIDFromConnectionID = member.uid;
                this.removeMemberFromRoom(memberID, member.roomID);
            }
        }

        if (memberIDFromConnectionID) {
            this.removeMemberByMemberID(memberIDFromConnectionID);
        }
    }

    //////////////////////////////////////////////////////////

    /**
     * Returns the amount of members in a room
     * @param roomID
     * @returns amount of members in a aroom
     */
    getRoomSize(roomID: Room.ID): number {
        const room = this.getRoomByID(roomID);
        if (!room) return 0;

        const roomSize = room.members.size;

        return roomSize;
    }

    /**
     * Returns an array of members based on the room id.
     * Will return an empty array if the room doesn't exist
     * as rooms can only exist if there are members in them.
     * @param roomID
     * @returns Member.Instance[]
     */
    getRoomMembers(roomID: Room.ID): Member.Instance[] {
        const room = this.getRoomByID(roomID);

        if (!room) return [];

        // Only takes the values of a list
        const members = [...room.members.values()];

        return members;
    }

    //////////////////////////////////////////////////////////

    /**
     * Retrieve the data in a room based on it's room ID
     * @param roomID
     * @returns the data object of a room instance
     */
    getRoomData<T>(roomID: Room.ID): T | null {
        const retrievedFroom = this.getRoomByID(roomID);
        if (!retrievedFroom) return null;

        const roomData = retrievedFroom.data;

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
        const retrievedFroom = this.getRoomByID(roomID);
        if (!retrievedFroom) return;

        retrievedFroom.data = data;

        this.rooms.set(roomID, retrievedFroom);
    }

    /// Logging //////////////////////////////////////////////

    logRoom(roomID: Room.ID): void {
        const room = this.getRoomByID(roomID);
        if (!room) return;

        console.log(`Room ${roomID}`, room);
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
        const allRooms = this.rooms;
        console.log("All rooms: ", allRooms);
    }

    logAllMembers(): void {
        const allMembers = this.members;
        console.log("All members: ", allMembers);
    }
}

export default RoomManager;
