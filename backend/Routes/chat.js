const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads/")),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- Specific routes FIRST ---

// Get all conversations (inbox)
router.get("/inbox/list", auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [{ senderId: req.userId }, { receiverId: req.userId }]
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "name photo username")
      .populate("receiverId", "name photo username");

    const seen = new Set();
    const inbox = [];
    for (const c of chats) {
      const sid = c.senderId?._id?.toString();
      const rid = c.receiverId?._id?.toString();
      const otherId = sid === req.userId ? rid : sid;
      if (otherId && !seen.has(otherId)) {
        seen.add(otherId);
        inbox.push(c);
      }
    }
    res.json(inbox);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Send text message
router.post("/send", auth, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    if (!receiverId || !message) return res.status(400).json({ error: "receiverId and message required" });
    const chat = await Chat.create({ senderId: req.userId, receiverId, message, fileType: "text" });
    await Notification.create({ userId: receiverId, fromUser: req.userId, type: "message", message: "sent you a message" });
    res.json(chat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Send file/image/voice
router.post("/send-file", auth, upload.single("file"), async (req, res) => {
  try {
    const { receiverId, fileType } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = "/uploads/" + req.file.filename;
    const chat = await Chat.create({ senderId: req.userId, receiverId, fileUrl, fileType: fileType || "file" });
    res.json(chat);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Wildcard LAST ---

// Get messages between 2 users
router.get("/:receiverId", auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [
        { senderId: req.userId, receiverId: req.params.receiverId },
        { senderId: req.params.receiverId, receiverId: req.userId }
      ]
    }).sort({ createdAt: 1 });
    await Chat.updateMany(
      { senderId: req.params.receiverId, receiverId: req.userId, isRead: false },
      { isRead: true }
    );
    res.json(chats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
