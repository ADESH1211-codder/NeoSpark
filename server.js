// server.js — Electronics Community Backend




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

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json()); 
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── UPLOADS FOLDER ──
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── MULTER — FILE STORAGE ──
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

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only images and PDF/DOC files allowed"));
  }
});

// All possible document fields
const docFields = [
  { name: "collegeIdCard",  maxCount: 1 },
  { name: "bonafideCert",   maxCount: 1 },
  { name: "govId",          maxCount: 1 },
  { name: "resume",         maxCount: 1 },
  { name: "expProof",       maxCount: 1 },
  { name: "projectProof",   maxCount: 1 },
  { name: "certProof",      maxCount: 1 },
  { name: "regCert",        maxCount: 1 },
  { name: "empIdCard",      maxCount: 1 },
  { name: "offerLetter",    maxCount: 1 },
  { name: "shopLicense",    maxCount: 1 },
  { name: "shopPhotos",     maxCount: 3 },
];

// ── AUTH MIDDLEWARE ──
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ══════════════════════════════════════
// ROUTES
// ══════════════════════════════════════

// ── REGISTER ──
app.post("/api/register", upload.fields(docFields), async (req, res) => {
  try {
    const body = req.body;
    const files = req.files || {};
    const role = body.role;

    if (!role) return res.status(400).json({ message: "Role is required" });

    // Check duplicate email
    const emailToCheck = body.email || body.officialEmail || body.companyEmail;
    if (emailToCheck) {
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(emailToCheck);
      if (existing) return res.status(400).json({ message: "Email already registered!" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Generate fake OTP (in real app, send via SMS/email)
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const phoneOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert user
    const insertUser = db.prepare(`
      INSERT INTO users (
        role, password, email_otp, phone_otp,
        full_name, email, phone,
        college_name, course, year, college_email,
        skills, experience, portfolio, linkedin,
        company_name, official_email, website, address, gst_number,
        company_email, designation,
        shop_name, owner_name, location
      ) VALUES (
        @role, @password, @emailOtp, @phoneOtp,
        @fullName, @email, @phone,
        @collegeName, @course, @year, @collegeEmail,
        @skills, @experience, @portfolio, @linkedin,
        @companyName, @officialEmail, @website, @address, @gstNumber,
        @companyEmail, @designation,
        @shopName, @ownerName, @location
      )
    `);

    const result = insertUser.run({
      role,
      password:      hashedPassword,
      emailOtp,
      phoneOtp,
      fullName:      body.fullName      || null,
      email:         emailToCheck       || null,
      phone:         body.phone         || null,
      collegeName:   body.collegeName   || null,
      course:        body.course        || null,
      year:          body.year          || null,
      collegeEmail:  body.collegeEmail  || null,
      skills:        body.skills        || null,
      experience:    body.experience    || null,
      portfolio:     body.portfolio     || null,
      linkedin:      body.linkedin      || null,
      companyName:   body.companyName   || null,
      officialEmail: body.officialEmail || null,
      website:       body.website       || null,
      address:       body.address       || null,
      gstNumber:     body.gstNumber     || null,
      companyEmail:  body.companyEmail  || null,
      designation:   body.role_title    || null,
      shopName:      body.shopName      || null,
      ownerName:     body.ownerName     || null,
      location:      body.location      || null,
    });

    const userId = result.lastInsertRowid;

    // Save documents to DB
    const insertDoc = db.prepare(`
      INSERT INTO documents (user_id, doc_type, file_name, file_path)
      VALUES (@userId, @docType, @fileName, @filePath)
    `);

    for (const [fieldName, fileArray] of Object.entries(files)) {
      for (const file of fileArray) {
        insertDoc.run({
          userId,
          docType:  fieldName,
          fileName: file.originalname,
          filePath: file.path,
        });
      }
    }

    console.log(`✅ New user registered: ${emailToCheck} (${role}) — OTP: ${emailOtp}`);

    res.json({
      message: "Account created! Pending verification.",
      userId,
      // In production NEVER send OTP in response — send via email/SMS instead
      // Only showing here for testing purposes
      testOtp: { email: emailOtp, phone: phoneOtp }
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// ── VERIFY OTP ──
app.post("/api/verify-otp", (req, res) => {
  const { userId, emailOtp, phoneOtp } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.email_otp !== emailOtp) return res.status(400).json({ message: "Wrong email OTP" });
  if (phoneOtp && user.phone_otp !== phoneOtp) return res.status(400).json({ message: "Wrong phone OTP" });

  db.prepare("UPDATE users SET otp_verified = 1 WHERE id = ?").run(userId);
  res.json({ message: "OTP verified! Account pending admin approval." });
});

// ── LOGIN ──
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Fill all fields" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(400).json({ message: "User not found!" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Wrong password!" });

  if (user.status === "pending") return res.status(403).json({ message: "Account pending admin verification." });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      id: user.id, name: user.full_name || user.company_name || user.shop_name,
      email: user.email, role: user.role, status: user.status
    }
  });
});

