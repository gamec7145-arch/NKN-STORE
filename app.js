(() => {
  "use strict";

  const SUPABASE_URL = "https://qfgzzsiwwrdzsgdkjxgx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tJrmszFYYBDt_C9dqKde_Q_GZ6lcLgl";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // Store contact details
  const STORE_WHATSAPP = "";
  const STORE_TELEGRAM = "nknstore01";

  const $ = (selector) => document.querySelector(selector);

  const gamesGrid = $("#gamesGrid");
  const popularGamesGrid = $("#popularGamesGrid");
  const ps2GamesGrid = $("#ps2GamesGrid");
  const ps3GamesGrid = $("#ps3GamesGrid");
  const pcGamesGrid = $("#pcGamesGrid");
  const isoGamesGrid = $("#isoGamesGrid");
  const appsGrid = $("#appsGrid");
  const moneyModeGrid = $("#moneyModeGrid");
  const oldIsGoldGrid = $("#oldIsGoldGrid");

  const allProductsGrid = $("#allProductsGrid");
  const allProductsSection = $("#allProductsSection");
  const allProductsTitle = $("#allProductsTitle");
  const emptyState = $("#emptyState");
  const searchInput = $("#searchInput");
  const searchStatus = $("#searchStatus");
  const modal = $("#productModal");

  let activeCategory = "";
  let activePlatform = "";
  let searchTerm = "";
  let cartCount = 0;
  let toastTimer;
  let databaseProducts = null;

  const fallbackImage =
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=700&q=85";

  const allProducts = () =>
    Array.isArray(databaseProducts)
      ? databaseProducts
      : Array.isArray(window.PRODUCTS)
        ? window.PRODUCTS
        : [];

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") {
      return "Price unavailable";
    }

    const text = String(value).trim();

    return /^[৳]/.test(text) ? text : `৳ ${text}`;
  }

  function normalizePlatform(value) {
    const platform = String(value || "Android").trim();
    const lower = platform.toLowerCase();

    const platforms = {
      android: "Android",
      ps2: "PS2",
      "playstation 2": "PS2",
      ps3: "PS3",
      "playstation 3": "PS3",
      pc: "PC",
      iso: "ISO",
      ios: "ISO"
    };

    return platforms[lower] || platform;
  }

  function normalizeGameType(value) {
    const type = String(value || "New").trim().toLowerCase();

    if (type === "old") return "Old";
    return "New";
  }

  // Load products from Supabase
  async function loadProductsFromSupabase() {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase product loading error:", error);
        showToast("Products could not be loaded. Please refresh.");
        return;
      }

      databaseProducts = (data || []).map((p) => ({
        id: p.id,
        name: p.name || "Untitled Product",
        category: p.category || "Games",
        platform: normalizePlatform(p.platform),
        gameType: normalizeGameType(p.game_type),
        price: formatPrice(p.price),
        short: p.short_description || "",
        description: p.description || "",
        image: p.image_url || fallbackImage,
        popular: p.is_popular === true
      }));

      render();
    } catch (error) {
      console.error("Unexpected product loading error:", error);
      showToast("Could not connect to the product database.");
    }
  }

  // Product card
  function productCard(product) {
    const label = product.category === "Games"
      ? `${escapeHTML(product.platform)} Game`
      : escapeHTML(product.category);

    return `
      <article class="product-card ${
        product.category === "Apps" ? "app-card" : "game-card"
      }">
        <img
          class="product-poster"
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.name)}"
          loading="lazy"
          onerror="this.onerror=null;this.src='${fallbackImage}'"
        >

        <div class="product-info">
          <span class="product-tag">${label}</span>

          <h3 class="product-name">${escapeHTML(product.name)}</h3>

          <p class="product-short">${escapeHTML(product.short)}</p>

          <div class="product-bottom">
            <span class="product-price">${escapeHTML(product.price)}</span>

            <button
              class="details-button"
              data-details="${escapeHTML(product.id)}"
              type="button"
            >
              View Details
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function isGame(product) {
    return product.category === "Games";
  }

  function isOldGame(product) {
    return isGame(product) && (
      product.gameType === "Old" ||
      product.category === "Old Is Gold"
    );
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

  function getPlatformGames(platform) {
    return allProducts().filter((product) =>
      isGame(product) && product.platform === platform
    );
  }

  function setGrid(grid, products, limit = 4) {
    if (!grid) return;

    grid.innerHTML = products
      .slice(0, limit)
      .map(productCard)
      .join("");
  }

  function setEmptyGrid(grid, message) {
    if (!grid) return;

    grid.innerHTML = `
      <p class="empty-carousel-message">
        ${escapeHTML(message)}
      </p>
    `;
  }

  function openCatalog(title, category = "", platform = "") {
    activeCategory = category;
    activePlatform = platform;
    searchTerm = "";

    if (searchInput) searchInput.value = "";

    render();

    if (allProductsSection) {
      allProductsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  function render() {
    const catalog = allProducts();
    const products = catalog.filter(matchesSearch);

    const games = products.filter(isGame);
    const apps = products.filter((p) => p.category === "Apps");

    const androidGames = games.filter((p) => p.platform === "Android");
    const ps2Games = games.filter((p) => p.platform === "PS2");
    const ps3Games = games.filter((p) => p.platform === "PS3");
    const pcGames = games.filter((p) => p.platform === "PC");
    const isoGames = games.filter((p) => p.platform === "ISO");

    const moneyModeProducts = products.filter(
      (p) => p.category === "Unlimited Money Mode"
    );

    const oldIsGoldProducts = products.filter(isOldGame);

    const popularGames = games.filter((p) => p.popular);

    const filtering = Boolean(searchTerm) ||
      Boolean(activeCategory) ||
      Boolean(activePlatform);

    // Hide homepage sections when showing filtered results
    [
      "#popular-games",
      "#android-games",
      "#ps2-games",
      "#ps3-games",
      "#pc-games",
      "#iso-games",
      "#old-is-gold",
      "#apps",
      "#money-mode"
    ].forEach((selector) => {
      const section = $(selector);

      if (section) {
        section.classList.toggle("hidden", filtering);
      }
    });

    // Popular Games
    setGrid(popularGamesGrid, popularGames);

    if (popularGamesGrid && !popularGames.length) {
      setEmptyGrid(popularGamesGrid, "No popular games available yet.");
    }

    // Android Games
    setGrid(gamesGrid, androidGames);

    if (gamesGrid && !androidGames.length) {
      setEmptyGrid(gamesGrid, "No Android games available yet.");
    }

    // PS2 Games
    setGrid(ps2GamesGrid, ps2Games);

    if (ps2GamesGrid && !ps2Games.length) {
      setEmptyGrid(ps2GamesGrid, "No PS2 games available yet.");
    }

    // PS3 Games
    setGrid(ps3GamesGrid, ps3Games);

    if (ps3GamesGrid && !ps3Games.length) {
      setEmptyGrid(ps3GamesGrid, "No PS3 games available yet.");
    }

    // PC Games
    setGrid(pcGamesGrid, pcGames);

    if (pcGamesGrid && !pcGames.length) {
      setEmptyGrid(pcGamesGrid, "No PC games available yet.");
    }

    // ISO Games
    setGrid(isoGamesGrid, isoGames);

    if (isoGamesGrid && !isoGames.length) {
      setEmptyGrid(isoGamesGrid, "No ISO games available yet.");
    }

    // Old Is Gold
    setGrid(oldIsGoldGrid, oldIsGoldProducts);

    if (oldIsGoldGrid && !oldIsGoldProducts.length) {
      setEmptyGrid(oldIsGoldGrid, "No Old Is Gold games available yet.");
    }

    // Premium Apps
    setGrid(appsGrid, apps);

    if (appsGrid && !apps.length) {
      setEmptyGrid(appsGrid, "No premium apps available yet.");
    }

    // Unlimited Money Mode
    setGrid(moneyModeGrid, moneyModeProducts);

    if (moneyModeGrid && !moneyModeProducts.length) {
      setEmptyGrid(moneyModeGrid, "No Unlimited Money Mode products available yet.");
    }

    // View More buttons
    const viewMoreSettings = [
      ["#viewMorePopularGames", "Games", "", popularGames.length],
      ["#viewMoreGames", "Games", "Android", androidGames.length],
      ["#viewMorePS2Games", "Games", "PS2", ps2Games.length],
      ["#viewMorePS3Games", "Games", "PS3", ps3Games.length],
      ["#viewMorePCGames", "Games", "PC", pcGames.length],
      ["#viewMoreISOGames", "Games", "ISO", isoGames.length],
      ["#viewMoreApps", "Apps", "", apps.length]
    ];

    viewMoreSettings.forEach(([selector, category, platform, count]) => {
      const button = $(selector);
      if (!button) return;

      button.classList.toggle("hidden", filtering || count <= 4);

      button.onclick = () => openCatalog(
        "",
        category,
        platform
      );
    });

    // Unlimited Money Mode View More
    const viewMoreMoneyMode = $("#viewMoreMoneyMode");

    if (viewMoreMoneyMode) {
      const count = catalog.filter(
        (p) => p.category === "Unlimited Money Mode"
      ).length;

      viewMoreMoneyMode.classList.toggle("hidden", filtering || count <= 4);

      viewMoreMoneyMode.onclick = () => {
        openCatalog("", "Unlimited Money Mode", "");
      };
    }

    // Old Is Gold View More
    const viewMoreOldIsGold = $("#viewMoreOldIsGold");

    if (viewMoreOldIsGold) {
      viewMoreOldIsGold.classList.toggle(
        "hidden",
        filtering || oldIsGoldProducts.length <= 4
      );

      viewMoreOldIsGold.onclick = () => {
        window.location.href = "old-is-gold.html";
      };
    }

    // Category and platform filtering
    const categoryFiltered = products.filter((product) => {
      if (activeCategory === "Games") {
        if (!isGame(product)) return false;

        return !activePlatform || product.platform === activePlatform;
      }

      if (activeCategory === "Apps") {
        return product.category === "Apps";
      }

      if (activeCategory === "Unlimited Money Mode") {
        return product.category === "Unlimited Money Mode";
      }

      if (activeCategory === "Old Is Gold") {
        return isOldGame(product);
      }

      return true;
    });

    if (allProductsSection) {
      allProductsSection.classList.toggle("hidden", !filtering);
    }

    if (allProductsTitle) {
      if (searchTerm) {
        allProductsTitle.textContent = "Search Results";
      } else if (activeCategory === "Games" && activePlatform) {
        allProductsTitle.textContent = `${activePlatform} Games`;
      } else if (activeCategory === "Old Is Gold") {
        allProductsTitle.textContent = "Old Is Gold";
      } else {
        allProductsTitle.textContent = activeCategory || "Products";
      }
    }

    if (allProductsGrid) {
      allProductsGrid.innerHTML = categoryFiltered
        .map(productCard)
        .join("");
    }

    const noResults = categoryFiltered.length === 0;

    if (emptyState) {
      emptyState.classList.toggle("hidden", !filtering || !noResults);
    }

    if (searchStatus) {
      searchStatus.textContent = filtering
        ? `${categoryFiltered.length} product(s) found`
        : "";
    }

    // Category button selected state
    document.querySelectorAll(".category-button").forEach((button) => {
      const category = button.dataset.category;
      const platform = normalizePlatform(button.dataset.platform || "");

      let selected = category === activeCategory;

      if (category === "Games" && activeCategory === "Games") {
        selected = !activePlatform
          ? !button.dataset.platform
          : platform === activePlatform;
      }

      button.classList.toggle("selected", selected);
    });
  }

  // Product Details navigation
  document.addEventListener("click", (event) => {
    const detailsButton = event.target.closest("[data-details]");
    if (!detailsButton) return;

    const productId = detailsButton.dataset.details;

    window.location.href =
      `product.html?id=${encodeURIComponent(productId)}`;
  });

  // Product details modal helper
  function openDetails(id) {
    const product = allProducts().find(
      (item) => String(item.id) === String(id)
    );

    if (!product || !modal) return;

    const modalImage = $("#modalImage");
    const modalCategory = $("#modalCategory");
    const modalTitle = $("#modalTitle");
    const modalPrice = $("#modalPrice");
    const modalDescription = $("#modalDescription");

    if (modalImage) {
      modalImage.src = product.image;
      modalImage.alt = product.name;
    }

    if (modalCategory) {
      modalCategory.textContent = product.category === "Games"
        ? `${product.platform} Game`
        : product.category;
    }

    if (modalTitle) modalTitle.textContent = product.name;
    if (modalPrice) modalPrice.textContent = product.price;

    if (modalDescription) {
      modalDescription.textContent = product.description;
    }

    const message =
      `Hello NKN STORE! I want to order: ${product.name}. ` +
      `Price: ${product.price}. Please share details.`;

    const whatsapp = $("#whatsappOrder");
    const telegram = $("#telegramOrder");

    if (whatsapp) {
      whatsapp.href = STORE_WHATSAPP
        ? `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`
        : "#";
    }

    if (telegram) {
      telegram.href = STORE_TELEGRAM
        ? `https://t.me/${STORE_TELEGRAM}`
        : "#";
    }

    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeDetails() {
    if (modal) modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, 2600);
  }

  // Category buttons
  document.querySelectorAll(".category-button").forEach((button) => {
    button.addEventListener("click", () => {
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
      render();
    });
  }

  // Reset filters
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

  // Product details modal controls
  const closeModal = $("#closeModal");

  if (closeModal) {
    closeModal.addEventListener("click", closeDetails);
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeDetails();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDetails();
  });

  // Demo cart
  const cartButton = $("#cartButton");

  if (cartButton) {
    cartButton.addEventListener("click", () => {
      showToast(
        `Demo cart: ${cartCount} item(s). Real cart/checkout is not connected yet.`
      );
    });
  }

  // Mobile menu
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

  let bannerIndex = 0;
  let bannerTimer;

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

  if (dotsContainer) {
    dotsContainer.innerHTML = "";

    banners.forEach((banner, index) => {
      const dot = document.createElement("button");

      dot.className =
        `banner-dot${index === 0 ? " active" : ""}`;

      dot.type = "button";

      dot.setAttribute(
        "aria-label",
        `Show advertisement ${index + 1}`
      );

      dot.addEventListener("click", () => {
        showBanner(index);
        restartBannerTimer();
      });

      dotsContainer.appendChild(dot);
    });
  }

  function restartBannerTimer() {
    clearInterval(bannerTimer);

    if (banners.length > 1) {
      bannerTimer = setInterval(() => {
        showBanner(bannerIndex + 1);
      }, 4500);
    }
  }

  // Banner swipe support
  let touchStartX = 0;
  const slider = $("#bannerSlider");

  if (slider) {
    slider.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0].screenX;
    }, { passive: true });

    slider.addEventListener("touchend", (event) => {
      const delta =
        event.changedTouches[0].screenX - touchStartX;

      if (Math.abs(delta) > 45) {
        showBanner(bannerIndex + (delta < 0 ? 1 : -1));
        restartBannerTimer();
      }
    }, { passive: true });
  }

  // Safe order-link behaviour
  const whatsappOrder = $("#whatsappOrder");

  if (whatsappOrder) {
    whatsappOrder.addEventListener("click", (event) => {
      if (!STORE_WHATSAPP) {
        event.preventDefault();
        showToast("Store WhatsApp number has not been configured yet.");
      }
    });
  }

  const telegramOrder = $("#telegramOrder");

  if (telegramOrder) {
    telegramOrder.addEventListener("click", (event) => {
      if (!STORE_TELEGRAM) {
        event.preventDefault();
        showToast("Store Telegram username has not been configured yet.");
      }
    });
  }

  // Current year
  const year = $("#year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // Initial render and database loading
  render();
  restartBannerTimer();
  loadProductsFromSupabase();
})();
  
