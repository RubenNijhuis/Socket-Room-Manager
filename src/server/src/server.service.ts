// import { Server } from "socket.io";

// // Room Manager
// import RoomManager, { Member, Room } from "./RoomManager";

// ////////////////////////////////////////////////////////

// const manager = new RoomManager();

// interface JoinRoomPayload {
//     memberID: Member.ID;
//     roomID: Room.ID;
// }

// interface JoinGamePayload {
//     memberID: Member.ID;
// }

// const QUEUE_IDENTFIEIR = "QUEUE";

// ////////////////////////////////////////////////////////
// // const server = http.createServer(app);
// // app.listen(7000, () => {});

// function randomIntFromInterval(min: number, max: number): number {
//     return Math.floor(Math.random() * (max - min + 1) + min);
// }

// const 


//     // Add member to room based on room name
//     socket.on("joinRoom", (joinRoomPayload: JoinRoomPayload) => {
//         const { memberID, roomID } = joinRoomPayload;

//         manager.addMemberToRoom(memberID, roomID, socket);
//         manager.logAllRooms();
//     });

//     socket.on("joinGame", (joinGamePayload: JoinGamePayload) => {
//         // Add new member to queue
//         manager.addMemberToRoom(
//             joinGamePayload.memberID,
//             QUEUE_IDENTFIEIR,
//             socket
//         );
//         socket.emit("gameStatus", { status: "In Queue", message: "In Queue" });

//         const queRoomSize = manager.getRoomSize(QUEUE_IDENTFIEIR);

//         if (queRoomSize === 0) return;

//         const roomMembers = manager.getRoomMembers(QUEUE_IDENTFIEIR);
//         let otherMember: Member.Instance;

//         const filteredMembers = roomMembers.filter(
//             (member) => member.uid !== joinGamePayload.memberID
//         );

//         if (filteredMembers.length >= 1) {
//             otherMember =
//                 filteredMembers[
//                     randomIntFromInterval(0, filteredMembers.length)
//                 ];

//             manager.removeMemberFromRoom(
//                 joinGamePayload.memberID,
//                 QUEUE_IDENTFIEIR
//             );

//             let newRoomName = `${joinGamePayload.memberID}-${otherMember.uid}`;

//             manager.addMemberToRoom(
//                 joinGamePayload.memberID,
//                 newRoomName,
//                 socket
//             );
//             manager.addMemberToRoom(
//                 otherMember.uid,
//                 newRoomName,
//                 otherMember.connection
//             );

//             socket.emit("gameStatus", {
//                 status: "In Room",
//                 message: "In Room",
//             });
//             otherMember.connection.emit("gameStatus", {
//                 status: "In Room",
//                 message: "In Room",
//             });
//         }
//     });
