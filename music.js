
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
  let restoringPosition = true;
  let restoreFinished = false;

  // Video playback pauses music without changing the user's setting.
  let videoIsPlaying = false;
  let resumeMusicAfterVideo = false;

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
    if (!wantsMusic || videoIsPlaying) {
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
    if (videoIsPlaying) return;

    videoIsPlaying = true;

    // Resume only if the music was actually playing before the video.
    resumeMusicAfterVideo = wantsMusic && !audio.paused;

    if (!audio.paused) {
      audio.pause();
    }

    updateButton();
    saveState();
  }

  function resumeAfterVideo() {
    if (!videoIsPlaying) return;

    videoIsPlaying = false;

    const shouldResume = resumeMusicAfterVideo;
    resumeMusicAfterVideo = false;

    if (shouldResume && wantsMusic) {
      startMusic();
    } else {
      updateButton();
    }

    saveState();
  }

  // Called by product.html when the YouTube player changes state.
  window.NKNVideoPlaybackState = function (state) {
    if (state === 1) {
      // YouTube: PLAYING
      pauseForVideo();
    } else if (state === 2 || state === 0) {
      // YouTube: PAUSED or ENDED
      resumeAfterVideo();
    }
  };

  if (button) {
    button.addEventListener("click", async () => {
      if (videoIsPlaying) {
        if (!audio.paused) audio.pause();

        // Remember the user's choice even during video playback.
        wantsMusic = !wantsMusic;
        resumeMusicAfterVideo = false;
        saveState();
        updateButton();
        return;
      }

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

    if (wantsMusic && !videoIsPlaying) {
      startMusic();
    }
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

  window.NKNStartMusic = async function () {
    wantsMusic = true;
    saveState();

    if (!videoIsPlaying) {
      await startMusic();
    }
  };

  updateButton();

  // Preserve the previous autoplay attempt.
  if (wantsMusic) {
    startMusic();
  }
})();
