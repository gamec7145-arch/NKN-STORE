
(() => {
  "use strict";
  
  const SUPABASE_URL = "https://qfgzzsiwwrdzsgdkjxgx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tJrmszFYYBDt_C9dqKde_Q_GZ6lcLgl";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
  // IMPORTANT: Set the real store contact details before accepting orders.
  // WhatsApp number format: country code + number, digits only.
  const STORE_WHATSAPP = "";
  // Telegram username without the @ symbol.
  const STORE_TELEGRAM = "nknstore01";

  const $ = (selector) => document.querySelector(selector);
  const gamesGrid = $("#gamesGrid");
  const appsGrid = $("#appsGrid");
  const allProductsGrid = $("#allProductsGrid");
  const allProductsSection = $("#allProductsSection");
  const allProductsTitle = $("#allProductsTitle");
  const emptyState = $("#emptyState");
  const searchInput = $("#searchInput");
  const searchStatus = $("#searchStatus");
  const modal = $("#productModal");

  let activeCategory = "All Products";
  let searchTerm = "";
  let showAllGames = false;
  let showAllApps = false;
  let selectedProduct = null;
  let cartCount = 0;
  let toastTimer;

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  
const allProducts = () => Array.isArray(databaseProducts) ? databaseProducts : (Array.isArray(PRODUCTS) ? PRODUCTS : []);
  
  let databaseProducts = null;

  async function loadProductsFromSupabase() {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase product loading error:", error);
      return;
    }

    databaseProducts = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: `৳ ${p.price}`,
      short: p.short_description || "",
      description: p.description || "",
      image: p.image_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=85",
      popular: Boolean(p.is_popular)
    }));

  render();
}
  
  function productCard(product) {
    return `
      <article class="product-card">
        <img class="product-poster"
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.name)}"
          loading="lazy">
        <div class="product-info">
          <span class="product-tag">${escapeHTML(product.category)}</span>
          <h3 class="product-name">${escapeHTML(product.name)}</h3>
          <p class="product-short">${escapeHTML(product.short)}</p>
          <div class="product-bottom">
            <span class="product-price">${escapeHTML(product.price)}</span>
            <button class="details-button" data-details="${escapeHTML(product.id)}">
              View Details
            </button>
          </div>
        </div>
      </article>`;
  }

  function matchesSearch(product) {
    const text = `${product.name} ${product.category} ${product.short} ${product.description}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  }

  function render() {
    const products = allProducts().filter(matchesSearch);
    const games = products.filter(p => p.category === "Games");
    const apps = products.filter(p => p.category === "Apps");
    const money = products.filter(p => p.category === "Unlimited Money Mode");

    const filtering = Boolean(searchTerm) || activeCategory !== "All Products";

    // Category selection controls which main sections are visible.
    $("#games").classList.toggle("hidden", filtering && activeCategory !== "All Products" && activeCategory !== "Games");
    $("#apps").classList.toggle("hidden", filtering && activeCategory !== "All Products" && activeCategory !== "Apps");
    $("#money-mode").classList.toggle("hidden", filtering && activeCategory !== "All Products" && activeCategory !== "Unlimited Money Mode");

    if (activeCategory === "Unlimited Money Mode" && !searchTerm) {
      $("#money-mode").classList.remove("hidden");
    }

    const gameItems = filtering ? games : games.filter(p => p.popular);
    const appItems = filtering ? apps : apps.filter(p => p.popular);

    gamesGrid.innerHTML = gameItems.slice(0, showAllGames || filtering ? 100 : 4).map(productCard).join("");
    appsGrid.innerHTML = appItems.slice(0, showAllApps || filtering ? 100 : 4).map(productCard).join("");

    $("#viewMoreGames").classList.toggle("hidden", filtering || showAllGames || games.filter(p => p.popular).length <= 4);
    $("#viewMoreApps").classList.toggle("hidden", filtering || showAllApps || apps.filter(p => p.popular).length <= 4);

    const categoryFiltered = products.filter(p =>
      activeCategory === "All Products" || p.category === activeCategory
    );

    allProductsSection.classList.toggle("hidden", !filtering);
    allProductsTitle.textContent = searchTerm
      ? `Search Results`
      : activeCategory;

    allProductsGrid.innerHTML = categoryFiltered.map(productCard).join("");

    // When filtering, the dedicated search/results grid is the main result list.
    if (filtering) {
      $("#games").classList.add("hidden");
      $("#apps").classList.add("hidden");
      $("#money-mode").classList.add("hidden");
    }

    const noResults = categoryFiltered.length === 0;
    emptyState.classList.toggle("hidden", !noResults);
    searchStatus.textContent = filtering
      ? `${categoryFiltered.length} product(s) found`
      : "";

    document.querySelectorAll(".category-button").forEach(button => {
      button.classList.toggle("selected", button.dataset.category === activeCategory);
    });
  }

  function openDetails(id) {
    const product = allProducts().find(item => item.id === id);
    if (!product) return;

    selectedProduct = product;
    $("#modalImage").src = product.image;
    $("#modalImage").alt = product.name;
    $("#modalCategory").textContent = product.category;
    $("#modalTitle").textContent = product.name;
    $("#modalPrice").textContent = product.price;
    $("#modalDescription").textContent = product.description;

    const message = `Hello NKN STORE! I want to order: ${product.name}. Price: ${product.price}. Please share details.`;
    const whatsapp = $("#whatsappOrder");
    const telegram = $("#telegramOrder");

    if (STORE_WHATSAPP) {
      whatsapp.href = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;
      whatsapp.classList.remove("hidden");
    } else {
      whatsapp.href = "#";
      whatsapp.classList.remove("hidden");
    }

    if (STORE_TELEGRAM) {
      telegram.href = `https://t.me/${STORE_TELEGRAM}`;
      telegram.classList.remove("hidden");
    } else {
      telegram.href = "#";
      telegram.classList.remove("hidden");
    }

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeDetails() {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
  }

  document.addEventListener("click", event => {
    const detailsButton = event.target.closest("[data-details]");
    if (detailsButton) openDetails(detailsButton.dataset.details);
  });

  document.querySelectorAll(".category-button").forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      searchTerm = "";
      searchInput.value = "";
      render();
      document.querySelector(".category-section").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim();
    activeCategory = "All Products";
    render();
  });

  $("#clearSearch").addEventListener("click", () => {
    searchInput.value = "";
    searchTerm = "";
    render();
    searchInput.focus();
  });

  $("#viewMoreGames").addEventListener("click", () => {
  window.location.href = "games.html";
});

