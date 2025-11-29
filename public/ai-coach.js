document.addEventListener("DOMContentLoaded", async () => {
  const exerciseSelect = document.getElementById("exercise-selector");
  const goalSelect = document.getElementById("goal-selector");
  const resultsBox = document.getElementById("ai-results");
  const generateBtn = document.getElementById("generate-ai");

  // Get logged in user
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

  // Load user's exercises
  async function loadUserExercises(userId) {
    try {
      const res = await fetch(`/api/workouts/${userId}`);
      const workouts = await res.json();

      // Flatten all exercises and remove duplicates
      const exerciseSet = new Set();
      workouts.forEach(w => {
        if (Array.isArray(w.exercises)) {
          w.exercises.forEach(e => {
            if (e.exercise) exerciseSet.add(e.exercise);
          });
        }
      });

      // Populate dropdown
      exerciseSelect.innerHTML = "";
      exerciseSet.forEach(ex => {
        const option = document.createElement("option");
        option.value = ex;
        option.textContent = ex;
        exerciseSelect.appendChild(option);
      });

      return workouts;
    } catch (err) {
      console.error("Failed to load exercises:", err);
      return [];
    }
  }

  // Calculation functions
  // Uses the Epley formula to workout 1 rep maxes.
  // Then uses the general rule that someone would be able to do 93% of their 1RM for 3 reps. Etc.
  function calculate1RM(weight, reps) {
    return Math.round(weight * (1 + reps / 30));
  }

  function calculateRepMaxes(oneRM) {
    return {
      "1RM": oneRM,
      "3RM": Math.round(oneRM * 0.93),
      "5RM": Math.round(oneRM * 0.87),
      "8RM": Math.round(oneRM * 0.80),
    };
  }

  function getLatestLift(history, exercise) {
    if (!Array.isArray(history)) return undefined;

    return history
      .filter(w => w && Array.isArray(w.exercises))
      .flatMap(w => w.exercises)
      .filter(e => e && e.exercise === exercise)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
  }

  function recommendNextLift(latest, goal) {
    if (!latest) return null;

    const w = latest.weight;
    const r = latest.reps;
    const s = latest.sets;

    // In order to calculate the goal the algorithm uses progressive overload its base point.
    // So in their next session the user should attempt to do an increase of 2.5% of the weight they did.
    switch (goal) {
      case "strength":
        return { weight: Math.round(w * 1.025), sets: s, reps: r };
      case "hypertrophy":
        return { weight: w, sets: s, reps: r + 1 };
      case "power":
        return { weight: Math.round(w * 1.05), sets: s, reps: r };
      default:
        return { weight: w, sets: s, reps: r };
    }
  }

  // Generates the recommendation using the calcuation functions
  async function generateAiRecommendation() {
    const exercise = exerciseSelect.value;
    const goal = goalSelect.value;

    if (!exercise || !goal) {
      resultsBox.innerHTML = `<p class="error">Please select an exercise and a goal.</p>`;
      return;
    }

    const userId = await getLoggedInUser();
    if (!userId) return;

    try {
      const history = await loadUserExercises(userId);

      const latest = getLatestLift(history, exercise);
      if (!latest) {
        resultsBox.innerHTML = `<p class="error">No history found for <strong>${exercise}</strong> yet.</p>`;
        return;
      }

      const oneRM = calculate1RM(latest.weight, latest.reps);
      const repMaxes = calculateRepMaxes(oneRM);
      const nextLift = recommendNextLift(latest, goal);

      // Using innerHTML on both the js and HTML page to show the recommendations.
      resultsBox.innerHTML = `
        <h3>AI Recommendation for ${exercise}</h3>
        <div class="ai-box">
          <h4>Latest Performance</h4>
          <p><strong>${latest.weight}kg</strong> for <strong>${latest.reps} reps</strong></p>

          <h4>Rep Max Estimates</h4>
          <ul>
            <li>1 Rep Max: <strong>${repMaxes["1RM"]}kg</strong></li>
            <li>3 Rep Max: <strong>${repMaxes["3RM"]}kg</strong></li>
            <li>5 Rep Max: <strong>${repMaxes["5RM"]}kg</strong></li>
            <li>8 Rep Max: <strong>${repMaxes["8RM"]}kg</strong></li>
          </ul>

          <h4>Recommended Next Workout (${goal.toUpperCase()})</h4>
          <p>
            Weight: <strong>${nextLift.weight}kg</strong><br>
            Sets: <strong>${nextLift.sets}</strong><br>
            Reps: <strong>${nextLift.reps}</strong>
          </p>
        </div>
      `;
    } catch (err) {
      console.error("Error generating AI recommendation:", err);
      resultsBox.innerHTML = `<p class="error">Failed to fetch workout data.</p>`;
    }
  }

  // Initialize page
  const userId = await getLoggedInUser();
  if (!userId) return;

  await loadUserExercises(userId);

  // Gives the recommendations if the button is clicked.
  generateBtn.addEventListener("click", generateAiRecommendation);
});
