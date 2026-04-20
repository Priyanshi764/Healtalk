const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

// Get my notifications
router.get("/", auth, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate("fromUser", "name photo username")
      .limit(30);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
router.put("/read", auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId }, { isRead: true });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unread count
router.get("/unread/count", auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.userId, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
