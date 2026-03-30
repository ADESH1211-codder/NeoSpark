const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const cors     = require("cors");
require("dotenv").config();

const app = express();

// ✅ CORS (allow all)
app.use(cors({
  origin: "*",
  methods: "*",
  allowedHeaders: "*"
}));

// ✅ JSON
app.use(express.json());

// 🧠 TEMP MEMORY (instead of DB for now)
let users = [];

// ✅ REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const exists = users.find(u => u.email === email);
    if (exists)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    users.push({ id: Date.now(), email, password: hashed });

    res.json({ message: "Registered successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user)
    return res.status(400).json({ message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign({ id: user.id }, "secret");

  res.json({ token });
});

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ✅ START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
