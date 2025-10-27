const workouts = JSON.parse(localStorage.getItem("workouts")) || [];

document.getElementById("add-workout").addEventListener("click", () => {
  const exercise = document.getElementById("exercise-name").value;
  const sets = parseInt(document.getElementById("sets").value);
  const reps = parseInt(document.getElementById("reps").value);
  const weight = parseFloat(document.getElementById("weight").value);

  const newWorkout = { exercise, sets, reps, weight, date: new Date().toLocaleDateString() };
  workouts.push(newWorkout);
  localStorage.setItem("workouts", JSON.stringify(workouts));

  renderHistory();
});

function renderHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "";
  workouts.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = `${w.date}: ${w.exercise} - ${w.sets}x${w.reps} @ ${w.weight}kg`;
    list.appendChild(li);
  });
}

renderHistory();
