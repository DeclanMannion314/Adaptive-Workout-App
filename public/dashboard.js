let dynamicChart; // Chart.js instance for dynamic chart

// ----------------------------
// Get Current Logged-in User
// ----------------------------
async function getLoggedInUser() {
  try {
    const res = await fetch("/api/profile");
    const data = await res.json();
    if (data.success) return data.user.id;
    else {
      alert("Not logged in. Redirecting to login page.");
      window.location.href = "/login.html"; // redirect to login page
      return null;
    }
  } catch (err) {
    console.error("Failed to fetch user info:", err);
    return null;
  }
}

// ----------------------------
// Initialize Dashboard
// ----------------------------
async function initDashboard() {
  const userId = await getLoggedInUser();
  if (!userId) return;

  const totalWorkoutsEl = document.getElementById("total-workouts");
  const totalExercisesEl = document.getElementById("total-exercises");
  const topExerciseEl = document.getElementById("top-exercise");
  const sessionListEl = document.getElementById("session-list");
  const chartSelector = document.getElementById("chartTypeSelector");

  // ----------------------------
  // Load Workouts
  // ----------------------------
  async function loadWorkouts() {
    try {
      const res = await fetch(`/api/workouts/${userId}`);
      const workouts = await res.json();
      return workouts;
    } catch (err) {
      console.error("Error loading workouts:", err);
      return [];
    }
  }

  const workouts = await loadWorkouts();

  updateDashboardStats(workouts);
  populateSessions(workouts);
  renderDynamicChart(workouts, chartSelector.value);
  renderMaxWeightChart(workouts);

  chartSelector.addEventListener("change", () => {
    renderDynamicChart(workouts, chartSelector.value);
  });

  // ----------------------------
  // Dashboard Stats
  // ----------------------------
  function updateDashboardStats(workouts) {
    totalWorkoutsEl.textContent = workouts.length;

    const allExercises = [];
    workouts.forEach(w => w.exercises.forEach(e => allExercises.push(e.exercise)));
    totalExercisesEl.textContent = allExercises.length;

    const counts = {};
    allExercises.forEach(name => counts[name] = (counts[name] || 0) + 1);
    const topExercise = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "N/A");
    topExerciseEl.textContent = topExercise;
  }

  // ----------------------------
  // Populate Sessions
  // ----------------------------
  function populateSessions(workouts) {
    sessionListEl.innerHTML = "";
    workouts.forEach(session => {
      const li = document.createElement("li");
      const date = new Date(session.date).toLocaleDateString();
      li.textContent = `${date} - ${session.exercises.length} exercises`;
      sessionListEl.appendChild(li);
    });
  }

  // ----------------------------
  // Dynamic Chart
  // ----------------------------
  function renderDynamicChart(workouts, type) {
    if (dynamicChart) dynamicChart.destroy();

    let labels = [];
    let data = [];
    let bgColor = "rgba(122, 158, 159, 0.7)";

    if (type === "day") {
      const daily = {};
      workouts.forEach(w => {
        const dateKey = new Date(w.date).toISOString().slice(0, 10);
        let volume = 0;
        w.exercises.forEach(e => volume += e.sets * e.reps * e.weight);
        daily[dateKey] = (daily[dateKey] || 0) + volume;
      });
      labels = Object.keys(daily).sort();
      data = labels.map(k => daily[k]);
    } else if (type === "week" || type === "month") {
      const aggregate = {};
      workouts.forEach(w => {
        const date = new Date(w.date);
        let key;
        if (type === "week") {
          date.setDate(date.getDate() - date.getDay());
          key = date.toISOString().slice(0, 10);
        } else {
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
        }
        let volume = 0;
        w.exercises.forEach(e => volume += e.sets * e.reps * e.weight);
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
      workouts.forEach(w => {
        w.exercises.forEach(e => {
          const muscle = muscleMap[e.exercise] || "Other";
          counts[muscle] = (counts[muscle] || 0) + e.sets * e.reps;
        });
      });
      labels = Object.keys(counts);
      data = labels.map(k => counts[k]);
      bgColor = "rgba(254, 95, 85, 0.7)";
    }

    const ctx = document.getElementById("dynamicChart").getContext("2d");
    dynamicChart = new Chart(ctx, {
      type: type === "muscle" ? "pie" : "bar",
      data: {
        labels: labels,
        datasets: [{
          label: type === "muscle" ? "Total Reps per Muscle Group" : "Total Volume (kg)",
          data: data,
          backgroundColor: bgColor,
          borderColor: bgColor,
          borderWidth: 1
        }]
      },
      options: {
        scales: type === "muscle" ? {} : { y: { beginAtZero: true } }
      }
    });
  }

  // ----------------------------
  // Max Weight by Rep Range Chart
  // ----------------------------
  function renderMaxWeightChart(workouts) {
    const repRanges = [1, 3, 5, 8];
    const maxWeights = {1:0,3:0,5:0,8:0};

    workouts.forEach(w => {
      w.exercises.forEach(e => {
        if (repRanges.includes(e.reps)) maxWeights[e.reps] = Math.max(maxWeights[e.reps], e.weight);
      });
    });

    const ctx = document.getElementById("maxWeightChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: repRanges.map(r => `${r} Rep${r>1?'s':''}`),
        datasets: [{
          label: "Max Weight (kg)",
          data: repRanges.map(r => maxWeights[r]),
          backgroundColor: "rgba(254, 95, 85, 0.7)",
          borderColor: "rgba(254, 95, 85, 1)",
          borderWidth: 1
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }
}

// ----------------------------
// Start
// ----------------------------
initDashboard();