$("#viewMoreApps").addEventListener("click", () => {
  window.location.href = "apps.html";
});

  $("#exploreMoney").addEventListener("click", () => {
    activeCategory = "Unlimited Money Mode";
    searchTerm = "";
    searchInput.value = "";
    render();
    allProductsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#resetFilters").addEventListener("click", () => {
    activeCategory = "All Products";
    searchTerm = "";
    searchInput.value = "";
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#closeModal").addEventListener("click", closeDetails);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDetails();
  });

  $("#cartButton").addEventListener("click", () => {
    showToast(`Demo cart: ${cartCount} item(s). Real cart/checkout is not connected yet.`);
  });

  $("#menuButton").addEventListener("click", () => {
    $("#mobileMenu").classList.toggle("hidden");
  });

  $("#mobileMenu").querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => $("#mobileMenu").classList.add("hidden"));
  });

  // Automatic 16:9 banner carousel with clickable dots.
  const banners = Array.from(document.querySelectorAll(".banner"));
  const dotsContainer = $("#bannerDots");
  let bannerIndex = 0;
  let bannerTimer;

  function showBanner(index) {
    bannerIndex = (index + banners.length) % banners.length;
    banners.forEach((banner, i) => banner.classList.toggle("active", i === bannerIndex));
    dotsContainer.querySelectorAll(".banner-dot").forEach((dot, i) =>
      dot.classList.toggle("active", i === bannerIndex)
    );
  }

  banners.forEach((banner, index) => {
    const dot = document.createElement("button");
    dot.className = `banner-dot${index === 0 ? " active" : ""}`;
    dot.type = "button";
    dot.setAttribute("aria-label", `Show advertisement ${index + 1}`);
    dot.addEventListener("click", () => {
      showBanner(index);
      restartBannerTimer();
    });
    dotsContainer.appendChild(dot);
  });

  function restartBannerTimer() {
    clearInterval(bannerTimer);
    bannerTimer = setInterval(() => showBanner(bannerIndex + 1), 4500);
  }

  // Allow swiping the banner on touch screens.
  let touchStartX = 0;
  const slider = $("#bannerSlider");
  slider.addEventListener("touchstart", event => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });
  slider.addEventListener("touchend", event => {
    const delta = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 45) {
      showBanner(bannerIndex + (delta < 0 ? 1 : -1));
      restartBannerTimer();
    }
  }, { passive: true });

  // Safe placeholder behaviour until store contacts are configured.
  $("#whatsappOrder").addEventListener("click", event => {
    if (!STORE_WHATSAPP) {
      event.preventDefault();
      showToast("Store WhatsApp number has not been configured yet.");
    }
  });

  $("#telegramOrder").addEventListener("click", event => {
    if (!STORE_TELEGRAM) {
      event.preventDefault();
      showToast("Store Telegram username has not been configured yet.");
    }
  });

  $("#year").textContent = new Date().getFullYear();
  render();
  restartBannerTimer();

  loadProductsFromSupabase();
})();
