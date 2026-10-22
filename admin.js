
(() => {
  "use strict";

  const SUPABASE_URL = "https://qfgzzsiwwrdzsgdkjxgx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tJrmszFYYBDt_C9dqKde_Q_GZ6lcLgl";
  const BUCKET = "banner-images";

  const $ = (id) => document.getElementById(id);

  const loginPanel = $("loginPanel");
  const appPanel = $("appPanel");
  const loginForm = $("loginForm");
  const statusBox = $("status");
  const fileInput = $("imageFile");
  const preview = $("preview");
  const uploadButton = $("uploadButton");
  const bannerList = $("bannerList");

  let client;
  let currentUser = null;
  let selectedPreviewUrl = "";

  // Show messages on the login screen as well as the admin panel.
  let loginStatus = $("loginStatus");

  if (!loginStatus && loginForm) {
    loginStatus = document.createElement("div");
    loginStatus.id = "loginStatus";
    loginStatus.className = "status";
    loginStatus.setAttribute("role", "status");
    loginStatus.textContent = "Ready to sign in.";
    loginForm.insertAdjacentElement("afterend", loginStatus);
  }

  function status(message) {
    const text = String(message || "");

    if (statusBox) statusBox.textContent = text;
    if (loginStatus) loginStatus.textContent = text;

    console.log("[NKN Banner Admin]", text);
  }

  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showLogin() {
    loginPanel?.classList.remove("hidden");
    appPanel?.classList.add("hidden");
  }

  function showApp() {
    loginPanel?.classList.add("hidden");
    appPanel?.classList.remove("hidden");
  }

  function publicImageUrl(path) {
    return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function isApprovedAdmin(userId) {
    const { data, error } = await client
      .from("banner_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  async function showSession(session) {
    currentUser = session?.user || null;

    if (!currentUser) {
      showLogin();
      return;
    }

    status("Checking admin access…");

    try {
      const approved = await isApprovedAdmin(currentUser.id);

      if (!approved) {
        await client.auth.signOut();
        currentUser = null;
        showLogin();
        status(
          "This account is not approved as a banner admin. " +
          "Check its UUID in public.banner_admins."
        );
        return;
      }

      showApp();
      status("Signed in as " + (currentUser.email || "admin"));
      await loadBanners();
    } catch (error) {
      showLogin();
      status("Admin verification failed: " + error.message);
      console.error(error);
    }
  }

  async function loadBanners() {
    status("Loading banners…");

    const { data, error } = await client
      .from("banners")
      .select("*")
      .order("section", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      status("Could not load banners: " + error.message);
      console.error(error);
      return;
    }

    if (!data || data.length === 0) {
      bannerList.innerHTML =
        "<p class='muted'>No banners added yet. Upload your first banner above.</p>";
      status("Signed in. No banners added yet.");
      return;
    }

    bannerList.innerHTML = data.map((banner) => `
      <article class="banner">
        <img
          src="${safeText(publicImageUrl(banner.image_path))}"
          alt="${safeText(banner.alt_text)}"
        >
        <div>
          <h3>${safeText(banner.alt_text || "NKN STORE Banner")}</h3>
          <small>
            ${safeText(banner.section.toUpperCase())}
            · Order ${Number(banner.sort_order) || 0}
            · ${banner.is_active ? "Active" : "Inactive"}
          </small>
          <div class="actions">
            <button class="secondary" data-action="up" data-id="${banner.id}" type="button">↑ Move up</button>
            <button class="secondary" data-action="down" data-id="${banner.id}" type="button">↓ Move down</button>
            <button class="secondary" data-action="toggle" data-id="${banner.id}" data-active="${banner.is_active}" type="button">${banner.is_active ? "Deactivate" : "Activate"}</button>
            <button class="danger" data-action="delete" data-id="${banner.id}" type="button">Delete</button>
          </div>
        </div>
      </article>
    `).join("");

    status("Banners loaded successfully.");
  }

  async function handleLogin(event) {
    event.preventDefault();

    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
      status("Enter your admin email and password.");
      return;
    }

    const submitButton = loginForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Signing in…";
    }

    status("Connecting to Supabase…");

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        status("Sign-in failed: " + error.message);
        console.error("Supabase sign-in error:", error);
        return;
      }

      if (!data.session) {
        status("Login returned no session. Please try again.");
        return;
      }

      await showSession(data.session);
    } catch (error) {
      status("Login error: " + (error.message || String(error)));
      console.error(error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Sign in";
      }
    }
  }

  async function handleUpload() {
    if (!currentUser) {
      status("Please sign in first.");
      return;
    }

    const file = fileInput.files?.[0];

    if (!file) {
      status("First choose an image from your phone.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      status("Please choose a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      status("Image must be 10 MB or smaller.");
      return;
    }

    uploadButton.disabled = true;
    status("Uploading image…");

    let uploadedPath = "";

    try {
      const section = $("section").value;
      const extension = (file.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";

      const uniqueId = (
        window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : Date.now() + "-" + Math.random().toString(36).slice(2)
      );

      uploadedPath = `${section}/${uniqueId}.${extension}`;

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(uploadedPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await client
        .from("banners")
        .insert({
          section,
          image_path: uploadedPath,
          alt_text: $("altText").value.trim(),
          sort_order: Number.parseInt($("sortOrder").value, 10) || 0,
          is_active: true
        });

      if (insertError) {
        await client.storage.from(BUCKET).remove([uploadedPath]);
        uploadedPath = "";
        throw insertError;
      }

      fileInput.value = "";
      $("altText").value = "";
      preview.classList.add("hidden");

      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
        selectedPreviewUrl = "";
      }

      status("Banner added successfully.");
      await loadBanners();
    } catch (error) {
      status("Upload failed: " + error.message);
      console.error(error);
    } finally {
      uploadButton.disabled = false;
    }
  }

  async function handleBannerAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    button.disabled = true;

    try {
      const { data: rows, error: fetchError } = await client
        .from("banners")
        .select("*")
        .order("section", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      const row = rows.find((item) => item.id === id);
      if (!row) {
        status("Banner not found.");
        return;
      }

      if (action === "delete") {
        if (!confirm("Delete this banner and its image?")) return;

        const { error: dbError } = await client
          .from("banners")
          .delete()
          .eq("id", id);

        if (dbError) throw dbError;

        const { error: storageError } = await client.storage
          .from(BUCKET)
          .remove([row.image_path]);

        status(
          storageError
            ? "Banner deleted, but image cleanup failed: " + storageError.message
            : "Banner deleted successfully."
        );

        await loadBanners();
        return;
      }

      if (action === "toggle") {
        const { error } = await client
          .from("banners")
          .update({ is_active: !row.is_active })
          .eq("id", id);

        if (error) throw error;

        status("Banner status updated.");
        await loadBanners();
        return;
      }

      const siblings = rows
        .filter((item) => item.section === row.section)
        .sort((a, b) =>
          a.sort_order - b.sort_order || a.id - b.id
        );

      const index = siblings.findIndex((item) => item.id === id);
      const otherIndex = index + (action === "up" ? -1 : 1);
      const other = siblings[otherIndex];

      if (!other) {
        status("This banner cannot move further in that direction.");
        return;
      }

      const oldOrder = row.sort_order;

      const { error: firstError } = await client
        .from("banners")
        .update({ sort_order: other.sort_order })
        .eq("id", row.id);

      if (firstError) throw firstError;

      const { error: secondError } = await client
        .from("banners")
        .update({ sort_order: oldOrder })
        .eq("id", other.id);

      if (secondError) throw secondError;

      status("Banner order updated.");
      await loadBanners();
    } catch (error) {
      status("Could not update banner: " + error.message);
      console.error(error);
    } finally {
      button.disabled = false;
    }
  }

  function showFatalError(message) {
    showLogin();
    status("Admin panel error: " + message);
    console.error(message);
  }

  // Catch unexpected JavaScript errors and rejected promises.
  window.addEventListener("error", (event) => {
    showFatalError(event.message || "Unknown JavaScript error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    showFatalError(reason?.message || String(reason || "Unknown error"));
  });

  // Check that the page and Supabase library loaded correctly.
  const requiredElements = [
    loginPanel,
    appPanel,
    loginForm,
    statusBox,
    fileInput,
    preview,
    uploadButton,
    bannerList,
    $("email"),
    $("password"),
    $("signOutButton"),
    $("section"),
    $("altText"),
    $("sortOrder")
  ];

  if (requiredElements.some((element) => !element)) {
    showFatalError("A required HTML element is missing. Check banner-admin.html IDs.");
    return;
  }

  if (!window.supabase?.createClient) {
    showFatalError("Supabase library did not load. Check your internet connection and reload the page.");
    return;
  }

  try {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    showFatalError("Could not initialize Supabase: " + error.message);
    return;
  }

  loginForm.addEventListener("submit", handleLogin);
  uploadButton.addEventListener("click", handleUpload);
  bannerList.addEventListener("click", handleBannerAction);

  $("signOutButton").addEventListener("click", async () => {
    status("Signing out…");

    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;

      currentUser = null;
      showLogin();
      status("Signed out successfully.");
    } catch (error) {
      status("Sign-out failed: " + error.message);
      console.error(error);
    }
  });

  fileInput.addEventListener("change", () => {
    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl);
      selectedPreviewUrl = "";
    }

    const file = fileInput.files?.[0];

    if (!file) {
      preview.classList.add("hidden");
      return;
    }

    if (!file.type.startsWith("image/")) {
      fileInput.value = "";
      preview.classList.add("hidden");
      status("Please choose an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      fileInput.value = "";
      preview.classList.add("hidden");
      status("Image must be 10 MB or smaller.");
      return;
    }

    selectedPreviewUrl = URL.createObjectURL(file);
    preview.src = selectedPreviewUrl;
    preview.classList.remove("hidden");
    status("Image selected. Ready to upload.");
  });

  // Restore any existing login session.
  client.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      return showSession(data.session);
    })
    .catch((error) => {
      showLogin();
      status("Could not check login session: " + error.message);
      console.error(error);
    });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      currentUser = null;
      showLogin();
    }
  });
})();
      
