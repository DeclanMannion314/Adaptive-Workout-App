// Add exercise to current workout
document.getElementById("add-workout").addEventListener("click", () => {
  const exercise = document.getElementById("exercise-name").value.trim();
  const sets = parseInt(document.getElementById("sets").value);
  const reps = parseInt(document.getElementById("reps").value);
  const weight = parseFloat(document.getElementById("weight").value);

  if (!exercise || !sets || !reps || !weight) {
    alert("Please fill in all fields!");
    return;
  }

  // Get current workout from localStorage or start empty
  const currentWorkout = JSON.parse(localStorage.getItem("currentWorkout")) || [];
  currentWorkout.push({ exercise, sets, reps, weight });
  localStorage.setItem("currentWorkout", JSON.stringify(currentWorkout));

  // Clear inputs
  document.getElementById("workoutForm").reset();

  // Update current workout display
  showCurrentWorkout();
});

// Save current workout as a session
document.getElementById("save-workout").addEventListener("click", () => {
  const currentWorkout = JSON.parse(localStorage.getItem("currentWorkout")) || [];
  if (!currentWorkout.length) {
    alert("Add exercises before saving!");
    return;
  }

  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  sessions.push({ date: new Date().toLocaleDateString(), exercises: currentWorkout });
  localStorage.setItem("sessions", JSON.stringify(sessions));

  // Clear current workout
  localStorage.removeItem("currentWorkout");

  // Update displays
  showCurrentWorkout();
  showHistory();
});

// Display current workout
function showCurrentWorkout() {
  const list = document.getElementById("workoutList");
  list.innerHTML = "";

  const currentWorkout = JSON.parse(localStorage.getItem("currentWorkout")) || [];
  currentWorkout.forEach((ex) => {
    const li = document.createElement("li");
    li.textContent = `${ex.exercise} - ${ex.sets}x${ex.reps} @ ${ex.weight}kg`;
    list.appendChild(li);
  });
}

// Display workout history
function showHistory() {
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";

  const sessions = JSON.parse(localStorage.getItem("sessions")) || [];
  sessions.forEach((session) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${session.date}</strong>`;

    const ul = document.createElement("ul");
    session.exercises.forEach((ex) => {
      const exLi = document.createElement("li");
      exLi.textContent = `${ex.exercise} - ${ex.sets}x${ex.reps} @ ${ex.weight}kg`;
      ul.appendChild(exLi);
    });

    li.appendChild(ul);
    historyList.appendChild(li);
  });
}

// Initial display
showCurrentWorkout();
showHistory();
