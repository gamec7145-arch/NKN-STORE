(() => {
  "use strict";

  const MUSIC_URL =
    "https://raw.githubusercontent.com/gamec7145-arch/NKN-STORE/main/Majboor_x_Jhol_x_Pal_Pal_-_Nonstop_Mashup___Talwiinder_x_Zoha_Waseem_x_KK_x_Arijit___Lust_Vibes(256k).mp3";
  const STORAGE_KEY = "nkn_music_state_v2";

  if (window.__nknMusicInitialized) return;
  window.__nknMusicInitialized = true;

  const button = document.getElementById("musicToggleButton");

  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  const savedState = readState();
  let wantsMusic = savedState.userPaused !== true;
  let savedPosition = Math.max(0, Number(savedState.position) || 0);
  let resumeMusicAfterVideo = false;
  let pageLeaving = false;
  const playingVideos = new Set();

  const audio = new Audio(MUSIC_URL);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = Number.isFinite(Number(savedState.volume))
    ? Math.min(1, Math.max(0, Number(savedState.volume))) : 0.35;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        position: Number.isFinite(audio.currentTime) ? audio.currentTime : savedPosition,
        volume: audio.volume,
        userPaused: !wantsMusic
      }));
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
    if (!wantsMusic || playingVideos.size > 0 || pageLeaving) {
      updateButton();
      return;
    }
    try { await audio.play(); } catch (_) { /* Browser may require a user gesture. */ }
    updateButton();
    saveState();
  }

  function setVideoPlaying(videoId, isPlaying) {
    if (!videoId) return;
    const wasPlaying = playingVideos.size > 0;
    if (isPlaying) {
      playingVideos.add(videoId);
    } else {
      playingVideos.delete(videoId);
    }
    const isNowPlaying = playingVideos.size > 0;

    if (!wasPlaying && isNowPlaying) {
      // Resume later if music is wanted, even if autoplay was blocked initially.
      resumeMusicAfterVideo = wantsMusic;
      audio.pause();
    }

    if (wasPlaying && !isNowPlaying) {
      const shouldResume = resumeMusicAfterVideo;
      resumeMusicAfterVideo = false;
      if (shouldResume && wantsMusic && !pageLeaving) startMusic();
    }
    updateButton();
    saveState();
  }

  window.NKNSetVideoPlaying = setVideoPlaying;

  window.NKNVideoPlaybackState = function (state) {
    if (state === 1) setVideoPlaying("__legacy_video__", true);
    else if (state === 0 || state === 2 || state === 5) setVideoPlaying("__legacy_video__", false);
  };
  window.NKNVideoStarted = () => setVideoPlaying("__legacy_video__", true);
  window.NKNVideoStopped = () => setVideoPlaying("__legacy_video__", false);

  function stopForPageChange() {
    if (pageLeaving) return;
    pageLeaving = true;
    (window.nknActiveVideoPlayers || []).forEach(item => {
      const player = item && item.player ? item.player : item;
      try { player.stopVideo(); player.mute(); } catch (_) {}
    });
    audio.pause();
    saveState();
  }

  window.addEventListener("pagehide", stopForPageChange);
  window.addEventListener("beforeunload", stopForPageChange);

  if (button) {
    button.addEventListener("click", async () => {
      if (playingVideos.size > 0) {
        wantsMusic = !wantsMusic;
        if (!wantsMusic) resumeMusicAfterVideo = false;
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
    if (Number.isFinite(audio.duration) && audio.duration > 0 && savedPosition < audio.duration) {
      try { audio.currentTime = savedPosition; } catch (_) {}
    }
    if (wantsMusic && playingVideos.size === 0 && !pageLeaving) startMusic();
  });
  audio.addEventListener("timeupdate", saveState);
  audio.addEventListener("play", updateButton);
  audio.addEventListener("pause", updateButton);

  window.NKNStartMusic = async function () {
    pageLeaving = false;
    wantsMusic = true;
    saveState();
    if (playingVideos.size === 0) await startMusic();
  };

  updateButton();
  if (wantsMusic) startMusic();
})();
