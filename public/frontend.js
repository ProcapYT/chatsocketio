const socket = io();

const inputMessage = document.querySelector("#input");
const messagesBox = document.querySelector("#messagesBox");
const sendButton = document.querySelector("#sendButton");
const mainChat = document.querySelector("#mainChat");
const usernameInput = document.querySelector("#usernameInput");
const usernameButton = document.querySelector("#usernameButton");
const userNames = document.querySelector("#userNames");
const usernameErrorContainer = document.querySelector(
  "#usernameErrorContainer"
);
const usernameMain = document.querySelector("#usernameMain");

let cleanCurrentUser = null;

mainChat.style.display = "none";
usernameErrorContainer.style.display = "none";

const sendMessage = () => {
  if (inputMessage.value) {
    const message = inputMessage.value;
    if (message.startsWith("/w ")) {
      const parts = message.split(" ");
      const toUser = parts[1];
      const privateMessage = parts.slice(2).join(" ");

      socket.emit("privateMessage", { toUser, privateMessage });
    } else {
      socket.emit("newMessage", { user: cleanCurrentUser, message });
    }

    inputMessage.value = "";
  }
};

const addUsername = () => {
  if (usernameInput.value) {
    const currentUser = usernameInput.value;
    cleanCurrentUser = currentUser.replace(/\s/g, "");
    socket.emit("newUser", cleanCurrentUser);
    usernameInput.value = "";
  }
};

Notification.requestPermission()

const showNotification = ({message, user}) => {
  if ('Notification' in window) {
    const notification = new Notification(user, {
      body: message
    })

    notification.onclick = () => {
      window.open('/')
    }
  }
}

addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
    addUsername();
  }
});

sendButton.addEventListener("click", () => {
  sendMessage();
});

usernameButton.addEventListener("click", () => {
  addUsername();
});

socket.on("userList", (users) => {
  userNames.innerHTML = users
    .map(
      (username) => `<p><i class="fa-solid fa-user"></i>&nbsp;${username}</p>`
    )
    .join("");
  usernameErrorContainer.innerHTML = "";
  usernameErrorContainer.style.display = "none";

  if (cleanCurrentUser) {
    if (users.includes(cleanCurrentUser)) {
      usernameMain.style.display = "none";
      mainChat.style.display = "initial";
    } else {
      usernameMain.style.display = "initial";
      mainChat.style.display = "none";
    }
  }
});

socket.on("usernameError", (errorMsg) => {
  usernameErrorContainer.style.display = "block";
  usernameErrorContainer.innerHTML = `<p>${errorMsg}</p>`;
});

socket.on("privateMessageError", (errorMsg) => {
  messagesBox.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
});

socket.on("message", (data) => {
  const { user, message } = data;

  const isCurrentUser = user === cleanCurrentUser;

  const displayName = isCurrentUser ? "You" : user;

  messagesBox.innerHTML += `<p class="message"><b>${displayName}:</b> ${message}</p>`;

  if(!isCurrentUser) {
    showNotification({message: message + ':', user: displayName})
  }
});

socket.on('privateMessage', data => {
  const { fromUser, toUser, privateMessage } = data;
  const isCurrentUser = fromUser === cleanCurrentUser;

  let displayMessage = '';

  if (isCurrentUser) {
      displayMessage = `<p class="message" style="color: rgb(100, 100, 100); font-style: italic;"><b>You to ${toUser}:</b> ${privateMessage}</p>`;
  } else if (toUser === cleanCurrentUser) {
      displayMessage = `<p class="message" style="color: rgb(100, 100, 100); font-style: italic;"><b>${fromUser} to You:</b> ${privateMessage}</p>`;
      showNotification({message: privateMessage, user: `${fromUser} to You:`})
  }

  messagesBox.innerHTML += displayMessage;
});
