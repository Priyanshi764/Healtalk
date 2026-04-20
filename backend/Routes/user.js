const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads/")),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// --- Specific routes FIRST (before /:id) ---

// Get my profile
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Match users by disease
router.get("/match/disease", auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    if (!me.disease) return res.json([]);
    const users = await User.find({
      disease: { $regex: me.disease, $options: "i" },
      _id: { $ne: req.userId }
    }).select("-password").limit(20);
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Search users
router.get("/search/query", auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
        { disease: { $regex: q, $options: "i" } }
      ]
    }).select("-password").limit(15);
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Leaderboard
router.get("/leaderboard/top", auth, async (req, res) => {
  try {
    const users = await User.find().sort({ rating: -1 }).limit(10).select("-password");
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update profile
router.put("/update", auth, async (req, res) => {
  try {
    const { name, bio, disease } = req.body;
    const user = await User.findByIdAndUpdate(req.userId, { name, bio, disease }, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload photo
router.post("/photo", auth, upload.single("photo"), async (req, res) => {
  try {
    const photoUrl = "/uploads/" + req.file.filename;
    const user = await User.findByIdAndUpdate(req.userId, { photo: photoUrl }, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Follow user
router.post("/follow/:id", auth, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (!target.followers.map(String).includes(req.userId)) {
      await User.findByIdAndUpdate(req.params.id, { $push: { followers: req.userId } });
      await User.findByIdAndUpdate(req.userId, { $push: { following: req.params.id } });
      await Notification.create({ userId: req.params.id, fromUser: req.userId, type: "follow", message: "started following you" });
    }
    res.json({ message: "Followed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Unfollow user
router.post("/unfollow/:id", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.userId } });
    await User.findByIdAndUpdate(req.userId, { $pull: { following: req.params.id } });
    res.json({ message: "Unfollowed" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Rate user
router.post("/rate/:id", auth, async (req, res) => {
  try {
    const { rating } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found" });
    const newCount = target.ratingCount + 1;
    const newRating = ((target.rating * target.ratingCount) + Number(rating)) / newCount;
    await User.findByIdAndUpdate(req.params.id, { rating: parseFloat(newRating.toFixed(1)), ratingCount: newCount });
    res.json({ message: "Rated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Block user
router.post("/block/:id", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $addToSet: { blockedUsers: req.params.id } });
    res.json({ message: "Blocked" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Wildcard LAST ---

// Get user by id
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
