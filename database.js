// database.js — SQLite setup with all tables

const Database = require("better-sqlite3");
const path = require("path");
require("dotenv").config();

const db = new Database(process.env.DB_PATH || "./database.db");

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// ── CREATE TABLES ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    role        TEXT NOT NULL,
    status      TEXT DEFAULT 'pending',
    password    TEXT NOT NULL,
    email_otp   TEXT,
    phone_otp   TEXT,
    otp_verified INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now')),

    -- Common fields
    full_name   TEXT,
    email       TEXT UNIQUE,
    phone       TEXT,

    -- Student
    college_name  TEXT,
    course        TEXT,
    year          TEXT,
    college_email TEXT,

    -- Engineer / Expert
    skills       TEXT,
    experience   TEXT,
    portfolio    TEXT,
    linkedin     TEXT,

    -- Company
    company_name    TEXT,
    official_email  TEXT,
    website         TEXT,
    address         TEXT,
    gst_number      TEXT,

    -- Employee
    company_email   TEXT,
    designation     TEXT,

    -- Vendor
    shop_name   TEXT,
    owner_name  TEXT,
    location    TEXT
  );

  CREATE TABLE IF NOT EXISTS documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    doc_type    TEXT NOT NULL,
    file_name   TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    uploaded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

console.log("✅ Database ready — tables created");

module.exports = db;
