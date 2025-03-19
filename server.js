import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

let activeUsers = {}; // Store active users
let ongoingCalls = {}; // Store active calls

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (user) => {
    activeUsers[user.uid] = {
      uid: user.uid,
      name: user.name,
      profilePic: user.profilePic,
      language: user.language,
      status: user.status,
      socketId: socket.id,
    };
  
    console.log("Active users after join:", activeUsers);
  
    io.emit("updateUsers", Object.values(activeUsers));
  });

  socket.on("startCall", ({ callerId, receiverId, signal }) => {
    console.log("Caller details:", activeUsers[callerId]);
    
    if (activeUsers[receiverId] && activeUsers[callerId]) {
      activeUsers[callerId].status = "Busy";
      activeUsers[receiverId].status = "Busy";
  
      ongoingCalls[callerId] = receiverId;
      ongoingCalls[receiverId] = callerId;
  
      io.emit("updateUsers", Object.values(activeUsers));
  
      io.to(activeUsers[receiverId].socketId).emit("incomingCall", {
        callerId,
        callerName: activeUsers[callerId].name,
        callerProfilePic: activeUsers[callerId].profilePic,
        signal
      });
    }
  });
  

  socket.on("acceptCall", ({ callerId, signal }) => {
    if (activeUsers[callerId]) {
      io.to(activeUsers[callerId].socketId).emit("callAccepted", { signal });
    }
  });

  socket.on("callRejected", ({ callerId }) => {
    if (activeUsers[callerId]) {
      io.to(activeUsers[callerId].socketId).emit("callEnded");
      activeUsers[callerId].status = "Available";
      delete ongoingCalls[callerId];
      delete ongoingCalls[activeUsers[callerId]?.receiverId];
      io.emit("updateUsers", Object.values(activeUsers));
    }
  });

  socket.on("endCall", ({ callerId }) => {
    const receiverId = ongoingCalls[callerId];
    
    if (receiverId && activeUsers[receiverId]) {
        io.to(activeUsers[receiverId].socketId).emit("callEnded");
        activeUsers[receiverId].status = "Available";
    }
    
    if (activeUsers[callerId]) {
        activeUsers[callerId].status = "Available";
        io.to(activeUsers[callerId].socketId).emit("callEnded");
    }
    
    delete ongoingCalls[callerId];
    delete ongoingCalls[receiverId];

    io.emit("updateUsers", Object.values(activeUsers));
});
 

socket.on("disconnect", () => {
  let disconnectedUserId = null;

  Object.keys(activeUsers).forEach((uid) => {
      if (activeUsers[uid].socketId === socket.id) {
          disconnectedUserId = uid;
      }
  });

  if (disconnectedUserId) {
      const receiverId = ongoingCalls[disconnectedUserId];
      if (receiverId && activeUsers[receiverId]) {
          io.to(activeUsers[receiverId].socketId).emit("callEnded");
          activeUsers[receiverId].status = "Available";
      }

      delete activeUsers[disconnectedUserId];
      delete ongoingCalls[disconnectedUserId];
      delete ongoingCalls[receiverId];

      io.emit("updateUsers", Object.values(activeUsers));
  }
});

});

server.listen(8000, () => console.log("Server running on port 8000"));