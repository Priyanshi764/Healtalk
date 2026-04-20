const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const auth = require("../middleware/authMiddleware");

// Create group
router.post("/create", auth, async (req, res) => {
  try {
    const { name, disease } = req.body;
    const group = await Group.create({ name, disease, members: [req.userId] });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all groups
router.get("/all", auth, async (req, res) => {
  try {
    const groups = await Group.find().populate("members", "name photo username");
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get groups by disease
router.get("/disease/:disease", auth, async (req, res) => {
  try {
    const groups = await Group.find({ disease: { $regex: req.params.disease, $options: "i" } })
      .populate("members", "name photo username");
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join group
router.post("/join/:id", auth, async (req, res) => {
  try {
    await Group.findByIdAndUpdate(req.params.id, { $addToSet: { members: req.userId } });
    res.json({ message: "Joined" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message in group
router.post("/message/:id", auth, async (req, res) => {
  try {
    const { message } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $push: { messages: { senderId: req.userId, message } } },
      { new: true }
    ).populate("messages.senderId", "name photo");
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get group messages
router.get("/messages/:id", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("messages.senderId", "name photo username");
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
