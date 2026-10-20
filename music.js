
(() => {
  "use strict";

  const MUSIC_URL =
    "https://raw.githubusercontent.com/gamec7145-arch/NKN-STORE/main/Majboor_x_Jhol_x_Pal_Pal_-_Nonstop_Mashup___Talwiinder_x_Zoha_Waseem_x_KK_x_Arijit___Lust_Vibes(256k).mp3";

  const STORAGE_KEY = "nkn_music_state_v1";

  // Prevent duplicate players on the same page.
  if (document.getElementById("nkn-music-player")) return;

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  let state = readState();

  const audio = new Audio(MUSIC_URL);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = Number.isFinite(Number(state.volume))
    ? Math.min(1, Math.max(0, Number(state.volume)))
    : 0.35;

  let savedPosition = Math.max(0, Number(state.position) || 0);
  let wantsMusic = state.wantsMusic === true;
  let restoringPosition = true;

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          position: Number.isFinite(audio.currentTime)
            ? audio.currentTime
            : savedPosition,
          volume: audio.volume,
          wantsMusic
        })
      );
    } catch {
      // Music still works if browser storage is unavailable.
    }
  }

  const player = document.createElement("div");
  player.id = "nkn-music-player";

  player.style.cssText = `
    position:fixed;
    right:12px;
    bottom:78px;
    z-index:99999;
    background:#071225;
    color:white;
    border:1px solid #278cff;
    border-radius:14px;
    padding:10px;
    display:flex;
    align-items:center;
    gap:9px;
    font:14px Arial,sans-serif;
    box-shadow:0 4px 18px #0008;
  `;

  const button = document.createElement("button");
  button.type = "button";

  button.style.cssText = `
    background:#278cff;
    color:white;
    border:0;
    border-radius:9px;
    padding:10px;
    font-weight:bold;
    cursor:pointer;
    white-space:nowrap;
  `;

  const volume = document.createElement("input");
  volume.type = "range";
  volume.min = "0";
  volume.max = "100";
  volume.value = String(Math.round(audio.volume * 100));
  volume.setAttribute("aria-label", "Music volume");
  volume.style.width = "75px";

  function updateButton() {
    if (!audio.paused) {
      button.textContent = "🔇 Music Off";
    } else if (wantsMusic) {
      button.textContent = "▶ Resume Music";
    } else {
      button.textContent = "🎵 Music On";
    }
  }

  async function startMusic() {
    wantsMusic = true;
    saveState();

    try {
      await audio.play();
      updateButton();
      saveState();
    } catch {
      // Browser autoplay restrictions cannot be forced away.
      button.textContent = "▶ Tap to Play";
      saveState();
    }
  }

  button.addEventListener("click", async () => {
    if (!audio.paused) {
      wantsMusic = false;
      audio.pause();
      saveState();
      updateButton();
      return;
    }

    await startMusic();
  });

  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value) / 100;
    saveState();
  });

  audio.addEventListener("loadedmetadata", () => {
    if (restoringPosition) {
      restoringPosition = false;

      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        savedPosition < audio.duration
      ) {
        try {
          audio.currentTime = savedPosition;
        } catch {
          // Continue from the beginning if seeking fails.
        }
      }
    }

    if (wantsMusic) startMusic();
  });

  audio.addEventListener("timeupdate", saveState);
  audio.addEventListener("play", () => {
    updateButton();
    saveState();
  });

  audio.addEventListener("pause", () => {
    updateButton();
    saveState();
  });

  audio.addEventListener("ended", () => {
    if (audio.loop) startMusic();
  });

  window.addEventListener("pagehide", saveState);
  window.addEventListener("beforeunload", saveState);

  player.append(button, volume);
  document.body.appendChild(player);

  updateButton();

  // Restore previous playback intent and attempt to resume.
  if (wantsMusic) {
    startMusic();
  }
})();
