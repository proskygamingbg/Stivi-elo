// CS2 Rating Checker - main logic
// Where to edit levels: thresholds array below.
// thresholds should contain N+1 breakpoints for N levels. Use Infinity as last upper bound.
// Example default thresholds (example values; adjust to match your official mapping)
const thresholds = [0, 600, 900, 1100, 1400, 1600, 1800, 2000, 2200, 2400, Infinity];
// This produces 10 levels: 1..10 where level i corresponds to rating in
// [thresholds[i-1], thresholds[i]) for i from 1..10

// Utility: get level and progress %
function getLevelAndProgress(rating) {
  rating = Number(rating) || 0;
  for (let i = 1; i < thresholds.length; i++) {
    const low = thresholds[i - 1];
    const high = thresholds[i];
    if (rating >= low && rating < high) {
      const within = (rating - low) / (high - low || 1);
      return {
        level: i,
        progress: Math.max(0, Math.min(100, Math.round(within * 100)))
      };
    }
  }
  // fallback to max level
  return { level: thresholds.length - 1, progress: 100 };
}

// Persistence key
const STORAGE_KEY = "cs2_players_v1";

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed to read storage", e);
    return [];
  }
}
function writeStorage(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// DOM
const form = document.getElementById("playerForm");
const playersList = document.getElementById("playersList");
const exportBtn = document.getElementById("exportJson");
const importFile = document.getElementById("importJsonFile");
const clearAllBtn = document.getElementById("clearAll");
const photoFileInput = document.getElementById("photoFile");
const photoUrlInput = document.getElementById("photoUrl");

let players = readStorage();
renderPlayers();

// Handle file upload preview conversion (to dataURL)
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nickname = document.getElementById("nickname").value.trim();
  const position = document.getElementById("position").value;
  const rating = Number(document.getElementById("rating").value) || 0;
  let photo = (photoUrlInput.value || "").trim();

  if (!photo && photoFileInput.files && photoFileInput.files[0]) {
    try {
      photo = await fileToDataURL(photoFileInput.files[0]);
    } catch (err) {
      console.warn("file read failed", err);
    }
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const player = { id, nickname, position, rating, photo };
  players.push(player);
  writeStorage(players);
  form.reset();
  renderPlayers();
});

clearAllBtn.addEventListener("click", () => {
  if (!confirm("Clear all players? This cannot be undone.")) return;
  players = [];
  writeStorage(players);
  renderPlayers();
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(players, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "players.json";
  a.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const parsed = JSON.parse(fr.result);
      if (Array.isArray(parsed)) {
        players = parsed;
        writeStorage(players);
        renderPlayers();
        alert("Imported " + players.length + " players.");
      } else {
        alert("JSON should be an array of players");
      }
    } catch (err) {
      alert("Invalid JSON");
    }
  };
  fr.readAsText(f);
});

// Render
function renderPlayers() {
  playersList.innerHTML = "";
  if (!players || players.length === 0) {
    playersList.innerHTML = `<div class="muted">No players added yet.</div>`;
    return;
  }
  players.slice().reverse().forEach(p => {
    const { level, progress } = getLevelAndProgress(p.rating);
    const card = document.createElement("div");
    card.className = "player-card";

    const img = document.createElement("img");
    img.className = "player-photo";
    img.alt = p.nickname || "photo";

    if (p.photo) {
      img.src = p.photo;
    } else {
      // fallback generated placeholder via initials
      const initials = (p.nickname || "P").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%' height='100%' fill='#072b2f'/><text x='50%' y='55%' font-size='72' fill='#9be7ef' font-family='Arial' text-anchor='middle' dominant-baseline='middle'>${initials}</text></svg>`;
      img.src = 'data:image/svg+xml;base64,' + btoa(svg);
    }

    const info = document.createElement("div");
    info.className = "player-info";
    const h = document.createElement("h4");
    h.textContent = p.nickname || "Unnamed";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${p.position || "—"} · Rating: ${p.rating}`;

    const badge = document.createElement("div");
    badge.className = "level-badge";
    badge.textContent = `Level ${level}`;

    const progressWrap = document.createElement("div");
    progressWrap.className = "progress";
    const inner = document.createElement("i");
    inner.style.width = progress + "%";
    progressWrap.appendChild(inner);

    const actions = document.createElement("div");
    actions.className = "row";
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.style.background = "rgba(255,255,255,0.06)";
    removeBtn.style.color = "var(--text)";
    removeBtn.addEventListener("click", () => {
      if (!confirm("Remove player " + (p.nickname || "") + "?")) return;
      players = players.filter(x => x.id !== p.id);
      writeStorage(players);
      renderPlayers();
    });

    actions.appendChild(removeBtn);
    info.appendChild(h);
    info.appendChild(meta);
    info.appendChild(badge);
    info.appendChild(progressWrap);
    info.appendChild(document.createTextNode(" " + progress + "%"));

    card.appendChild(img);
    card.appendChild(info);
    card.appendChild(actions);
    playersList.appendChild(card);
  });
}
