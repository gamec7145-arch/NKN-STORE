
(() => {
  "use strict";

  const MUSIC_URL =
    "https://raw.githubusercontent.com/gamec7145-arch/NKN-STORE/main/Majboor_x_Jhol_x_Pal_Pal_-_Nonstop_Mashup___Talwiinder_x_Zoha_Waseem_x_KK_x_Arijit___Lust_Vibes(256k).mp3";

  const STORAGE_KEY = "nkn_music_state_v2";

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

  let videoCount = 0;
  let resumeMusicAfterVideo = false;
  let pageLeaving = false;

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
      button.setAttribute("aria-label", "Music is on; tap to play");
      button.title = "Music is on";
    } else {
      button.textContent = "🔇";
      button.setAttribute("aria-label", "Turn music on");
      button.title = "Turn music on";
    }
  }

  async function startMusic() {
    if (!wantsMusic || videoCount > 0 || pageLeaving) {
      updateButton();
      return;
    }

    try {
      await audio.play();
    } catch {
      // Browser autoplay restrictions may require user interaction.
    }

    updateButton();
    saveState();
  }

  function pauseForVideo() {
    if (videoCount === 0) {
      resumeMusicAfterVideo = wantsMusic && !audio.paused;
    }

    videoCount++;

    if (!audio.paused) {
      audio.pause();
    }

    updateButton();
    saveState();
  }

  function resumeAfterVideo() {
    if (videoCount <= 0) return;

    videoCount--;

    if (videoCount === 0) {
      const shouldResume = resumeMusicAfterVideo;
      resumeMusicAfterVideo = false;

      if (shouldResume && wantsMusic && !pageLeaving) {
        startMusic();
      }
    }

    updateButton();
    saveState();
  }

  // Backward-compatible YouTube player callback.
  window.NKNVideoPlaybackState = function (state) {
    if (state === 1) {
      pauseForVideo();
    } else if (state === 2 || state === 0) {
      resumeAfterVideo();
    }
  };

  // New API for video players.
  window.NKNVideoStarted = function () {
    pauseForVideo();
  };

  window.NKNVideoStopped = function () {
    resumeAfterVideo();
  };

  // Explicitly stop music when leaving this page.
  function stopForPageChange() {
    if (pageLeaving) return;

    pageLeaving = true;

    if (!audio.paused) {
      audio.pause();
    }

    saveState();
  }

  window.addEventListener("pagehide", stopForPageChange);
  window.addEventListener("beforeunload", stopForPageChange);

  if (button) {
    button.addEventListener("click", async () => {
      if (videoCount > 0) {
        wantsMusic = !wantsMusic;

        if (!wantsMusic) {
          resumeMusicAfterVideo = false;
        }

        saveState();
        updateButton();
        return;
      }

      if (!audio.paused) {
        wantsMusic = false;
        audio.pause();
      } else {
        wantsMusic = true;
        await startMusic();
      }

      saveState();
      updateButton();
    });
  }

  audio.addEventListener("loadedmetadata", () => {
    if (
      Number.isFinite(audio.duration) &&
      audio.duration > 0 &&
      savedPosition < audio.duration
    ) {
      try {
        audio.currentTime = savedPosition;
      } catch {}
    }

    if (wantsMusic && videoCount === 0 && !pageLeaving) {
      startMusic();
    }
  });

  audio.addEventListener("timeupdate", saveState);

  audio.addEventListener("play", updateButton);
  audio.addEventListener("pause", updateButton);

  window.NKNStartMusic = async function () {
    pageLeaving = false;
    wantsMusic = true;
    saveState();

    if (videoCount === 0) {
      await startMusic();
    }
  };

  updateButton();

  if (wantsMusic) {
    startMusic();
  }
})();
