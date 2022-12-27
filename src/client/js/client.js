const socket = io("ws://localhost:7001");

////////////////////////////////////////////////////////////

socket.on("newMessage", (arg) => {
  console.log("WHAT");
  createNewStatus(arg, "red");
});

socket.on("gameStatus", (arg) => {
  setDocumentTitle(arg.status);
  createNewStatus(arg.message, "green");
});

////////////////////////////////////////////////////////////

const joinChatRoom = () => {
  if (profileNameInput.value === "") {
    alert("Set a name first");
    return;
  }

  const roomID = roomIDInput.value;
  socket.emit("joinRoom", { memberID: profileNameInput.value, roomID });
  console.log(profileNameInput.value, roomID);
};

const playGame = () => {
  console.log(profileNameInput.value);
  socket.emit("joinGame", { memberID: profileNameInput.value });
};

const sendMessage = () => {
  socket.emit("newMessage", messageInput.value);
};

////////////////////////////////////////////////////////////
