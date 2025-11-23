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

// Add exercise to current workout
app.post("/api/exercise", (req, res) => {
  const { user_id, exercise, sets, reps, weight } = req.body;
  db.prepare(`
    INSERT INTO current_workout (user_id, exercise, sets, reps, weight)
    VALUES (?, ?, ?, ?, ?)
  `).run(user_id, exercise, sets, reps, weight);
  res.json({ success: true });
});

// Edit current workout exercise
app.put("/api/exercise/:id", (req, res) => {
  const { exercise, sets, reps, weight } = req.body;
  const { id } = req.params;
  const result = db.prepare(`
    UPDATE current_workout
    SET exercise = ?, sets = ?, reps = ?, weight = ?
    WHERE id = ?
  `).run(exercise, sets, reps, weight, id);
  res.json({ success: result.changes > 0 });
});

// Delete current workout exercise
app.delete("/api/exercise/:id", (req, res) => {
  const { id } = req.params;
  const result = db.prepare("DELETE FROM current_workout WHERE id = ?").run(id);
  res.json({ success: result.changes > 0 });
});

// Save current workout as a session
app.post("/api/workout", (req, res) => {
  const { user_id } = req.body;
  const exercises = db.prepare("SELECT * FROM current_workout WHERE user_id = ?").all(user_id);

  if (exercises.length === 0) return res.json({ success: false, message: "No exercises to save" });

  const sessionId = db.prepare("INSERT INTO sessions (user_id, date) VALUES (?, DATE('now'))").run(user_id).lastInsertRowid;

  const exInsert = db.prepare(`
    INSERT INTO session_exercises (session_id, exercise, sets, reps, weight)
    VALUES (?, ?, ?, ?, ?)
  `);
  exercises.forEach(ex => exInsert.run(sessionId, ex.exercise, ex.sets, ex.reps, ex.weight));

  db.prepare("DELETE FROM current_workout WHERE user_id = ?").run(user_id);
  res.json({ success: true });
});

// Edit a full session
app.put("/api/session/:session_id", (req, res) => {
  const { session_id } = req.params;
  const { exercises } = req.body; // array of {id, exercise, sets, reps, weight}
  if (!Array.isArray(exercises) || exercises.length === 0) return res.json({ success: false, message: "No exercises provided" });

  const updateStmt = db.prepare(`
    UPDATE session_exercises
    SET exercise = ?, sets = ?, reps = ?, weight = ?
    WHERE id = ? AND session_id = ?
  `);

  const info = { updated: 0, failed: 0 };
  exercises.forEach(ex => {
    const result = updateStmt.run(ex.exercise, ex.sets, ex.reps, ex.weight, ex.id, session_id);
    if (result.changes === 0) info.failed += 1;
    else info.updated += 1;
  });

  res.json({ success: true, info });
});

// Delete a full session
app.delete("/api/session/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM session_exercises WHERE session_id = ?").run(id);
  const result = db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  res.json({ success: result.changes > 0 });
});

// Get current workout
app.get("/api/current/:user_id", (req, res) => {
  const rows = db.prepare("SELECT * FROM current_workout WHERE user_id = ?").all(req.params.user_id);
  res.json(rows);
});

// Get all sessions
app.get("/api/workouts/:user_id", (req, res) => {
  const sessions = db.prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC").all(req.params.user_id);
  const exQuery = db.prepare("SELECT id, exercise, sets, reps, weight FROM session_exercises WHERE session_id = ?");
  const output = sessions.map(session => ({
    id: session.id,
    date: session.date,
    exercises: exQuery.all(session.id)
  }));
  res.json(output);
});

// ----------------------
// Start server
// ----------------------
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
