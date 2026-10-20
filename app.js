
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
  const iosGamesGrid = $("#iosGamesGrid");
  const pcGamesGrid = $("#pcGamesGrid");
  const appsGrid = $("#appsGrid");
  const allProductsGrid = $("#allProductsGrid");
  const allProductsSection = $("#allProductsSection");
  const allProductsTitle = $("#allProductsTitle");
  const emptyState = $("#emptyState");
  const searchInput = $("#searchInput");
  const searchStatus = $("#searchStatus");
  const modal = $("#productModal");

  let activeCategory = "All Products";
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
        name: p.name,
        category: p.category,
        platform: p.platform || "Android",
        price: `৳ ${p.price ?? 0}`,
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
          <span class="product-tag">
            ${escapeHTML(
              product.category === "Games"
                ? `${product.platform} Game`
                : product.category
            )}
          </span>

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

  function matchesSearch(product) {
    const text = [
      product.name,
      product.category,
      product.platform,
      product.short,
      product.description
    ].join(" ").toLowerCase();

    return text.includes(searchTerm.toLowerCase());
  }

  function getPlatformGames(platform) {
    return allProducts().filter((product) =>
      product.category === "Games" &&
      product.platform === platform
    );
  }

  function render() {
    const products = allProducts().filter(matchesSearch);

    const games = products.filter((p) => p.category === "Games");
    const apps = products.filter((p) => p.category === "Apps");

    const androidGames = games.filter((p) => p.platform === "Android");
    const iosGames = games.filter((p) => p.platform === "iOS");
    const pcGames = games.filter((p) => p.platform === "PC");

    const popularAndroid = androidGames.filter((p) => p.popular);
    const popularIOS = iosGames.filter((p) => p.popular);
    const popularPC = pcGames.filter((p) => p.popular);
    const popularApps = apps.filter((p) => p.popular);

    const filtering =
      Boolean(searchTerm) ||
      activeCategory !== "All Products";

    // Keep the popular products first.
    // If none are marked Popular, show products instead of an empty section.
    const homeAndroid = popularAndroid.length
      ? popularAndroid
      : androidGames;

    const homeIOS = popularIOS.length
      ? popularIOS
      : iosGames;

    const homePC = popularPC.length
      ? popularPC
      : pcGames;

    const homeApps = popularApps.length
      ? popularApps
      : apps;

    // Hide homepage sections while searching/filtering
    [
      "#android-games",
      "#ios-games",
      "#pc-games",
      "#apps",
      "#money-mode"
    ].forEach((selector) => {
      const section = $(selector);
      if (section) {
        section.classList.toggle("hidden", filtering);
      }
    });

    // Android games
    if (gamesGrid) {
      gamesGrid.innerHTML = homeAndroid
        .slice(0, 4)
        .map(productCard)
        .join("");
    }

    // iOS games
    if (iosGamesGrid) {
      iosGamesGrid.innerHTML = homeIOS
        .slice(0, 4)
        .map(productCard)
        .join("");
    }

    // PC games
    if (pcGamesGrid) {
      pcGamesGrid.innerHTML = homePC
        .slice(0, 4)
        .map(productCard)
        .join("");
    }

    // Premium apps
    if (appsGrid) {
      appsGrid.innerHTML = homeApps
        .slice(0, 4)
        .map(productCard)
        .join("");
    }

    // View More buttons
    const viewMoreSettings = [
      ["#viewMoreGames", "Android", "games.html?platform=Android"],
      ["#viewMoreIOSGames", "iOS", "games.html?platform=iOS"],
      ["#viewMorePCGames", "PC", "games.html?platform=PC"],
      ["#viewMoreApps", "Apps", "apps.html"]
    ];

    viewMoreSettings.forEach(([selector, platform, url]) => {
      const button = $(selector);
      if (!button) return;

      const count = platform === "Apps"
        ? apps.length
        : getPlatformGames(platform).length;

      button.classList.toggle("hidden", filtering || count <= 4);

      button.onclick = () => {
        window.location.href = url;
      };
    });

    // Filter products by category and platform
    const categoryFiltered = products.filter((p) => {
      if (activeCategory === "All Products") return true;

      if (activeCategory === "Games") {
        return p.category === "Games" &&
          (!activePlatform || p.platform === activePlatform);
      }

      return p.category === activeCategory;
    });

    if (allProductsSection) {
      allProductsSection.classList.toggle("hidden", !filtering);
    }

    if (allProductsTitle) {
      if (searchTerm) {
        allProductsTitle.textContent = "Search Results";
      } else if (activeCategory === "Games" && activePlatform) {
        allProductsTitle.textContent = `${activePlatform} Games`;
      } else {
        allProductsTitle.textContent = activeCategory;
      }
    }

    if (allProductsGrid) {
      allProductsGrid.innerHTML = categoryFiltered
        .map(productCard)
        .join("");
    }

    const noResults = categoryFiltered.length === 0;

    if (emptyState) {
      emptyState.classList.toggle(
        "hidden",
        !filtering || !noResults
      );
    }

    if (searchStatus) {
      searchStatus.textContent = filtering
        ? `${categoryFiltered.length} product(s) found`
        : "";
    }

    // Selected category buttons
    document.querySelectorAll(".category-button").forEach((button) => {
      const sameCategory =
        button.dataset.category === activeCategory;

      const buttonPlatform = button.dataset.platform || "";
      const samePlatform =
        !buttonPlatform || buttonPlatform === activePlatform;

      button.classList.toggle(
        "selected",
        sameCategory && samePlatform
      );
    });
  }

  // Product details page navigation
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
      modalCategory.textContent =
        product.category === "Games"
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
      activeCategory = button.dataset.category;
      activePlatform = button.dataset.platform || "";
      searchTerm = "";

      if (searchInput) searchInput.value = "";

      render();

      const categorySection = $(".category-section");
      if (categorySection) {
        categorySection.scrollIntoView({
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
      activeCategory = "All Products";
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

  // Unlimited Money Mode
  const exploreMoney = $("#exploreMoney");
  if (exploreMoney) {
    exploreMoney.addEventListener("click", () => {
      activeCategory = "Unlimited Money Mode";
      activePlatform = "";
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
  }

  // Reset filters
  const resetFilters = $("#resetFilters");
  if (resetFilters) {
    resetFilters.addEventListener("click", () => {
      activeCategory = "All Products";
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
  if (year) year.textContent = new Date().getFullYear();

  // Initial render and database loading
  render();
  restartBannerTimer();
  loadProductsFromSupabase();
})();
