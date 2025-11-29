let dynamicChart;
let maxWeightChartInstance;

// Get the current user logged in.
async function getLoggedInUser() {
  try {
    const res = await fetch("/api/profile");
    const data = await res.json();
    if (data.success) return data.user.id;

    alert("Not logged in. Redirecting to login...");
    window.location.href = "/login.html";
    return null;

  } catch (err) {
    console.error("Failed to fetch user info:", err);
    return null;
  }
}

// Dashboard functions
async function initDashboard() {
  const userId = await getLoggedInUser();
  if (!userId) return;

  const totalWorkoutsEl = document.getElementById("total-workouts");
  const totalExercisesEl = document.getElementById("total-exercises");
  const topExerciseEl = document.getElementById("top-exercise");
  const sessionListEl = document.getElementById("session-list");
  const chartSelector = document.getElementById("chartTypeSelector");
  const exerciseSelector = document.getElementById("exerciseSelector");

  const workouts = await loadWorkouts(userId);

  updateDashboardStats(workouts);
  populateSessions(workouts);

  // Populate Exercise Dropdown
  const exerciseSet = new Set();
  workouts.forEach(w => w.exercises.forEach(e => exerciseSet.add(e.exercise)));
  exerciseSet.forEach(ex => {
    const option = document.createElement("option");
    option.value = ex;
    option.textContent = ex;
    exerciseSelector.appendChild(option);
  });

  renderDynamicChart(workouts, chartSelector.value);
  renderMaxWeightChart(workouts, "all");

  chartSelector.addEventListener("change", () => {
    renderDynamicChart(workouts, chartSelector.value);
  });

  exerciseSelector.addEventListener("change", () => {
    renderMaxWeightChart(workouts, exerciseSelector.value);
  });
}

// Load Workouts
async function loadWorkouts(userId) {
  try {
    const res = await fetch(`/api/workouts/${userId}`);
    return await res.json();
  } catch (err) {
    console.error("Error loading workouts:", err);
    return [];
  }
}

// Dashboard Stats
function updateDashboardStats(workouts) {
  document.getElementById("total-workouts").textContent = workouts.length;

  const allExercises = workouts.flatMap(w => w.exercises.map(e => e.exercise));
  document.getElementById("total-exercises").textContent = allExercises.length;

  const counts = {};
  allExercises.forEach(ex => counts[ex] = (counts[ex] || 0) + 1);

  const top = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "N/A");
  document.getElementById("top-exercise").textContent = top;
}

// Populate Sessions for user to look back on
// Click to expand feature
function populateSessions(workouts) {
  const list = document.getElementById("session-list");
  list.innerHTML = "";

  workouts.forEach((session) => {
    const li = document.createElement("li");
    const date = new Date(session.date).toLocaleDateString();

    li.textContent = `${date} - ${session.exercises.length} exercises`;

    const details = document.createElement("div");
    details.classList.add("session-details");
    details.style.display = "none";

    details.innerHTML = session.exercises
      .map(e => `<p><strong>${e.exercise}</strong>: ${e.sets} x ${e.reps} @ ${e.weight}kg</p>`)
      .join("");

    li.addEventListener("click", () => {
      details.style.display = details.style.display === "none" ? "block" : "none";
    });

    li.appendChild(details);
    list.appendChild(li);
  });
}

// Dynamic Chart
function renderDynamicChart(workouts, type) {
  if (dynamicChart) dynamicChart.destroy();

  let labels = [];
  let data = [];
  let bgColor = "rgba(122, 158, 159, 0.7)";

  if (type === "day") {
    const daily = {};
    workouts.forEach(w => {
      const key = new Date(w.date).toISOString().slice(0, 10);
      let volume = w.exercises.reduce((sum, e) => sum + e.sets * e.reps * e.weight, 0);
      daily[key] = (daily[key] || 0) + volume;
    });
    labels = Object.keys(daily).sort();
    data = labels.map(k => daily[k]);

  } else if (type === "week" || type === "month") {
    const aggregate = {};
    workouts.forEach(w => {
      const d = new Date(w.date);
      let key;

      if (type === "week") {
        d.setDate(d.getDate() - d.getDay());
        key = d.toISOString().slice(0, 10);
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      }

      let volume = w.exercises.reduce((s,e)=>s+e.sets*e.reps*e.weight,0);
      aggregate[key] = (aggregate[key] || 0) + volume;
    });

    labels = Object.keys(aggregate).sort();
    data = labels.map(k => aggregate[k]);

  } else if (type === "muscle") {
    const muscleMap = {
      "Bench Press": "Chest",
      "Squat": "Legs",
      "Deadlift": "Back",
      "Shoulder Press": "Shoulders",
      "Bicep Curl": "Arms",
      "Tricep Extension": "Arms",
      "Plank": "Core",
      "Crunch": "Core"
    };

    const counts = {};
    workouts.forEach(w =>
      w.exercises.forEach(e => {
        const m = muscleMap[e.exercise] || "Other";
        counts[m] = (counts[m] || 0) + (e.sets * e.reps);
      })
    );

    labels = Object.keys(counts);
    data = labels.map(k => counts[k]);
    bgColor = "rgba(254, 95, 85, 0.7)";
  }

  const ctx = document.getElementById("dynamicChart").getContext("2d");
  dynamicChart = new Chart(ctx, {
    type: type === "muscle" ? "pie" : "bar",
    data: {
      labels,
      datasets: [{
        label: type === "muscle" ? "Total Reps per Muscle" : "Total Volume (kg)",
        data,
        backgroundColor: bgColor
      }]
    },
    options: {
      scales: type === "muscle" ? {} : { y: { beginAtZero: true } }
    }
  });
}

// Max Weight by Rep Range (with exercise filter)
function renderMaxWeightChart(workouts, exercise) {
  const repRanges = [1, 3, 5, 8];
  const maxWeights = {1:0, 3:0, 5:0, 8:0};

  workouts.forEach(w => {
    w.exercises.forEach(e => {
      if ((exercise === "all" || e.exercise === exercise) && repRanges.includes(e.reps)) {
        maxWeights[e.reps] = Math.max(maxWeights[e.reps], e.weight);
      }
    });
  });

  const ctx = document.getElementById("maxWeightChart").getContext("2d");

  if (maxWeightChartInstance) maxWeightChartInstance.destroy();

  maxWeightChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: repRanges.map(r => `${r} Rep${r>1?"s":""}`),
      datasets: [{
        label: exercise === "all" ? "Max Weight (kg)" : `Max Weight - ${exercise}`,
        data: repRanges.map(r => maxWeights[r]),
        backgroundColor: "rgba(254, 95, 85, 0.7)",
        borderColor: "rgba(254, 95, 85, 1)",
        borderWidth: 1
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}

initDashboard();
