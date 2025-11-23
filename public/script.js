const userId = 1;

// ---------- Add Exercise ----------
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
    body: JSON.stringify({ user_id: userId, exercise, sets, reps, weight })
  });

  document.getElementById("workoutForm").reset();
  loadCurrentWorkout();
});

// ---------- Clear Current Workout ----------
document.getElementById("clear-current").addEventListener("click", async () => {
  const exercises = await (await fetch(`/api/current/${userId}`)).json();
  for (let ex of exercises) {
    await fetch(`/api/exercise/${ex.id}`, { method: "DELETE" });
  }
  loadCurrentWorkout();
});

// ---------- Save Workout ----------
document.getElementById("save-workout").addEventListener("click", async () => {
  const res = await fetch("/api/workout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId })
  });

  const data = await res.json();
  if (!data.success) return alert("Nothing to save!");
  loadCurrentWorkout();
  loadHistory();
});

// ---------- Load Current Workout ----------
async function loadCurrentWorkout() {
  const list = document.getElementById("workoutList");
  list.innerHTML = "";

  const exercises = await (await fetch(`/api/current/${userId}`)).json();

  exercises.forEach(ex => {
    const li = document.createElement("li");
    li.textContent = `${ex.exercise} - ${ex.sets}x${ex.reps} @ ${ex.weight}kg`;

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("edit-btn");
    editBtn.onclick = () => openEditModal(ex, "current");


    // Delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.classList.add("delete-btn");
    delBtn.onclick = async () => {
      await fetch(`/api/exercise/${ex.id}`, { method: "DELETE" });
      loadCurrentWorkout();
    };

    li.appendChild(editBtn);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// ---------- Load Workout History ----------
async function loadHistory() {
  const historyList = document.getElementById("history-list");
  historyList.innerHTML = "";

  const sessions = await (await fetch(`/api/workouts/${userId}`)).json();

  sessions.forEach(session => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>Session: ${session.date}</strong>`;

    // Delete entire session
    const delSessionBtn = document.createElement("button");
    delSessionBtn.textContent = "Delete Session";
    delSessionBtn.classList.add("delete-btn");
    delSessionBtn.onclick = async () => {
      await fetch(`/api/session/${session.id}`, { method: "DELETE" });
      loadHistory();
    };
    li.appendChild(delSessionBtn);

    const ul = document.createElement("ul");

    session.exercises.forEach(ex => {
      const item = document.createElement("li");
      item.textContent = `${ex.exercise} - ${ex.sets}x${ex.reps} @ ${ex.weight}kg`;

      // Edit individual exercise in session
      const editExBtn = document.createElement("button");
      editExBtn.textContent = "Edit";
      editExBtn.classList.add("edit-btn");
      editExBtn.onclick = () => openEditModal(ex, "session", session.id);

      item.appendChild(editExBtn);
      ul.appendChild(item);
    });

    li.appendChild(ul);
    historyList.appendChild(li);
  });
}

let currentEdit = null; // store the exercise being edited

const modal = document.getElementById("edit-modal");
const editForm = document.getElementById("edit-form");
const cancelEditBtn = document.getElementById("cancel-edit");
const editExerciseName = document.getElementById("edit-exercise-name");
const editSets = document.getElementById("edit-sets");
const editReps = document.getElementById("edit-reps");
const editWeight = document.getElementById("edit-weight");

// ---------- Open Modal ----------
function openEditModal(ex, type, sessionId = null) {
  currentEdit = { ...ex, type, sessionId }; // store type: 'current' or 'session'

  editExerciseName.value = ex.exercise;
  editSets.value = ex.sets;
  editReps.value = ex.reps;
  editWeight.value = ex.weight;

  modal.style.display = "flex";
}

// ---------- Close Modal ----------
function closeEditModal() {
  modal.style.display = "none";
  currentEdit = null;
}

// ---------- Cancel Button ----------
cancelEditBtn.addEventListener("click", closeEditModal);

// ---------- Save Edited Exercise ----------
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentEdit) return;

  const updated = {
    exercise: editExerciseName.value.trim(),
    sets: parseInt(editSets.value),
    reps: parseInt(editReps.value),
    weight: parseFloat(editWeight.value)
  };

  if (currentEdit.type === "current") {
    await fetch(`/api/exercise/${currentEdit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    loadCurrentWorkout();
  } else if (currentEdit.type === "session") {
    await fetch(`/api/session/${currentEdit.sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercises: [{ ...currentEdit, ...updated }] })
    });
    loadHistory();
  }

  closeEditModal();
});


// ---------- Initial Load ----------
loadCurrentWorkout();
loadHistory();
