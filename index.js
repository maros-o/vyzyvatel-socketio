import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import {
  createRoom,
  cancelRoom,
  joinRoom,
  leaveRoom,
  updateRoom,
  kickUserFromRoom,
  getPublicRooms,
} from "./src/logic/lobby.js";
import { rooms, users, categories } from "./src/globals.js";
import { getCategories } from "./src/getRequests.js";
import { updateUserOnLogin } from "./src/logic/users.js";
import {
  startGame,
  answerQuestion,
  answerPickRegion,
  answerAttackRegion,
} from "./src/logic/game.js";
import { endpoints, debugLog } from "./src/endpoints.js";
import { CLEAN_INTERVAL_TIME } from "./src/constants.js";
import { deleteAfkLobbies, deleteAfkMenuUsers } from "./src/cleanups.js";

const app = express();
app.use(cors());

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

getCategories(categories);
endpoints(app);

setInterval(() => {
  deleteAfkMenuUsers();
  deleteAfkLobbies();
}, CLEAN_INTERVAL_TIME);

io.on("connection", (socket) => {
  socket.on("login", (username, useremail, callback) => {
    try {
      updateUserOnLogin(username, useremail, socket, callback);
      debugLog(
        `Login: ${socket.id}, Username: ${username}, Email: ${useremail}`
      );
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("create-room", (username, callback) => {
    try {
      createRoom(username, socket, callback);
      debugLog(`${username} created room: ${users[username].roomCode}`);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("cancel-room", (username) => {
    try {
      debugLog(`${username} canceled room ${users[username].roomCode}`);
      cancelRoom(username, io);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("join-room", (roomCode, username, callback) => {
    try {
      joinRoom(username, roomCode, callback, socket, io);
      debugLog(`${username} joined room: ${roomCode}`);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("leave-room", (username, callback) => {
    try {
      debugLog(`${username} left room: ${users[username].roomCode}`);
      leaveRoom(username, callback, socket, io);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("update-room", (username, roomInfo) => {
    try {
      updateRoom(username, roomInfo, io);
      debugLog(`${username} updated room ${users[username].roomCode} 
    ${JSON.stringify(rooms[users[username].roomCode], null, 2)}`);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("kick-room", (username, kicked) => {
    try {
      kickUserFromRoom(username, kicked, io);
      debugLog(`${username} kicked ${kicked} from ${users[username].roomCode}`);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("public-rooms", (callback) => {
    try {
      getPublicRooms(callback);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("start-game", (username) => {
    try {
      debugLog(`${username} started game ${users[username].roomCode}`);
      startGame(username);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("answer-question", (username, answer, auto) => {
    try {
      debugLog(
        `${username} answered question ${answer} in ${users[username].roomCode}`
      );
      answerQuestion(username, answer, auto);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("answer-pick-region", (username, answer) => {
    try {
      debugLog(
        `${username} answered pick region (${answer}) in ${users[username].roomCode}`
      );
      answerPickRegion(username, answer);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("answer-attack-region", (username, answer) => {
    try {
      debugLog(
        `${username} answered attack region (${answer}) in ${users[username].roomCode}`
      );
      answerAttackRegion(username, answer);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on("send-message", (messData, username) => {
    try {
      debugLog(
        `${username} sent mess ${messData.message} in ${users[username].roomCode}`
      );
      socket.to(users[username].roomCode).emit("receive-message", messData);
    } catch (error) {
      console.error(error);
    }
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING..");
  console.log("listening on port %d", server.address().port);
  console.log("----------------------");
});
