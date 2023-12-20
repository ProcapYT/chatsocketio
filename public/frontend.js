// Use socket.io on the frontend
const socket = io();

// Import HTML elements
const inputMessage = document.querySelector("#input");
const messagesBox = document.querySelector("#messagesBox");
const sendButton = document.querySelector("#sendButton");
const mainChat = document.querySelector("#mainChat");
const usernameInput = document.querySelector("#usernameInput");
const usernameButton = document.querySelector("#usernameButton");
const createRoomButton = document.querySelector("#createRoomButton");
const newRoomInput = document.querySelector("#newRoomInput");
const roomList = document.querySelector("#roomList");
const userNames = document.querySelector("#userNames");
const usernameErrorContainer = document.querySelector(
  "#usernameErrorContainer"
);
const usernameMain = document.querySelector("#usernameMain");
const messagesContainer = document.querySelector("#messagesContainer");

// Create variables outside the function
let cleanCurrentUser = null;
let currentRoom;

// Hide the mainchat and the error container
mainChat.classList.add("hidden");
usernameErrorContainer.classList.add("hidden");

// Create a function to send a message
const sendMessage = () => {
  // Check if the input has a value
  if (inputMessage.value) {
    // Private message logic
    const message = inputMessage.value;
    if (message.startsWith("/w ")) {
      const parts = message.split(" ");
      const toUser = parts[1];
      const privateMessage = parts.slice(2).join(" ");

      // Emit private message to the backend
      socket.emit("privateMessage", { toUser, privateMessage });
    } else {
      // Check if the message isn't /clear
      if (inputMessage.value.trim().toLowerCase() !== "/clear") {
        // Emit a new message to the backend
        socket.emit("newMessage", {
          user: cleanCurrentUser,
          message,
          room: currentRoom,
        });
      }
    }

    // Set the input value to a empty string
    inputMessage.value = "";

    // Check if the user is in a room
    if (!currentRoom && !message.startsWith("/w ")) {
      messagesBox.innerHTML += `<p style="color: red;">You need to join a room first.</p>`;
    }

    // Check if the message is /clear to clear the chat
    if (message.trim().toLowerCase() === "/clear") {
      messagesBox.innerHTML = "";
    }

    // Scroll to the top when the user sends a message
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
};

// Function to add a username to the backend's hash
const addUsername = () => {
  // Check if the value of the input isn't empty
  if (usernameInput.value) {
    // Create a clean user variable
    const currentUser = usernameInput.value;
    cleanCurrentUser = currentUser.replace(/ /g, "");

    // Emit a new user event to the backend
    socket.emit("newUser", cleanCurrentUser);

    // Clean the input value
    usernameInput.value = "";

    // Set the title to the user
    document.querySelector(
      ".roomTitleChat"
    ).innerText = `Chat - ${cleanCurrentUser}`;
  }
};

// Create a create room function
const createRoom = () => {
  // Get a clean room name
  const newRoomName = newRoomInput.value.trim();

  // Check if the room name exists
  if (newRoomName) {
    // Check if the room name is less then 10 characters
    if (newRoomName.length <= 10) {
      // Emit a create room event to the backend
      socket.emit("createRoom", { user: cleanCurrentUser, room: newRoomName });
      socket.emit("joinRoom", { user: cleanCurrentUser, room: newRoomName });

      // Clean the input value
      newRoomInput.value = "";
    }
  }
};

// Request permission to send notifications
Notification.requestPermission();

// Create a show notification function
const showNotification = ({ message, user }) => {
  // Create a notification
  const notification = new Notification(user, {
    body: message,
  });

  // Check when the notification has been clicked
  notification.onclick = () => {
    open("/");
  };
};

// Create an update room list function
const updateRoomList = (rooms) => {
  // Get the room list element from the HTML
  const roomListElement = document.querySelector("#roomList");
  roomListElement.innerHTML = "";

  // Create a for loop to parse the rooms array
  for (const room in rooms) {
    if (rooms.hasOwnProperty(room)) {
      // Create the room button element, give it a class and giving it a dataset
      const roomButton = document.createElement("button");
      roomButton.className = "joinRoomButton";
      roomButton.dataset.room = rooms[room];

      // Create the fontawesome icon element
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-door-open";
      roomButton.appendChild(icon);

      // Create a child of the button with a text(name of the room)
      const textNode = document.createTextNode(` ${rooms[room]}`);
      roomButton.appendChild(textNode);

      // Check for when the button is clicked
      roomButton.addEventListener("click", () => {
        // Get the room name with the dataset of the button and emit a join room message to the backend
        const roomName = roomButton.dataset.room;
        socket.emit("joinRoom", { user: cleanCurrentUser, room: roomName });
      });

      // Create a child with the button to the room list
      roomListElement.appendChild(roomButton);
    }
  }
};

// Check when the enter key is pressed and execute the send message and add username functions
addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
    addUsername();
  }
});

