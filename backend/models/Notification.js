const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["message", "follow", "like", "comment", "request"] },
  message: { type: String, default: "" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
