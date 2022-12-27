import { Server } from "socket.io";

// Room Manager
import RoomManager, { Member, Room } from "./RoomManager";

////////////////////////////////////////////////////////

const manager = new RoomManager();

interface JoinRoomPayload {
    memberID: Member.ID;
    roomID: Room.ID;
}

interface JoinGamePayload {
    memberID: Member.ID;
}

interface GameUpdatePayload {
    batPosition: number;
}

interface MatchStatus {
    status: string;
}

const QUEUE_IDENTFIEIR = "QUEUE";
const MATCHED_IDENTFIEIR = "MATCHED";
const PLAYING_IDENTFIEIR = "PLAYING";

////////////////////////////////////////////////////////

const io = new Server(7001, {
    cors: {
        origin: true,
        credentials: true,
    },
});

////////////////////////////////////////////////////////

const randomIntFromInterval = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

const randomValueFromArray = <T>(arr: T[]): T => {
    let returnedItem;
    let randomIndex = randomIntFromInterval(0, arr.length - 1);

    returnedItem = arr[randomIndex];

    return returnedItem;
};

////////////////////////////////////////////////////////

io.on("connection", (socket) => {
    // Add member to room based on room name
    socket.on("joinRoom", (joinRoomPayload: JoinRoomPayload) => {
        const { memberID, roomID } = joinRoomPayload;
        manager.addMemberToRoom(memberID, roomID, socket);
    });

    // Broadcast message after emit
    socket.on("newMessage", (arg) => {
        socket.broadcast.emit("newMessage", arg);
    });

    socket.on("joinGame", (joinGamePayload: JoinGamePayload) => {
        // Even though the connection is constant we still recreate the member
        const newMember = manager.createMember(
            joinGamePayload.memberID,
            socket
        );

        manager.addMemberToRoom(newMember, QUEUE_IDENTFIEIR);
        socket.emit("gameStatus", { status: "In Queue", message: "In Queue" });

        // Only if there are multiple people in the que do we look for a teammate
        const queRoomSize = manager.getRoomSize(QUEUE_IDENTFIEIR);
        if (queRoomSize <= 1) return;

        // We get all the other members from the queue
        const roomMembers = manager
            .getRoomMembers(QUEUE_IDENTFIEIR)
            .filter((member) => member.uid !== newMember.uid);

        const otherMember = randomValueFromArray<Member.Instance>(roomMembers);

        manager.removeMemberFromRoom([newMember, otherMember]);

        const newRoomName = `${newMember.uid}-${otherMember.uid}`;
        manager.addMemberToRoom([newMember, otherMember], newRoomName);

        let roomData = manager.getRoomData(newRoomName);
        roomData = { status: "In Room" };
        manager.setRoomData(newRoomName, roomData);

        newMember.connection.emit("newMessage", otherMember.uid);
        otherMember.connection.emit("newMessage", newMember.uid);

        manager.logRoomMembers(newRoomName);

        io.to(newRoomName).emit("gameStatus", {
            status: "MATCHED",
            message: "Matched",
        });

        // Simulating a match being played and the members going their seperate ways after
        setTimeout(() => {
            io.to(newRoomName).emit("gameStatus", {
                status: "PLAYING",
                message: "Playing",
            }); 

            setTimeout(() => {
                io.to(newRoomName).emit("gameStatus", {
                    status: "FINISHED",
                    message: "Finished",
                }); 

                manager.removeMemberFromRoom([newMember, otherMember]);

                newMember.connection.emit("newMessage", `Back to normal ${newMember.uid}`);
                otherMember.connection.emit("newMessage", `Back to normal ${otherMember.uid}`);
            }, 5000);
        }, 5000);
    });

    socket.on("gameUpdate", (gameUpdatePayload: GameUpdatePayload) => {
        const member = manager.getMemberByConnectionID(socket.id);
        if (!member) return;

        // Send position update to the game manager
    });

    // Remove member from all lists
    socket.on("disconnect", (reason: any) => {
        manager.removeMemberByConnectionID(socket.id);
        manager.logAllMembers();
    });
});
