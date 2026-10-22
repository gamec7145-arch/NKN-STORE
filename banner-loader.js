/* NKN STORE Dynamic Banner Loader
   Smooth horizontal sliding carousel.
   Games: #bannerSlider + #bannerDots
   Apps:  #appsBannerSlider + #appsBannerDots
*/
(() => {
  "use strict";

  const SUPABASE_URL = "https://qfgzzsiwwrdzsgdkjxgx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tJrmszFYYBDt_C9dqKde_Q_GZ6lcLgl";

  if (!window.supabase) {
    console.error("Supabase JS is not loaded.");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // Carousel settings
  const SLIDE_DURATION = 1600; // Smooth slide speed: 1.6 seconds
  const DISPLAY_DURATION = 4000; // Each banner stays for 4 seconds
  const SLIDE_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

  function setupCarousel(section, sliderId, dotsId) {
    const slider = document.getElementById(sliderId);
    const dots = document.getElementById(dotsId);

    if (!slider) return;

    let index = 0;
    let timer = null;
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let track = null;
    let slides = [];
    let animating = false;

    // Add carousel styling without changing other page sections.
    if (!document.getElementById("nkn-smooth-banner-style")) {
      const style = document.createElement("style");
      style.id = "nkn-smooth-banner-style";

      style.textContent = `
        .nkn-banner-viewport {
          width: 100%;
          overflow: hidden;
          position: relative;
          touch-action: pan-y;
        }

        .nkn-banner-track {
          display: flex;
          width: 100%;
          transform: translate3d(0, 0, 0);
          transition: transform ${SLIDE_DURATION}ms ${SLIDE_EASING};
          will-change: transform;
        }

        .nkn-banner-track > .banner {
          display: block !important;
          flex: 0 0 100%;
          width: 100%;
          min-width: 100%;
          max-width: 100%;
          position: relative;
          left: auto;
          right: auto;
          top: auto;
          margin: 0;
          opacity: 1 !important;
          visibility: visible !important;
          transform: none !important;
        }

        .nkn-banner-track > .banner img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          user-select: none;
          -webkit-user-drag: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .nkn-banner-track {
            transition-duration: 0ms;
          }
        }
      `;

      document.head.appendChild(style);
    }

    async function load() {
      const { data, error } = await client
        .from("banners")
        .select("id,image_path,alt_text,sort_order,created_at")
        .eq("section", section)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Banner loading error:", error);
        return;
      }

      const banners = data || [];

      // Keep existing HTML banners as fallback if none are active.
      if (!banners.length) return;

      // Build slides from active Supabase banners.
      slider.innerHTML = banners.map((item) => {
        const url = client.storage
          .from("banner-images")
          .getPublicUrl(item.image_path).data.publicUrl;

        const alt = String(item.alt_text || "")
          .replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
          })[char]);

        return `
          <div class="banner">
            <img
              src="${url}"
              alt="${alt}"
              loading="lazy"
              draggable="false"
            >
          </div>
        `;
      }).join("");

      // Create the horizontal sliding track.
      const viewport = document.createElement("div");
      viewport.className = "nkn-banner-viewport";

      track = document.createElement("div");
      track.className = "nkn-banner-track";

      while (slider.firstChild) {
        track.appendChild(slider.firstChild);
      }

      viewport.appendChild(track);
      slider.appendChild(viewport);

      slides = Array.from(track.querySelectorAll(".banner"));

      // Create navigation dots.
      if (dots) {
        dots.innerHTML = banners.map((_, i) => `
          <button
            type="button"
            class="banner-dot${i === 0 ? " active" : ""}"
            aria-label="Show banner ${i + 1}"
            aria-current="${i === 0 ? "true" : "false"}"
            data-banner-index="${i}"
          ></button>
        `).join("");
      }

      function updateDots() {
        if (!dots) return;

        dots.querySelectorAll(".banner-dot").forEach((dot, i) => {
          const active = i === index;
          dot.classList.toggle("active", active);
          dot.setAttribute("aria-current", active ? "true" : "false");
        });
      }

      function show(next, instant = false) {
        if (!slides.length) return;

        index = (next + slides.length) % slides.length;
        animating = !instant;

        track.style.transition = instant
          ? "none"
          : `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}`;

        track.style.transform =
          `translate3d(-${index * 100}%, 0, 0)`;

        slides.forEach((slide, i) => {
          slide.classList.toggle("active", i === index);
          slide.setAttribute(
            "aria-hidden",
            i === index ? "false" : "true"
          );
        });

        updateDots();

        if (instant) {
          track.offsetHeight;
          track.style.transition =
            `transform ${SLIDE_DURATION}ms ${SLIDE_EASING}`;
          animating = false;
        }
      }

      function restart() {
        clearInterval(timer);

        if (slides.length > 1) {
          timer = setInterval(() => {
            if (!isDragging && !animating) {
              show(index + 1);
            }
          }, DISPLAY_DURATION);
        }
      }

      track.addEventListener("transitionend", (event) => {
        if (event.propertyName === "transform") {
          animating = false;
        }
      });

      // Dot navigation.
      if (dots) {
        dots.addEventListener("click", (event) => {
          const button = event.target.closest("[data-banner-index]");
          if (!button || !dots.contains(button)) return;

          show(Number(button.dataset.bannerIndex));
          restart();
        });
      }

      // Mobile swipe navigation.
      viewport.addEventListener("touchstart", (event) => {
        if (!event.changedTouches.length) return;

        startX = event.changedTouches[0].screenX;
        startY = event.changedTouches[0].screenY;
        isDragging = true;
      }, { passive: true });

      viewport.addEventListener("touchend", (event) => {
        if (!event.changedTouches.length) {
          isDragging = false;
          return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.screenX - startX;
        const deltaY = touch.screenY - startY;

        if (
          Math.abs(deltaX) > 45 &&
          Math.abs(deltaX) > Math.abs(deltaY)
        ) {
          show(index + (deltaX < 0 ? 1 : -1));
          restart();
        }

        isDragging = false;
      }, { passive: true });

      viewport.addEventListener("touchcancel", () => {
        isDragging = false;
      }, { passive: true });

      // Prevent dragging banner images as files.
      track.querySelectorAll("img").forEach((img) => {
        img.addEventListener("dragstart", (event) => {
          event.preventDefault();
        });
      });

      // Show the first banner without an entrance animation.
      show(0, true);
      restart();
    }

    load().catch((error) => {
      console.error("Banner loader failed:", error);
    });
  }

  // Games homepage.
  setupCarousel("games", "bannerSlider", "bannerDots");

  // Apps page.
  setupCarousel("apps", "appsBannerSlider", "appsBannerDots");
})();
