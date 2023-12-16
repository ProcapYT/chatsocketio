const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

const yellow = "\x1b[33m";
const bold = "\x1b[1m";
const endColor = "\x1b[0m";

const users = {};

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  console.log("New user connected", socket.id);

  socket.on("disconnect", (reason) => {
    console.log("A user has disconnected:", socket.id, "| for:", reason);
    for (const [username, id] of Object.entries(users)) {
      if (id === socket.id) {
        delete users[username];
        break;
      }
    }

    io.emit("userList", Object.keys(users));
  });

  socket.on("newMessage", (data) => {
    const { user, message } = data;
    io.emit("message", { user, message });
  });

  socket.on("newUser", (inputValue) => {
    if (users[inputValue]) {
      socket.emit("usernameError", "The username is already in use");
    } else {
      users[inputValue] = socket.id;
      io.emit("userList", Object.keys(users));
    }
  });

  socket.on("privateMessage", (data) => {
    const { toUser, privateMessage } = data;
    const fromUser = Object.keys(users).find((key) => users[key] === socket.id);
  
    if (fromUser === toUser) {
      // Si el remitente es el mismo que el destinatario
      socket.emit("privateMessageError", "You can't send yourself a private message");
    } else if (users[toUser]) {
      const toUserId = users[toUser];
  
      // Emitir el mensaje privado al destinatario
      io.to(toUserId).emit("privateMessage", {
        fromUser,
        toUser,
        privateMessage,
      });
  
      // También enviar el mensaje al remitente
      socket.emit("privateMessage", { fromUser, toUser, privateMessage });
    } else {
      socket.emit("privateMessageError", "User not found");
    }
  });
});

server.listen(port, () => {
  console.log(`Enter ${bold + yellow}http://localhost:${port}${endColor}`);
});
