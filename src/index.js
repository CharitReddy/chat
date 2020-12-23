const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

// server(emit) -> client (receive) -> acknowledgement -> server
// client(emit) -> server(receive) ->  acknowledgement -> client

// Executes when a new socket connection is established.
io.on("connection", (socket) => {
  socket.on("join", (options, callback) => {
    const { error, user } = addUser({
      id: socket.id,
      ...options,
    });

    if (error) {
      return callback(error);
    }

    socket.join(user.room); // join is the method which can only be used by the server to join two pages

    socket.emit("message", generateMessage("Admin", "Welcome!")); // sending data to the client
    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage("Admin", `${user.username} has joined`)); // sends this message to all connected clients except the new one(in the same roon)
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
  });

  // receiving data from the client
  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      return callback("User doesnot exist");
    }
    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed"); // Acknowledgement of server to client
    }
    io.to(user.room).emit("message", generateMessage(user.username, message)); // sending data to all connected clients(in a room)
    callback(); // Acknowledgement of server to client
  });

  // Sending location to all connected clients (in a room)
  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback(); // Acknowledgement of server to client
  });

  // Executes whenever a client gets disconnected
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
