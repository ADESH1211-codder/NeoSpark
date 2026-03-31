const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(cors());
app.use(express.json());

// DATABASE
const db = new sqlite3.Database("./database.db");

// CREATE TABLE
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )
`);

// REGISTER
app.post("/api/register", (req, res) => {
  const data = req.body;

  const query = `INSERT INTO users (email, password) VALUES (?, ?)`;

  db.run(query, [data.email, data.password], function (err) {
    if (err) {
      return res.status(400).json({ message: "User exists" });
    }

    res.json({ message: "Registered successfully" });
  });
});

// LOGIN
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const query = `SELECT * FROM users WHERE email=? AND password=?`;

  db.get(query, [email, password], (err, row) => {
    if (!row) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    res.json({ message: "Login successful" });
  });
});

// START
const PORT = 5000;

app.listen(PORT, () => {
  console.log("Server running on port 5000");
});
