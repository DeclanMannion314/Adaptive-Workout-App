// Add exercise to current workout
document.getElementById("add-workout").addEventListener("click", async () => {
  const exercise = document.getElementById("exercise-name").value.trim();
  const sets = parseInt(document.getElementById("sets").value);
  const reps = parseInt(document.getElementById("reps").value);
  const weight = parseFloat(document.getElementById("weight").value);

  if (!exercise || !sets || !reps || !weight) {
    alert("Please fill out all fields");
    return;
  }

  await fetch("/api/exercise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: 1,
      exercise,
      sets,
      reps,
      weight
    })
  });

  document.getElementById("workoutForm").reset();

  loadCurrentWorkout();
});

// Save workout session
document.getElementById("save-workout").addEventListener("click", async () => {
  const res = await fetch("/api/workout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: 1 })
  });

  const data = await res.json();

  if (!data.success) {
    alert("Nothing to save!");
    return;
  }

  loadCurrentWorkout();
  loadHistory();
});

// Load current workout
async function loadCurrentWorkout() {
  const list = document.getElementById("workoutList");
  list.innerHTML = "";

  const res = await fetch("/api/current/1");
  const exercises = await res.json();

  exercises.forEach(ex => {
    const li = document.createElement("li");
    li.textContent = `${ex.exercise} - ${ex.sets}x${ex.reps} @ ${ex.weight}kg`;
    list.appendChild(li);
  });
}

// Load workout history
async function loadHistory() {
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";

  const res = await fetch("/api/workouts/1");
  const sessions = await res.json();

  sessions.forEach(session => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${session.date}</strong>`;

    const ul = document.createElement("ul");

    session.exercises.forEach(ex => {
      const item = document.createElement("li");
      item.textContent = `${ex.exercise} - ${ex.sets}x${ex.reps} @ ${ex.weight}kg`;
      ul.appendChild(item);
    });

    li.appendChild(ul);
    historyList.appendChild(li);
  });
}

// Initial load
loadCurrentWorkout();
loadHistory();
