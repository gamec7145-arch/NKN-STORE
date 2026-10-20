
(() => {
  "use strict";

  const MUSIC_URL =
    "https://raw.githubusercontent.com/gamec7145-arch/NKN-STORE/main/Majboor_x_Jhol_x_Pal_Pal_-_Nonstop_Mashup___Talwiinder_x_Zoha_Waseem_x_KK_x_Arijit___Lust_Vibes(256k).mp3";

  if (document.getElementById("nkn-music-player")) return;

  const audio = new Audio(MUSIC_URL);
  audio.loop = true;
  audio.volume = 0.35;
  audio.preload = "none";

  const player = document.createElement("div");
  player.id = "nkn-music-player";
  player.style.cssText = `
    position:fixed;right:12px;bottom:78px;z-index:99999;
    background:#071225;color:#fff;border:1px solid #278cff;
    border-radius:14px;padding:10px;display:flex;
    align-items:center;gap:9px;font:14px Arial,sans-serif;
    box-shadow:0 4px 18px #0008;
  `;

  const button = document.createElement("button");
  button.textContent = "▶ Play Music";
  button.style.cssText = `
    background:#278cff;color:white;border:0;border-radius:9px;
    padding:10px;font-weight:bold;
  `;

  const volume = document.createElement("input");
  volume.type = "range";
  volume.min = "0";
  volume.max = "100";
  volume.value = "35";
  volume.setAttribute("aria-label", "Music volume");
  volume.style.width = "75px";

  button.addEventListener("click", async () => {
    if (audio.paused) {
      try {
        await audio.play();
        button.textContent = "⏸ Pause";
      } catch {
        button.textContent = "▶ Tap to Retry";
      }
    } else {
      audio.pause();
      button.textContent = "▶ Play Music";
    }
  });

  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value) / 100;
  });

  audio.addEventListener("pause", () => {
    button.textContent = "▶ Play Music";
  });

  audio.addEventListener("play", () => {
    button.textContent = "⏸ Pause";
  });

  player.append(button, volume);
  document.body.appendChild(player);
  
  audio.play()
    .then(() => {
      button.textContent = "⏸ Pause";
    })
    .catch(() => {
      button.textContent = "▶ Play Music";
    });
  
})();
 
