const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads/")),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Create post
router.post("/create", auth, upload.single("image"), async (req, res) => {
  try {
    const { content, disease } = req.body;
    const imageUrl = req.file ? "/uploads/" + req.file.filename : "";
    const post = await Post.create({ userId: req.userId, content, disease: disease || "", imageUrl });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all posts (feed)
router.get("/feed", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate("userId", "name photo username disease").limit(50);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get posts by disease
router.get("/disease/:disease", auth, async (req, res) => {
  try {
    const posts = await Post.find({ disease: { $regex: req.params.disease, $options: "i" } })
      .sort({ createdAt: -1 }).populate("userId", "name photo username disease");
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like / Unlike post
router.post("/like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    const liked = post.likes.includes(req.userId);
    if (liked) {
      await Post.findByIdAndUpdate(req.params.id, { $pull: { likes: req.userId } });
    } else {
      await Post.findByIdAndUpdate(req.params.id, { $push: { likes: req.userId } });
    }
    res.json({ liked: !liked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comment on post
router.post("/comment/:id", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { userId: req.userId, text } } },
      { new: true }
    ).populate("comments.userId", "name photo");
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete post
router.delete("/:id", auth, async (req, res) => {
  try {
    await Post.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
