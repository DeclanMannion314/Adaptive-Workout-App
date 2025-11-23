const express = require("express");
const Database = require("better-sqlite3");
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = new Database("./data/workouts.db");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ----------------------
// DATABASE SETUP
// ----------------------
db.prepare(`
  CREATE TABLE IF NOT EXISTS current_workout (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    exercise TEXT,
    sets INTEGER,
    reps INTEGER,
    weight REAL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS session_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    exercise TEXT,
    sets INTEGER,
    reps INTEGER,
    weight REAL
  )
`).run();

// ----------------------
// API ROUTES
// ----------------------

// 1️⃣ Add exercise to current workout
app.post("/api/exercise", (req, res) => {
  const { user_id, exercise, sets, reps, weight } = req.body;

  const stmt = db.prepare(`
    INSERT INTO current_workout (user_id, exercise, sets, reps, weight)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(user_id, exercise, sets, reps, weight);

  res.json({ success: true });
});

// 2️⃣ Save the current workout as a session
app.post("/api/workout", (req, res) => {
  const { user_id } = req.body;

  const exercises = db
    .prepare("SELECT * FROM current_workout WHERE user_id = ?")
    .all(user_id);

  if (exercises.length === 0) {
    return res.json({ success: false, message: "No exercises to save" });
  }

  // Insert session
  const sessionInsert = db.prepare(`
    INSERT INTO sessions (user_id, date)
    VALUES (?, DATE('now'))
  `);

  const result = sessionInsert.run(user_id);
  const sessionId = result.lastInsertRowid;

  // Insert exercises into session_exercises
  const exInsert = db.prepare(`
    INSERT INTO session_exercises (session_id, exercise, sets, reps, weight)
    VALUES (?, ?, ?, ?, ?)
  `);

  exercises.forEach((ex) => {
    exInsert.run(sessionId, ex.exercise, ex.sets, ex.reps, ex.weight);
  });

  // Clear current workout
  db.prepare("DELETE FROM current_workout WHERE user_id = ?").run(user_id);

  res.json({ success: true });
});

// 3️⃣ Get current workout
app.get("/api/current/:user_id", (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM current_workout WHERE user_id = ?
  `).all(req.params.user_id);

  res.json(rows);
});

// 4️⃣ Get all sessions (grouped)
app.get("/api/workouts/:user_id", (req, res) => {
  const sessions = db.prepare(`
    SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC
  `).all(req.params.user_id);

  const output = [];

  const exQuery = db.prepare(`
    SELECT exercise, sets, reps, weight
    FROM session_exercises
    WHERE session_id = ?
  `);

  sessions.forEach((session) => {
    const exercises = exQuery.all(session.id);

    output.push({
      date: session.date,
      exercises
    });
  });

  res.json(output);
});

// ----------------------
// Start server
// ----------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
