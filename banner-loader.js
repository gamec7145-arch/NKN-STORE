/* NKN STORE dynamic banner loader.
   Add this script to Games Home and Apps page after Supabase JS.
   Games page container: #bannerSlider; each slide uses .banner; dots: #bannerDots.
   Apps page should use #appsBannerSlider and #appsBannerDots, with .banner slides.
*/
(() => {
  "use strict";
  const SUPABASE_URL = "https://qfgzzsiwwrdzsgdkjxgx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tJrmszFYYBDt_C9dqKde_Q_GZ6lcLgl";
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function setupCarousel(section, sliderId, dotsId) {
    const slider = document.getElementById(sliderId);
    const dots = document.getElementById(dotsId);
    if (!slider) return;

    let index = 0;
    let timer = null;
    let startX = 0;

    async function load() {
      const { data, error } = await client.from("banners")
        .select("id,image_path,alt_text,sort_order")
        .eq("section", section)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Banner loading error:", error);
        return;
      }

      const banners = data || [];
      if (!banners.length) return; // Keep existing HTML banners as fallback.

      slider.innerHTML = banners.map((item) => {
        const url = client.storage.from("banner-images").getPublicUrl(item.image_path).data.publicUrl;
        return `<div class="banner"><img src="${url}" alt="${String(item.alt_text || "").replace(/[&<>"']/g, "")}" loading="lazy" style="display:block;width:100%;height:100%;object-fit:cover"></div>`;
      }).join("");

      if (dots) {
        dots.innerHTML = banners.map((_, i) =>
          `<button type="button" class="banner-dot${i === 0 ? " active" : ""}" aria-label="Show banner ${i + 1}" data-banner-index="${i}"></button>`
        ).join("");
      }

      const slides = Array.from(slider.querySelectorAll(".banner"));
      function show(next) {
        index = (next + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
        if (dots) dots.querySelectorAll(".banner-dot").forEach((dot, i) => dot.classList.toggle("active", i === index));
      }
      function restart() {
        clearInterval(timer);
        if (slides.length > 1) timer = setInterval(() => show(index + 1), 4500);
      }
      if (dots) dots.addEventListener("click", (event) => {
        const button = event.target.closest("[data-banner-index]");
        if (!button) return;
        show(Number(button.dataset.bannerIndex));
        restart();
      });
      slider.addEventListener("touchstart", (event) => {
        startX = event.changedTouches[0].screenX;
      }, { passive: true });
      slider.addEventListener("touchend", (event) => {
        const delta = event.changedTouches[0].screenX - startX;
        if (Math.abs(delta) > 45) {
          show(index + (delta < 0 ? 1 : -1));
          restart();
        }
      }, { passive: true });
      show(0);
      restart();
    }
    load();
  }

  // Games homepage uses the existing IDs from index.html.
  setupCarousel("games", "bannerSlider", "bannerDots");
  // Apps page: add these IDs to the Apps banner slider and its dots container.
  setupCarousel("apps", "appsBannerSlider", "appsBannerDots");
})();
