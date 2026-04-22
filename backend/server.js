require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: ["http://localhost:3000", "http://localhost:5000", "https://healtalk-4.onrender.com", "https://healtalk-5.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true
  } 
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5000", "https://healtalk-4.onrender.com", "https://healtalk-5.onrender.com"],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
const auth = require("./Routes/auth");
app.use("/api/auth", auth);

app.use("/api/users", require("./Routes/user"));
app.use("/api/chat", require("./Routes/chat"));
app.use("/api/posts", require("./Routes/post"));
app.use("/api/groups", require("./Routes/group"));
app.use("/api/notifications", require("./Routes/notification"));

app.get("/", (_req, res) => res.send("HealTalk API Running 🚀"));

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ DB Error:", err.message));

// Socket.io — real-time chat + typing + online
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user-online", (userId) => {
    onlineUsers[userId] = socket.id;
    io.emit("online-users", Object.keys(onlineUsers));
  });

  socket.on("send-message", (data) => {
    const receiverSocket = onlineUsers[data.receiverId];
    if (receiverSocket) {
      io.to(receiverSocket).emit("receive-message", data);
    }
  });

  socket.on("typing", (data) => {
    const receiverSocket = onlineUsers[data.receiverId];
    if (receiverSocket) io.to(receiverSocket).emit("typing", { senderId: data.senderId });
  });

  socket.on("stop-typing", (data) => {
    const receiverSocket = onlineUsers[data.receiverId];
    if (receiverSocket) io.to(receiverSocket).emit("stop-typing", { senderId: data.senderId });
  });

  socket.on("join-group", (groupId) => socket.join(groupId));

  socket.on("group-message", (data) => {
    io.to(data.groupId).emit("group-message", data);
  });

  socket.on("call-user", (data) => {
    const receiverSocket = onlineUsers[data.to];
    if (receiverSocket) io.to(receiverSocket).emit("incoming-call", { from: data.from, signal: data.signal });
  });

  socket.on("answer-call", (data) => {
    const receiverSocket = onlineUsers[data.to];
    if (receiverSocket) io.to(receiverSocket).emit("call-accepted", data.signal);
  });

  socket.on("disconnect", () => {
    for (const uid in onlineUsers) {
      if (onlineUsers[uid] === socket.id) {
        delete onlineUsers[uid];
        break;
      }
    }
    io.emit("online-users", Object.keys(onlineUsers));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});
