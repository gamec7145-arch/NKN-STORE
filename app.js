
(() => {
  "use strict";

  const SUPABASE_URL = "https://qfgzzsiwwrdzsgdkjxgx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tJrmszFYYBDt_C9dqKde_Q_GZ6lcLgl";

  const STORE_WHATSAPP = "";
  const STORE_TELEGRAM = "nknstore01";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const $ = (selector) => document.querySelector(selector);

  const grids = {
    popular: $("#popularGamesGrid"),
    android: $("#gamesGrid"),
    ps2: $("#ps2GamesGrid"),
    ps3: $("#ps3GamesGrid"),
    pc: $("#pcGamesGrid"),
    iso: $("#isoGamesGrid"),
    old: $("#oldIsGoldGrid"),
    money: $("#moneyModeGrid")
  };

  const allProductsGrid = $("#allProductsGrid");
  const allProductsSection = $("#allProductsSection");
  const allProductsTitle = $("#allProductsTitle");
  const emptyState = $("#emptyState");
  const searchInput = $("#searchInput");
  const searchStatus = $("#searchStatus");
  const modal = $("#productModal");

  let databaseProducts = [];
  let activeCategory = "";
  let activePlatform = "";
  let searchTerm = "";
  let cartCount = 0;
  let toastTimer;

  const fallbackImage =
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=85";

  const allProducts = () => databaseProducts;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function normalizePlatform(value) {
    const raw = String(value ?? "").trim();

    if (!raw) return "";

    const key = raw.toLowerCase();

    const platforms = {
      android: "Android",
      ps2: "PS2",
      "playstation 2": "PS2",
      ps3: "PS3",
      "playstation 3": "PS3",
      pc: "PC",
      iso: "ISO",
      ios: "iOS"
    };

    return platforms[key] || raw;
  }

  function normalizeGameType(value) {
    const type = String(value ?? "").trim().toLowerCase();
    return type === "old" ? "Old" : "New";
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") {
      return "Price on request";
    }

    const text = String(value).trim();

    if (!text) return "Price on request";

    return text.startsWith("৳") ? text : `৳ ${text}`;
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 2800);
  }

  // Supabase is the source of real product data.
  // Do not replace missing database results with demo products.
  async function loadProductsFromSupabase() {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      databaseProducts = (data || []).map((p) => ({
        id: p.id,
        name: p.name || "Untitled Product",
        category: String(p.category || "Games").trim(),
        platform: normalizePlatform(p.platform || "Android"),
        gameType: normalizeGameType(p.game_type),
        price: formatPrice(p.price),
        short: p.short_description || "",
        description: p.description || "",
        image: p.image_url || fallbackImage,
        detailsImage: p.details_image_url || "",
        popular: p.is_popular === true
      }));

      render();
    } catch (error) {
      console.error("Supabase product loading error:", error);
      databaseProducts = [];
      render();
      showToast("Products could not be loaded. Please refresh.");
    }
  }

  function isGame(product) {
    return product.category.toLowerCase() === "games";
  }

  function isApp(product) {
    return product.category.toLowerCase() === "apps";
  }

  function isMoneyMode(product) {
    return product.category.toLowerCase() === "unlimited money mode";
  }

  function isOldGame(product) {
    return product.category.toLowerCase() === "old is gold" ||
      (isGame(product) && product.gameType === "Old");
  }

  function matchesSearch(product) {
    const text = [
      product.name,
      product.category,
      product.platform,
      product.gameType,
      product.short,
      product.description
    ].join(" ").toLowerCase();

    return text.includes(searchTerm.toLowerCase());
  }

  function getCatalogProducts() {
    return allProducts().filter((product) => {
      if (!matchesSearch(product)) return false;

      if (activeCategory === "Games") {
        if (!isGame(product)) return false;
        if (activePlatform && product.platform !== activePlatform) {
          return false;
        }
        return true;
      }

      if (activeCategory === "Apps") return isApp(product);
      if (activeCategory === "Unlimited Money Mode") {
        return isMoneyMode(product);
      }
      if (activeCategory === "Old Is Gold") return isOldGame(product);

      return true;
    });
  }

  function productCard(product) {
    const label = isGame(product)
      ? `${product.platform || "Game"} Game`
      : product.category;

    return `
      <article class="product-card ${isApp(product) ? "app-card" : "game-card"}">
        <img
          class="product-poster"
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.name)}"
          loading="lazy"
          onerror="this.onerror=null;this.src='${fallbackImage}'"
        >

        <div class="product-info">
          <span class="product-tag">${escapeHTML(label)}</span>
          <h3 class="product-name">${escapeHTML(product.name)}</h3>
          <p class="product-short">${escapeHTML(product.short)}</p>

          <div class="product-bottom">
            <span class="product-price">${escapeHTML(product.price)}</span>
            <button
              class="details-button"
              data-details="${escapeHTML(product.id)}"
              type="button"
            >View Details</button>
          </div>
        </div>
      </article>
    `;
  }

  function setGrid(grid, products, limit = 4) {
    if (!grid) return;

    grid.innerHTML = products.length
      ? products.slice(0, limit).map(productCard).join("")
      : `<p class="empty-carousel-message">No products available yet.</p>`;
  }

  function setViewMore(selector, products, category, platform = "", popular = false) {
    const button = $(selector);
    if (!button) return;

    button.classList.toggle("hidden", products.length <= 4);

    button.onclick = () => {
      const params = new URLSearchParams();

      params.set("category", category);

      if (platform) params.set("platform", platform);
      if (popular) params.set("popular", "true");

      window.location.href = `catalog.html?${params.toString()}`;
    };
  }

  function render() {
    const catalog = allProducts();
    const searched = catalog.filter(matchesSearch);

    const games = searched.filter(isGame);
    const android = games.filter((p) => p.platform === "Android");
    const ps2 = games.filter((p) => p.platform === "PS2");
    const ps3 = games.filter((p) => p.platform === "PS3");
    const pc = games.filter((p) => p.platform === "PC");
    const iso = games.filter((p) => p.platform === "ISO");
    const old = searched.filter(isOldGame);
    const money = searched.filter(isMoneyMode);
    const popular = games.filter((p) => p.popular);

    const filtering = Boolean(searchTerm || activeCategory || activePlatform);

    const homeSections = [
      "#popular-games",
      "#android-games",
      "#ps2-games",
      "#ps3-games",
      "#pc-games",
      "#iso-games",
      "#old-is-gold",
      "#money-mode"
    ];

    homeSections.forEach((selector) => {
      const section = $(selector);
      if (section) section.classList.toggle("hidden", filtering);
    });

    setGrid(grids.popular, popular);
    setGrid(grids.android, android);
    setGrid(grids.ps2, ps2);
    setGrid(grids.ps3, ps3);
    setGrid(grids.pc, pc);
    setGrid(grids.iso, iso);
    setGrid(grids.old, old);
    setGrid(grids.money, money);

    setViewMore("#viewMorePopularGames", popular, "Games", "", true);
    setViewMore("#viewMoreGames", android, "Games", "Android");
    setViewMore("#viewMorePS2Games", ps2, "Games", "PS2");
    setViewMore("#viewMorePS3Games", ps3, "Games", "PS3");
    setViewMore("#viewMorePCGames", pc, "Games", "PC");
    setViewMore("#viewMoreISOGames", iso, "Games", "ISO");
    setViewMore("#viewMoreOldIsGold", old, "Old Is Gold");
    setViewMore("#viewMoreMoneyMode", money, "Unlimited Money Mode");

    const results = getCatalogProducts();

    if (allProductsSection) {
      allProductsSection.classList.toggle("hidden", !filtering);
    }

    if (allProductsTitle) {
      if (searchTerm) {
        allProductsTitle.textContent = "Search Results";
      } else if (activeCategory === "Games" && activePlatform) {
        allProductsTitle.textContent = `${activePlatform} Games`;
      } else {
        allProductsTitle.textContent = activeCategory || "Games";
      }
    }

    if (allProductsGrid) {
      allProductsGrid.innerHTML = results.map(productCard).join("");
    }

    if (emptyState) {
      emptyState.classList.toggle("hidden", !filtering || results.length > 0);
    }

    if (searchStatus) {
      searchStatus.textContent = filtering
        ? `${results.length} product(s) found`
        : "";
    }

    document.querySelectorAll(".category-button").forEach((button) => {
      const category = button.dataset.category || "";
      const platform = normalizePlatform(button.dataset.platform || "");

      let selected = false;

      if (category && category === activeCategory) {
        selected = !activePlatform
          ? !platform
          : platform === activePlatform;
      }

      button.classList.toggle("selected", selected);
    });
  }

  // Product detail pages
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-details]");
    if (!button) return;

    const id = button.dataset.details;
    window.location.href = `product.html?id=${encodeURIComponent(id)}`;
  });

  // Category buttons. Apps links navigate normally to apps.html.
  document.querySelectorAll(".category-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.tagName === "A") return;

      activeCategory = button.dataset.category || "";
      activePlatform = normalizePlatform(button.dataset.platform || "");
      searchTerm = "";

      if (searchInput) searchInput.value = "";

      render();

      if (allProductsSection) {
        allProductsSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });

  // Search
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchTerm = searchInput.value.trim();
      activeCategory = "";
      activePlatform = "";
      render();
    });
  }

  const clearSearch = $("#clearSearch");

  if (clearSearch) {
    clearSearch.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }

      searchTerm = "";
      activeCategory = "";
      activePlatform = "";
      render();
    });
  }

  const resetFilters = $("#resetFilters");

  if (resetFilters) {
    resetFilters.addEventListener("click", () => {
      activeCategory = "";
      activePlatform = "";
      searchTerm = "";

      if (searchInput) searchInput.value = "";

      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Product modal controls retained for compatibility.
  function closeDetails() {
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  const closeModal = $("#closeModal");

  if (closeModal) closeModal.addEventListener("click", closeDetails);

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeDetails();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDetails();
  });

  // Safe contact links if the modal is used.
  const whatsappOrder = $("#whatsappOrder");
  const telegramOrder = $("#telegramOrder");

  if (whatsappOrder) {
    whatsappOrder.addEventListener("click", (event) => {
      if (!STORE_WHATSAPP) {
        event.preventDefault();
        showToast("Store WhatsApp number has not been configured yet.");
      }
    });
  }

  if (telegramOrder) {
    telegramOrder.addEventListener("click", (event) => {
      if (!STORE_TELEGRAM) {
        event.preventDefault();
        showToast("Store Telegram username has not been configured yet.");
      }
    });
  }

  // Demo cart notice
  const cartButton = $("#cartButton");

  if (cartButton) {
    cartButton.addEventListener("click", () => {
      showToast(
        `Demo cart: ${cartCount} item(s). Checkout is not connected yet.`
      );
    });
  }

  // Hamburger menu
  const menuButton = $("#menuButton");
  const mobileMenu = $("#mobileMenu");

  if (menuButton && mobileMenu) {
    menuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });

    mobileMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
      });
    });
  }

  // Advertisement carousel
  const banners = Array.from(document.querySelectorAll(".banner"));
  const dotsContainer = $("#bannerDots");
  const slider = $("#bannerSlider");

  let bannerIndex = 0;
  let bannerTimer;
  let touchStartX = 0;

  function showBanner(index) {
    if (!banners.length) return;

    bannerIndex = (index + banners.length) % banners.length;

    banners.forEach((banner, i) => {
      banner.classList.toggle("active", i === bannerIndex);
    });

    if (dotsContainer) {
      dotsContainer.querySelectorAll(".banner-dot").forEach((dot, i) => {
        dot.classList.toggle("active", i === bannerIndex);
      });
    }
  }

  function restartBannerTimer() {
    clearInterval(bannerTimer);

    if (banners.length > 1) {
      bannerTimer = setInterval(() => {
        showBanner(bannerIndex + 1);
      }, 4500);
    }
  }

  if (dotsContainer) {
    dotsContainer.innerHTML = "";

    banners.forEach((banner, index) => {
      const dot = document.createElement("button");

      dot.type = "button";
      dot.className = `banner-dot${index === 0 ? " active" : ""}`;
      dot.setAttribute("aria-label", `Show advertisement ${index + 1}`);

      dot.addEventListener("click", () => {
        showBanner(index);
        restartBannerTimer();
      });

      dotsContainer.appendChild(dot);
    });
  }

  if (slider) {
    slider.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    slider.addEventListener("touchend", (event) => {
      const delta = event.changedTouches[0].screenX - touchStartX;

      if (Math.abs(delta) > 45) {
        showBanner(bannerIndex + (delta < 0 ? 1 : -1));
        restartBannerTimer();
      }
    }, { passive: true });
  }

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  render();
  restartBannerTimer();
  loadProductsFromSupabase();
})();
                             
