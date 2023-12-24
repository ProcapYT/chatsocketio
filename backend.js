// Import the necesary dependencies
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// Create an express, http and socket.io server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Port variable for the server
const port = process.env.PORT || 3000;

// Colors for the terminal
const yellow = "\x1b[33m";
const bold = "\x1b[1m";
const endColor = "\x1b[0m";

// User and room hashes
const users = {};
const rooms = {};

// Use the public folder as a static site
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Check when the frontend connects
io.on("connection", (socket) => {
  console.log("New user connected", socket.id);

  // Check when the frontend disconnects
  socket.on("disconnect", (reason) => {
    console.log("A user has disconnected:", socket.id, "| for:", reason);

    // Emit the users of each room
    for (const [room, usersInRoom] of Object.entries(rooms)) {
      const userIndex = usersInRoom.indexOf(socket.id);
      if (userIndex !== -1) {
        usersInRoom.splice(userIndex, 1);
        io.to(room).emit(
          "userList",
          usersInRoom.map((userId) =>
            Object.keys(users).find((key) => users[key] === userId)
          )
        );
        if (usersInRoom.length === 0) {
          delete rooms[room];
          io.emit("roomList", Object.keys(rooms));
        }
      }
    }

    // Delete users when they logout
    for (const [username, id] of Object.entries(users)) {
      if (id === socket.id) {
        delete users[username];
        break;
      }
    }

    io.emit("userList", Object.keys(users));
  });

  // Messages logic
  socket.on("newMessage", (data) => {
    const { user, message, room } = data;
    io.to(room).emit("message", { user, message });
  });

  // User logic
  socket.on("newUser", (inputValue) => {
    if (users[inputValue]) {
      socket.emit("usernameError", "The username is already in use");
    } else if (inputValue.length >= 10) {
      socket.emit("usernameError", "The username is too long");
    } else {
      users[inputValue] = socket.id;
      io.emit("user", Object.keys(users));
    }
  });

  // Private message logic
  socket.on("privateMessage", (data) => {
    const { toUser, privateMessage, room } = data;
    const fromUser = Object.keys(users).find((key) => users[key] === socket.id);

    if (fromUser === toUser) {
      socket.emit(
        "privateMessageError",
        "You can't send yourself a private message"
      );
    } else if (users[toUser]) {
      const toUserId = users[toUser];

      io.to(toUserId).emit("privateMessage", {
        fromUser,
        toUser,
        privateMessage,
      });

      socket.emit("privateMessage", { fromUser, toUser, privateMessage });
    } else {
      socket.emit("privateMessageError", "User not found");
    }
  });

  // Create room logic
  socket.on("createRoom", (data) => {
    const { user, room } = data;
    const cleanRoomName = room.replace(/\s/g, "");

    if (!rooms[cleanRoomName]) {
      rooms[cleanRoomName] = [socket.id];
      io.emit("roomList", Object.keys(rooms));
      io.to(socket.id).emit("joinRoom", { user, room: cleanRoomName });
      socket.join(cleanRoomName);
    } else {
      // Send an error message to the frontend
      socket.emit("createRoomError", "The room already exists");
    }
  });

  // Join room logic
  socket.on("joinRoom", (data) => {
    const { user, room } = data;
    const cleanRoomName = room.replace(/\s/g, "");

    for (const [prevRoom, prevUsersInRoom] of Object.entries(rooms)) {
      const prevUserIndex = prevUsersInRoom.indexOf(socket.id);
      if (prevUserIndex !== -1) {
        prevUsersInRoom.splice(prevUserIndex, 1);
        io.to(prevRoom).emit(
          "userList",
          prevUsersInRoom.map((userId) =>
            Object.keys(users).find((key) => users[key] === userId)
          )
        );
        if (prevUsersInRoom.length === 0) {
          delete rooms[prevRoom];
        }
        break;
      }
    }

    // Detects when a user connects into a room
    if (rooms[cleanRoomName] && !rooms[cleanRoomName].includes(socket.id)) {
      rooms[cleanRoomName].push(socket.id);
      io.to(cleanRoomName).emit("message", {
        user: "System",
        message: `${user} has joined the room.`,
      });
      socket.join(cleanRoomName);
      io.to(socket.id).emit("joinRoom", { user, room: cleanRoomName });
      io.to(cleanRoomName).emit("userList", rooms[cleanRoomName]);
    }
  });

  // Each second emits the room and user list
  setInterval(() => {
    for (const room in rooms) {
      if (rooms.hasOwnProperty(room)) {
        if (!rooms[room]) {
          delete rooms[room];
          io.emit("roomList", Object.keys(rooms));
        }
      }
    }
    io.emit("userList", Object.keys(users));
    socket.emit("roomList", Object.keys(rooms));
  }, 1000);
});

// Listen in the port variable
server.listen(port, () => {
  console.log(`Enter ${bold + yellow}http://localhost:${port}${endColor}`);
});