// ── GET ALL USERS (Admin) ──
app.get("/api/admin/users", authMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT id, role, status, full_name, email, phone, company_name, shop_name,
           skills, experience, created_at, otp_verified
    FROM users ORDER BY created_at DESC
  `).all();

  // Attach documents for each user
  const result = users.map(u => {
    const docs = db.prepare("SELECT * FROM documents WHERE user_id = ?").all(u.id);
    return { ...u, documents: docs };
  });

  res.json(result);
});

// ── APPROVE / REJECT USER (Admin) ──
app.patch("/api/admin/users/:id/status", authMiddleware, (req, res) => {
  const { status } = req.body; // "approved" or "rejected"
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ message: `User ${status} successfully` });
});

// ── DELETE USER (Admin) ──
app.delete("/api/admin/users/:id", authMiddleware, (req, res) => {
  // Delete documents first
  const docs = db.prepare("SELECT file_path FROM documents WHERE user_id = ?").all(req.params.id);
  docs.forEach(doc => { if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path); });
  db.prepare("DELETE FROM documents WHERE user_id = ?").run(req.params.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ message: "User deleted" });
});

// ── GET MY PROFILE ──
app.get("/api/profile", authMiddleware, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const docs = db.prepare("SELECT * FROM documents WHERE user_id = ?").all(req.user.id);
  const { password, email_otp, phone_otp, ...safeUser } = user;
  res.json({ ...safeUser, documents: docs });
});

// ── ADMIN LOGIN ──
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password !== "admin123") return res.status(401).json({ message: "Wrong admin password" });
  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.json({ token });
});

// ── STATS ──
app.get("/api/admin/stats", authMiddleware, (req, res) => {
  const total    = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const pending  = db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'pending'").get().c;
  const approved = db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'approved'").get().c;
  const byRole   = db.prepare("SELECT role, COUNT(*) as count FROM users GROUP BY role").all();
  res.json({ total, pending, approved, byRole });
});

// 🔥 SERVE FRONTEND BUILD (IMPORTANT)
//app.use(express.static(path.join(__dirname, "build")));

//app.get("*", (req, res) => {
//res.sendFile(path.join(__dirname, "build", "index.html"));
//});

// ── START SERVER ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Uploads folder: ${uploadsDir}`);
  console.log(`🗄️  Database: ${process.env.DB_PATH || "./database.db"}`);
  console.log(`\n📋 API Routes:`);
  console.log(`   POST /api/register       → Register new user`);
  console.log(`   POST /api/login          → User login`);
  console.log(`   POST /api/verify-otp     → Verify OTP`);
  console.log(`   POST /api/admin/login    → Admin login`);
  console.log(`   GET  /api/admin/users    → All users (admin)`);
  console.log(`   GET  /api/admin/stats    → Platform stats`);
  console.log(`   GET  /api/profile        → My profile\n`);
}); 
