const Database = require("better-sqlite3");
const db = new Database("./data/workouts.db");

// Create user table
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );
`).run();

// Create workouts table
db.prepare(`
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    exercise TEXT,
    weight INTEGER,
    sets INTEGER,
    reps INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`).run();

console.log("Database initialized!");