// Execute the send message function when the send button is clicked
sendButton.addEventListener("click", () => {
  sendMessage();
});

// Execute the add username function when the username button is clicked
usernameButton.addEventListener("click", () => {
  addUsername();
});

// Execute the create room function when the create room button is clicked
createRoomButton.addEventListener("click", () => {
  createRoom();
});

// Check if the backend has sent a userlist event
socket.on("userList", (users) => {
  // Get the usernames container from the HTML
  const userNamesContainer = document.querySelector("#userNames");

  // Check if the users array is empty
  if (users.length === 0) {
    // Hide the usernames container
    while (userNamesContainer.firstChild) {
      userNamesContainer.removeChild(userNamesContainer.firstChild);
    }
    userNamesContainer.classList.add("hidden");
  } else {
    // Clear existing content
    while (userNamesContainer.firstChild) {
      userNamesContainer.removeChild(userNamesContainer.firstChild);
    }

    // For each user create a p tag with the user and a user icon from fontawesome
    users.forEach((username) => {
      const paragraphElement = document.createElement("p");
      const iconElement = document.createElement("i");
      iconElement.classList.add("fa-solid", "fa-user");
      const textNode = document.createTextNode(` ${username}`);
      paragraphElement.appendChild(iconElement);
      paragraphElement.appendChild(textNode);
      userNamesContainer.appendChild(paragraphElement);
    });

    // Unhide the usernames container
    userNamesContainer.classList.remove("hidden");
  }
});

// Check if the backend has sent an user event
socket.on("user", (users) => {
  // Check if the users array includes the clean user and hide and unhide a bunch of things
  if (users.includes(cleanCurrentUser)) {
    usernameMain.classList.add("hidden");
    mainChat.classList.remove("hidden");
  } else {
    usernameMain.classList.remove("hidden");
    mainChat.classList.add("hidden");
  }
});

// Check if the backend has sent an username error event
socket.on("usernameError", (errorMsg) => {
  // Unhide the username error container and show the error message
  usernameErrorContainer.classList.remove("hidden");
  mainChat.classList.add("hidden");
  usernameMain.classList.remove("hidden");
  usernameErrorContainer.innerHTML = `<p>${errorMsg}</p>`;
});

// Check if the backend has sent a room list event
socket.on("roomList", (rooms) => {
  // Execute the update rooms function with the rooms array
  updateRoomList(rooms);
});

// Check if the backend has sent a join room event
socket.on("joinRoom", (data) => {
  // Get the user and the room
  const { user, room } = data;
  currentRoom = room;
  document.querySelector(
    ".roomTitleChat"
  ).innerText = `Chat (${room}) - ${user}`;
});

// Check if the backend has sent an error message from the private message and showit
socket.on("privateMessageError", (errorMsg) => {
  messagesBox.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
});

// Recive the message event from the backend
socket.on("message", (data) => {
  const { user, message } = data;

  const isCurrentUser = user === cleanCurrentUser;

  const displayName = isCurrentUser ? "You" : user;

  messagesBox.innerHTML += `<p class="message"><b>${displayName}:</b> ${message}</p>`;

  if (!isCurrentUser) {
    showNotification({ message, user: `${displayName}:` });
  }
});

// Recive the private message event from the backend
socket.on("privateMessage", (data) => {
  const { fromUser, toUser, privateMessage } = data;
  const isCurrentUser = fromUser === cleanCurrentUser;

  let displayMessage = "";

  if (isCurrentUser) {
    displayMessage = `<p class="message" style="color: rgb(100, 100, 100); font-style: italic;"><b>You to ${toUser}:</b> ${privateMessage}</p>`;
  } else if (toUser === cleanCurrentUser) {
    displayMessage = `<p class="message" style="color: rgb(100, 100, 100); font-style: italic;"><b>${fromUser} to You:</b> ${privateMessage}</p>`;
    showNotification({ message: privateMessage, user: `${fromUser} to You:` });
  }

  messagesBox.innerHTML += displayMessage;
});
