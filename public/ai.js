function calculateRepMaxes(weight, reps) {
  const oneRM = weight * (1 + reps / 30);

  return {
    oneRM: Math.round(oneRM),
    threeRM: Math.round(oneRM / 1.08),
    fiveRM: Math.round(oneRM / 1.15),
    eightRM: Math.round(oneRM / 1.25)
  };
}

function recommendNextWeight(history) {
  const last = history[history.length - 1];
  const prev = history[history.length - 2];

  if (!prev) return last.weight;
  if (last.weight > prev.weight) return last.weight + 2.5;
  if (last.reps > prev.reps) return last.weight + 1.25;
  if (last.weight === prev.weight && last.reps === prev.reps)
    return last.weight - 2.5;

  return last.weight;
}

async function loadAI() {
  const res = await fetch("/api/ai/1");
  const workouts = await res.json();

  const output = document.getElementById("ai-output");
  output.innerHTML = "";

  if (!workouts.length) {
    output.innerHTML = "<p>No workout data found.</p>";
    return;
  }

  const groups = {};
  workouts.forEach(w => {
    if (!groups[w.exercise]) groups[w.exercise] = [];
    groups[w.exercise].push(w);
  });

  for (const exercise in groups) {
    const history = groups[exercise];
    const last = history[history.length - 1];

    const maxes = calculateRepMaxes(last.weight, last.reps);
    const nextWeight = recommendNextWeight(history);

    const block = document.createElement("div");
    block.classList.add("ai-block");

    block.innerHTML = `
      <h3>${exercise}</h3>
      <p><strong>Last Session:</strong> ${last.weight}kg × ${last.reps}</p>
      <p><strong>Recommended Next Weight:</strong> ${nextWeight}kg</p>
      <p><strong>Estimated Rep Maxes:</strong></p>
      <ul>
        <li>1RM: ${maxes.oneRM}kg</li>
        <li>3RM: ${maxes.threeRM}kg</li>
        <li>5RM: ${maxes.fiveRM}kg</li>
        <li>8RM: ${maxes.eightRM}kg</li>
      </ul>
    `;

    output.appendChild(block);
  }
}

loadAI();
