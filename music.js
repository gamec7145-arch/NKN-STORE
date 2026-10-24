(() => {
"use strict";

const MUSIC_URL =
"https://raw.githubusercontent.com/gamec7145-arch/NKN-STORE/main/Majboor_x_Jhol_x_Pal_Pal_-_Nonstop_Mashup___Talwiinder_x_Zoha_Waseem_x_KK_x_Arijit___Lust_Vibes(256k).mp3";

const STORAGE_KEY = "nkn_music_state_v2";

// Prevent duplicate initialization.
if (window.__nknMusicInitialized) return;
window.__nknMusicInitialized = true;

const button = document.getElementById("musicToggleButton");

function readState() {
try {
return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
} catch {
return {};
}
}

const savedState = readState();

let wantsMusic = savedState.userPaused !== true;
let savedPosition = Math.max(0, Number(savedState.position) || 0);
let restoringPosition = true;
let restoreFinished = false;

const audio = new Audio(MUSIC_URL);
audio.loop = true;
audio.preload = "auto";
audio.volume = Number.isFinite(Number(savedState.volume))
? Math.min(1, Math.max(0, Number(savedState.volume)))
: 0.35;

function saveState() {
try {
localStorage.setItem(
STORAGE_KEY,
JSON.stringify({
position: Number.isFinite(audio.currentTime)
? audio.currentTime
: savedPosition,
volume: audio.volume,
userPaused: !wantsMusic
})
);
} catch {}
}

function updateButton() {
if (!button) return;

if (!audio.paused) {
  button.textContent = "🔊";
  button.setAttribute("aria-label", "Turn music off");
  button.title = "Turn music off";
} else if (wantsMusic) {
  button.textContent = "🎵";
  button.setAttribute("aria-label", "Tap to play music");
  button.title = "Tap to play music";
} else {
  button.textContent = "🔇";
  button.setAttribute("aria-label", "Turn music on");
  button.title = "Turn music on";
}

}

async function startMusic() {
if (!wantsMusic) return;

try {
  await audio.play();
} catch {
  // Browser autoplay may require a user tap.
}

updateButton();
saveState();

}

if (button) {
button.addEventListener("click", async () => {
if (!audio.paused) {
wantsMusic = false;
audio.pause();
saveState();
updateButton();
} else {
wantsMusic = true;
saveState();
await startMusic();
}
});
}

audio.addEventListener("loadedmetadata", () => {
if (restoreFinished) return;

restoreFinished = true;
restoringPosition = false;

if (
  Number.isFinite(audio.duration) &&
  audio.duration > 0 &&
  savedPosition < audio.duration
) {
  try {
    audio.currentTime = savedPosition;
  } catch {}
}

if (wantsMusic) startMusic();

});

audio.addEventListener("timeupdate", () => {
if (!restoringPosition) saveState();
});

audio.addEventListener("play", () => {
updateButton();
saveState();
});

audio.addEventListener("pause", () => {
updateButton();
saveState();
});

window.addEventListener("pagehide", saveState);
window.addEventListener("beforeunload", saveState);

updateButton();

// Preserve the previous autoplay attempt.
if (wantsMusic) {
startMusic();
}
  window.NKNStartMusic = async function () {
  wantsMusic = true;
  saveState();

  try {
    await audio.play();
  } catch (error) {
    console.warn("Music could not start:", error);
  }

  updateButton();
};
})();
