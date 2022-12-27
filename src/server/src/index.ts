import { Server } from "socket.io";

// Room Manager
import RoomManager, { Member, Room } from "./RoomManager";
import { findAnotherPlayer } from "./server.service";

////////////////////////////////////////////////////////
interface JoinRoomPayload {
    memberID: Member.ID;
    roomID: Room.ID;
}

interface PlayerProfile {
    elo: number;
}

interface JoinGlobalPayload {
    memberID: Member.ID;
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

const GLOBAL_IDENTIFIER = "GLOBAL";

////////////////////////////////////////////////////////

const io = new Server(7001, {
    cors: {
        origin: true,
        credentials: true
    }
});

const manager = new RoomManager(io);

////////////////////////////////////////////////////////

const randomIntFromInterval = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

const generatePlayerProfile = (member: Member.Instance): Member.Instance => {
    member.data.elo = 100;

    return member;
};

////////////////////////////////////////////////////////

io.on("connection", (socket) => {
    // Join the global room
    socket.on("joinGlobal", (joinGlobalPayload: JoinGlobalPayload) => {
        // Even though the connection is constant we still recreate the member
        const newMember = manager.createMember(
            joinGlobalPayload.memberID,
            socket
        );
        manager.addMemberToRoom(newMember, GLOBAL_IDENTIFIER);
    });

    // Add member to room based on room name
    socket.on("joinRoom", (joinRoomPayload: JoinRoomPayload) => {
        // Even though the connection is constant we still recreate the member
        const newMember = manager.createMember(
            joinRoomPayload.memberID,
            socket
        );
        manager.addMemberToRoom(newMember, joinRoomPayload.roomID);
    });

    // This is for global and local
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
        if (queRoomSize <= 1) {
            socket.emit("gameStatus", {
                status: "In Queue",
                message: "Waiting for another player"
            });
            return;
        }

        // We get all the other members from the queue
        const queueRoomMembers = manager.getRoomMembers(QUEUE_IDENTFIEIR);

        // Find a match
        // TODO: maybe let game manager do this
        const matchedOpponent = findAnotherPlayer(
            newMember,
            queueRoomMembers,
            (player: Member.Instance, opponent: Member.Instance) => {
                // Here we can put evaluation logic to see if the player can play with the opponent
                // E.g. check if the elo difference is inside the allowed range etc or check if the other member isn't blocked
                return true;
            }
        );

        // If no match was found do something here
        if (!matchedOpponent) {
            socket.emit("gameStatus", {
                status: "NOMATCH",
                message: "No match found"
            });
            return;
        }

        // Setup new room
        const newRoomName = `${newMember.uid}-${matchedOpponent.uid}`;
        manager.addMemberToRoom([newMember, matchedOpponent], newRoomName);

        // Update room data
        // TODO: let game manager do this
        let roomData = manager.getRoomData<MatchStatus>(newRoomName);
        roomData = { status: "In Room" };
        manager.setRoomData(newRoomName, roomData);

        // Send the opponent data to each player
        // TODO: let game manager do this
        newMember.connection.emit("newMessage", matchedOpponent.uid);
        matchedOpponent.connection.emit("newMessage", newMember.uid);

        manager.logServer();

        // Send new game status to players
        io.to(newRoomName).emit("gameStatus", {
            status: "MATCHED",
            message: "Matched"
        });

        // Simulating a match being played and the members going their seperate ways after
        // TODO: this is all game manager ofc
        setTimeout(() => {
            io.to(newRoomName).emit("gameStatus", {
                status: "PLAYING",
                message: "Playing"
            });

            setTimeout(() => {
                io.to(newRoomName).emit("gameStatus", {
                    status: "FINISHED",
                    message: "Finished"
                });

                manager.removeMemberFromRoom([newMember, matchedOpponent]);

                manager.logAllRooms();

                newMember.connection.emit(
                    "newMessage",
                    `Back to normal ${newMember.uid}`
                );
                matchedOpponent.connection.emit(
                    "newMessage",
                    `Back to normal ${matchedOpponent.uid}`
                );
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
        // manager.logAllMembers();
        // manager.logAllRooms();
    });
});
