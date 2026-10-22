(() => {
  "use strict";

  // These are the same project credentials used by the current NKN STORE app.
  const SUPABASE_URL = "https://qfgzzsiwwrdzsgdkjxgx.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tJrmszFYYBDt_C9dqKde_Q_GZ6lcLgl";
  const BUCKET = "banner-images";

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = (id) => document.getElementById(id);

  const loginPanel = $("loginPanel");
  const appPanel = $("appPanel");
  const loginForm = $("loginForm");
  const statusBox = $("status");
  const fileInput = $("imageFile");
  const preview = $("preview");
  const uploadButton = $("uploadButton");
  const bannerList = $("bannerList");

  let currentUser = null;
  let selectedPreviewUrl = "";

  function status(message) {
    statusBox.textContent = message;
  }

  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
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
      loginPanel.classList.remove("hidden");
      appPanel.classList.add("hidden");
      return;
    }

    try {
      const approved = await isApprovedAdmin(currentUser.id);
      if (!approved) {
        await client.auth.signOut();
        currentUser = null;
        loginPanel.classList.remove("hidden");
        appPanel.classList.add("hidden");
        status("This account is not approved as a banner admin. Add its user UUID to public.banner_admins in Supabase.");
        return;
      }

      loginPanel.classList.add("hidden");
      appPanel.classList.remove("hidden");
      status("Signed in as " + currentUser.email);
      await loadBanners();
    } catch (error) {
      status("Could not verify admin access: " + error.message);
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    status("Signing in…");

    const { data, error } = await client.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) {
      status("Sign-in failed: " + error.message);
      return;
    }

    await showSession(data.session);
  });

  $("signOutButton").addEventListener("click", async () => {
    await client.auth.signOut();
    currentUser = null;
    appPanel.classList.add("hidden");
    loginPanel.classList.remove("hidden");
    status("Signed out.");
  });

  fileInput.addEventListener("change", () => {
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    selectedPreviewUrl = "";

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
  });

  uploadButton.addEventListener("click", async () => {
    if (!currentUser) {
      status("Please sign in first.");
      return;
    }

    const file = fileInput.files?.[0];
    if (!file) {
      status("First choose an image from your phone.");
      return;
    }

    uploadButton.disabled = true;
    status("Uploading image…");

    let uploadedPath = "";

    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      uploadedPath = `${$("section").value}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(uploadedPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await client.from("banners").insert({
        section: $("section").value,
        image_path: uploadedPath,
        alt_text: $("altText").value.trim(),
        sort_order: Number.parseInt($("sortOrder").value, 10) || 0,
        is_active: true
      });

      if (insertError) {
        await client.storage.from(BUCKET).remove([uploadedPath]);
        throw insertError;
      }

      fileInput.value = "";
      $("altText").value = "";
      preview.classList.add("hidden");
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
      selectedPreviewUrl = "";
      status("Banner added successfully.");
      await loadBanners();
    } catch (error) {
      status("Upload failed: " + error.message);
    } finally {
      uploadButton.disabled = false;
    }
  });

  async function loadBanners() {
    const { data, error } = await client
      .from("banners")
      .select("*")
      .order("section", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      status("Could not load banners: " + error.message);
      return;
    }

    if (!data?.length) {
      bannerList.innerHTML = "<p class='muted'>No banners added yet. Upload your first banner above.</p>";
      return;
    }

    bannerList.innerHTML = data.map((banner) => `
      <article class="banner">
        <img src="${safeText(publicImageUrl(banner.image_path))}" alt="${safeText(banner.alt_text)}">
        <div>
          <h3>${safeText(banner.alt_text || "NKN STORE Banner")}</h3>
          <small>${safeText(banner.section.toUpperCase())} · Order ${banner.sort_order} · ${banner.is_active ? "Active" : "Inactive"}</small>
          <div class="actions">
            <button class="secondary" data-action="up" data-id="${banner.id}">↑ Move up</button>
            <button class="secondary" data-action="down" data-id="${banner.id}">↓ Move down</button>
            <button class="secondary" data-action="toggle" data-id="${banner.id}" data-active="${banner.is_active}">${banner.is_active ? "Deactivate" : "Activate"}</button>
            <button class="danger" data-action="delete" data-id="${banner.id}" data-path="${safeText(banner.image_path)}">Delete</button>
          </div>
        </div>
      </article>
    `).join("");
  }

  bannerList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    const { data: rows, error: fetchError } = await client
      .from("banners").select("*")
      .order("section", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (fetchError) {
      status("Could not update banner: " + fetchError.message);
      return;
    }

    const row = rows.find((item) => item.id === id);
    if (!row) return;

    if (action === "delete") {
      if (!confirm("Delete this banner and its image?")) return;

      const { error: dbError } = await client.from("banners").delete().eq("id", id);
      if (dbError) {
        status("Delete failed: " + dbError.message);
        return;
      }

      const { error: storageError } = await client.storage.from(BUCKET).remove([row.image_path]);
      status(storageError ? "Banner deleted from list; image cleanup failed: " + storageError.message : "Banner deleted.");
      await loadBanners();
      return;
    }

    if (action === "toggle") {
      const { error } = await client.from("banners")
        .update({ is_active: button.dataset.active !== "true" })
        .eq("id", id);
      status(error ? "Update failed: " + error.message : "Banner status updated.");
      await loadBanners();
      return;
    }

    const siblings = rows.filter((item) => item.section === row.section)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const index = siblings.findIndex((item) => item.id === id);
    const other = siblings[index + (action === "up" ? -1 : 1)];
    if (!other) return;

    const oldOrder = row.sort_order;
    const { error: firstError } = await client.from("banners")
      .update({ sort_order: other.sort_order }).eq("id", row.id);
    const { error: secondError } = await client.from("banners")
      .update({ sort_order: oldOrder }).eq("id", other.id);

    if (firstError || secondError) {
      status("Could not reorder: " + (firstError || secondError).message);
    } else {
      status("Banner order updated.");
    }
    await loadBanners();
  });

  client.auth.getSession().then(({ data }) => showSession(data.session));
  client.auth.onAuthStateChange((_event, session) => {
    // Session UI is handled here; avoid launching another async auth request.
    if (!session) {
      currentUser = null;
      loginPanel.classList.remove("hidden");
      appPanel.classList.add("hidden");
    }
  });
})();
      
