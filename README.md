## Room Manager

A Typescript based Socket.io add-on that makes managing rooms easier

### Usage

##### Adding a member to a room
The room manager only needs an identifier and the socket to start managing the new member. Things like roomID's are only really needed when you start adding them to rooms

```typescript
const manager = new RoomManager();

io.on("connection", (socket) => {
  // Socket requests to be added to a room
  socket.on("joinRoom", ({ name, roomID }) => {
    /**
     * This function adds the member to an interal list
     * of members and returns the created member
     */
    const newMember = manager.createMember(name, socket);

    /**
     * Add them to a room. If a room doesn't exist
     * yet it will be created 
     */
    manager.addMemberToRoom(newMember, roomID);
  });
});
```

##### Room data
Rooms can keep internal state which can be accessed using a typesafe way. And set easily as well.

```typescript
interface TodoList {
    todos: string[];
}

// Type not required
const roomData = manager.getRoomData<TodoList>(roomID);

// -> Mutate your data

manager.setRoomData(roomID, roomData);
```
