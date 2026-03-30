const express = require("express");
const cors = require("cors");

const app = express();

// ✅ CORS
app.use(cors({
  origin: "*",
  methods: "*",
  allowedHeaders: "*"
}));

// ✅ JSON
app.use(express.json());

// ✅ SIMPLE MEMORY DB
let users = [];

// ✅ REGISTER
app.post("/api/register", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const exists = users.find(u => u.email === email);
  if (exists) {
    return res.status(400).json({ message: "User already exists" });
  }

  users.push({ email, password });

  res.json({ message: "Registered successfully" });
});

// ✅ LOGIN
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  if (user.password !== password) {
    return res.status(400).json({ message: "Wrong password" });
  }

  res.json({ token: "dummy-token" });
});

// ✅ TEST
app.get("/", (req, res) => {
  res.send("Backend running");
});

// ✅ START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
