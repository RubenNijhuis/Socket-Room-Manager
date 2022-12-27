// Elements
const statusList = document.getElementsByClassName("status-list")[0];
const namePlace = document.getElementById("name");

// Inputs
const roomIDInput = document.getElementById("roomID");
const profileNameInput = document.getElementById("profile-name");
const messageInput = document.getElementById("send-message");

const setDocumentTitle = (str) => {
  document.title = str;
};

const setName = () => {
    namePlace.innerText = profileNameInput.value;
}

const createNewStatus = (status, level) => {
  const statusBlock = document.createElement("li");

  statusBlock.innerText = JSON.stringify(status);
  statusBlock.classList.add("item");

  if (level) {
    statusBlock.classList.add(level);
  }

  statusList.appendChild(statusBlock);
};
