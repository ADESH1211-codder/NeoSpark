// server.js — CLEAN FINAL VERSION

const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const cors     = require("cors");
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
require("dotenv").config();

const db = require("./database");

const app = express();

// ✅ CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ JSON
app.use(express.json());

// ✅ Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── CREATE UPLOAD FOLDER ──
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── MULTER SETUP ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userFolder = path.join(uploadsDir, `user_${Date.now()}`);
    if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });
    req.uploadFolder = userFolder;
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    const safeName = file.fieldname + "_" + Date.now() + path.extname(file.originalname);
    cb(null, safeName);
  }
});

const upload = multer({ storage });

// ── AUTH MIDDLEWARE ──
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ═══════════════════════
// ROUTES
// ═══════════════════════

// ✅ REGISTER
app.post("/api/register", upload.any(), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (existing)
      return res.status(400).json({ message: "Email exists" });

    const hash = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO users (email, password, status)
      VALUES (?, ?, 'pending')
    `).run(email, hash);

    res.json({ message: "Registered", userId: result.lastInsertRowid });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (!user) return res.status(400).json({ message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

  res.json({ token });
});

// ✅ PROFILE
app.get("/api/profile", authMiddleware, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  res.json(user);
});

// ── START SERVER ──
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
