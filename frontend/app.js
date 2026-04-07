// ── app.js — ProductFlow Frontend ─────────────────────────────────────────

const API_URL = "http://127.0.0.1:8000";
const POLL_INTERVAL = 1200; // ms

// ── Element refs ──────────────────────────────────────────────────────────

// Navigation
const navImport    = document.getElementById("nav-import");
const navProducts  = document.getElementById("nav-products");
const tabImport    = document.getElementById("tab-import");
const tabProducts  = document.getElementById("tab-products");
const sidebar      = document.getElementById("sidebar");
const hamburger    = document.getElementById("hamburger");
const apiStatusBadge = document.getElementById("api-status-badge");

// Import tab
const dropZone     = document.getElementById("drop-zone");
const fileInput    = document.getElementById("file-input");
const browseLink   = document.getElementById("browse-link");
const fileNameEl   = document.getElementById("file-name");
const uploadBtn    = document.getElementById("upload-btn");
const uploadCard   = document.getElementById("upload-card");
const progressCard = document.getElementById("progress-card");
const statusBadge  = document.getElementById("status-badge");
const stageLabel   = document.getElementById("stage-label");
const progressFill = document.getElementById("progress-fill");
const countsEl     = document.getElementById("counts");
const percentLabel = document.getElementById("percent-label");
const resetBtn     = document.getElementById("reset-btn");

// Products tab
const refreshBtn    = document.getElementById("refresh-btn");
const deleteAllBtn  = document.getElementById("delete-all-btn");
const addProductBtn = document.getElementById("add-product-btn");
const emptyAddBtn   = document.getElementById("empty-add-btn");
const productsTbody = document.getElementById("products-tbody");
const tableEmpty    = document.getElementById("table-empty");
const searchInput   = document.getElementById("search-input");
const prevBtn       = document.getElementById("prev-btn");
const nextBtn       = document.getElementById("next-btn");
const pageIndicator = document.getElementById("page-indicator");
const statTotal     = document.getElementById("stat-total");
const statPage      = document.getElementById("stat-page");
const statSize      = document.getElementById("stat-size");

// Modal
const modalOverlay  = document.getElementById("modal-overlay");
const productModal  = document.getElementById("product-modal");
const modalTitle    = document.getElementById("modal-title");
const modalClose    = document.getElementById("modal-close");
const modalCancel   = document.getElementById("modal-cancel");
const modalSubmit   = document.getElementById("modal-submit");
const productForm   = document.getElementById("product-form");
const editIdInput   = document.getElementById("edit-id");
const fSku          = document.getElementById("f-sku");
const fPrice        = document.getElementById("f-price");
const fName         = document.getElementById("f-name");
const fDesc         = document.getElementById("f-desc");
const formError     = document.getElementById("form-error");

// Confirm dialog
const confirmOverlay = document.getElementById("confirm-overlay");
const confirmTitle   = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmCancel  = document.getElementById("confirm-cancel");
const confirmOk      = document.getElementById("confirm-ok");

// Toast
const toastContainer = document.getElementById("toast-container");

// ── State ─────────────────────────────────────────────────────────────────

let selectedFile  = null;
let pollTimer     = null;
let currentPage   = 1;
const PAGE_SIZE   = 50;
let allProducts   = [];  // raw fetched list for client-side filter
let isEditing     = false;
let confirmResolve = null;

// ══════════════════════════════════════════════════════════════════════════
// Navigation
// ══════════════════════════════════════════════════════════════════════════

function switchTab(tab) {
  const tabs = { import: tabImport, products: tabProducts };
  const navs = { import: navImport, products: navProducts };

  Object.entries(tabs).forEach(([key, el]) => {
    el.classList.toggle("active", key === tab);
    navs[key].classList.toggle("active", key === tab);
  });

  if (tab === "products") loadProducts();
}

navImport.addEventListener("click",   () => switchTab("import"));
navProducts.addEventListener("click", () => switchTab("products"));

// Mobile sidebar toggle
hamburger.addEventListener("click", () => sidebar.classList.toggle("open"));

document.addEventListener("click", (e) => {
  if (sidebar.classList.contains("open")
      && !sidebar.contains(e.target)
      && !hamburger.contains(e.target)) {
    sidebar.classList.remove("open");
  }
});

// ══════════════════════════════════════════════════════════════════════════
// API health ping
// ══════════════════════════════════════════════════════════════════════════

async function checkApi() {
  try {
    const res = await fetch(`${API_URL}/`, { signal: AbortSignal.timeout(3000) });
    apiStatusBadge.className = res.ok ? "api-badge online" : "api-badge offline";
  } catch {
    apiStatusBadge.className = "api-badge offline";
  }
}

checkApi();
setInterval(checkApi, 30_000);

// ══════════════════════════════════════════════════════════════════════════
// Import Tab — File selection
// ══════════════════════════════════════════════════════════════════════════

browseLink.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("click", (e) => {
  if (e.target === uploadBtn) return;
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (!file.name.endsWith(".csv")) {
    setFileName("Only .csv files are supported.", false);
    uploadBtn.disabled = true;
    selectedFile = null;
    return;
  }
  selectedFile = file;
  setFileName(file.name, true);
  uploadBtn.disabled = false;
}

function setFileName(name, ready) {
  fileNameEl.textContent = name;
  fileNameEl.className = "file-name" + (ready ? " ready" : "");
}

// ── Upload ────────────────────────────────────────────────────────────────

uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Uploading…`;

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const res  = await fetch(`${API_URL}/uploadfile/`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");

    showProgressCard();
    pollTask(data.task_id);
  } catch (err) {
    uploadBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> Upload &amp; Process`;
    uploadBtn.disabled = false;
    setFileName("Error: " + err.message, false);
    toast("Upload failed: " + err.message, "error");
  }
});

// ── Progress polling ──────────────────────────────────────────────────────

function showProgressCard() {
  uploadCard.classList.add("hidden");
  progressCard.classList.remove("hidden");
  setProgress(0, "pending", null, null, "Initializing…");
}

function pollTask(taskId) {
  pollTimer = setInterval(async () => {
    try {
      const res  = await fetch(`${API_URL}/task/${taskId}`);
      const data = await res.json();

      let state = (data.state || "pending").toLowerCase();
      if (state === "success")  state = "completed";
      if (state === "failure")  state = "failed";

      const percent = data.percent ?? 0;
      const current = data.current ?? null;
      const total   = data.total   ?? null;
      const stage   = data.stage   ?? null;

      setProgress(percent, state, current, total, stage);

      if (state === "completed") {
        clearInterval(pollTimer);
        toast(`Import complete — ${data.result?.inserted ?? "?"} products inserted`, "success");
      }
      if (state === "failed") {
        clearInterval(pollTimer);
        toast("Import failed. Check server logs.", "error");
      }
    } catch {
      // network hiccup — keep polling
    }
  }, POLL_INTERVAL);
}

function setProgress(percent, state, current, total, stage) {
  statusBadge.textContent = state;
  statusBadge.className   = "status-badge " + state;

  progressFill.style.width = percent + "%";
  progressFill.className   = "progress-fill"
    + (state === "completed" ? " done" : "")
    + (state === "failed"    ? " failed" : "");

  percentLabel.textContent = percent + "%";
  stageLabel.textContent   = stage ?? "Processing…";

  if (current !== null && total !== null) {
    countsEl.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} rows`;
  } else {
    countsEl.textContent = "";
  }
}

resetBtn.addEventListener("click", () => {
  clearInterval(pollTimer);
  selectedFile = null;
  fileInput.value = "";
  setFileName("No file selected", false);
  uploadBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg> Upload &amp; Process`;
  uploadBtn.disabled = true;
  progressCard.classList.add("hidden");
  uploadCard.classList.remove("hidden");
  setProgress(0, "pending", null, null, "Initializing…");
});

// ══════════════════════════════════════════════════════════════════════════
// Products Tab
// ══════════════════════════════════════════════════════════════════════════

async function loadProducts() {
  showSkeletons();
  tableEmpty.classList.add("hidden");

  try {
    const res  = await fetch(`${API_URL}/items?page=${currentPage}&page_size=${PAGE_SIZE}`);
    const data = await res.json();

    allProducts = Array.isArray(data) ? data : [];
    renderProducts(allProducts);
    updatePagination();

  } catch (err) {
    showError("Failed to load products: " + err.message);
  }
}

function showSkeletons() {
  productsTbody.innerHTML = `
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
    <tr class="skeleton-row"><td colspan="6"><div class="skeleton"></div></td></tr>
  `;
}

function renderProducts(products) {
  // Apply client-side filter
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q
    ? products.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku  || "").toLowerCase().includes(q)
      )
    : products;

  statTotal.textContent = filtered.length || 0;
  statPage.textContent  = currentPage;
  statSize.textContent  = PAGE_SIZE;

  if (filtered.length === 0) {
    productsTbody.innerHTML = "";
    tableEmpty.classList.remove("hidden");
    return;
  }

  tableEmpty.classList.add("hidden");

  productsTbody.innerHTML = filtered.map(p => `
    <tr data-id="${p.id}">
      <td>${p.id}</td>
      <td class="sku">${esc(p.sku)}</td>
      <td class="name">${esc(p.name)}</td>
      <td title="${esc(p.description)}">${esc(p.description)}</td>
      <td class="price">$${Number(p.price).toFixed(2)}</td>
      <td>
        <div class="row-actions">
          <button class="action-btn edit" data-id="${p.id}" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn del" data-id="${p.id}" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  // Row action listeners
  productsTbody.querySelectorAll(".action-btn.edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      const product = allProducts.find(p => p.id === id);
      if (product) openEditModal(product);
    });
  });

  productsTbody.querySelectorAll(".action-btn.del").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      const product = allProducts.find(p => p.id === id);
      confirmDelete(id, product?.name || `ID ${id}`);
    });
  });
}

function showError(msg) {
  productsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--error)">${esc(msg)}</td></tr>`;
}

function updatePagination() {
  pageIndicator.textContent = `Page ${currentPage}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = allProducts.length < PAGE_SIZE;
}

// ── Pagination ────────────────────────────────────────────────────────────

prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; loadProducts(); }});
nextBtn.addEventListener("click", () => { currentPage++; loadProducts(); });

// ── Search ────────────────────────────────────────────────────────────────

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderProducts(allProducts), 200);
});

// ── Refresh ───────────────────────────────────────────────────────────────

refreshBtn.addEventListener("click", () => {
  currentPage = 1;
  loadProducts();
});

// ── Empty-state add button ────────────────────────────────────────────────
emptyAddBtn.addEventListener("click", openAddModal);

// ══════════════════════════════════════════════════════════════════════════
// Modal — Add / Edit
// ══════════════════════════════════════════════════════════════════════════

addProductBtn.addEventListener("click", openAddModal);

function openAddModal() {
  isEditing = false;
  modalTitle.textContent   = "Add Product";
  modalSubmit.textContent  = "Save Product";
  editIdInput.value = "";
  fSku.value = fName.value = fDesc.value = fPrice.value = "";
  fSku.disabled = false;
  hideFormError();
  openModal();
}

function openEditModal(product) {
  isEditing = true;
  modalTitle.textContent  = "Edit Product";
  modalSubmit.textContent = "Save Changes";
  editIdInput.value = product.id;
  fSku.value   = product.sku;
  fName.value  = product.name;
  fDesc.value  = product.description;
  fPrice.value = product.price;
  fSku.disabled = true; // SKU can't be changed via PATCH
  hideFormError();
  openModal();
}

function openModal() {
  modalOverlay.classList.remove("hidden");
  fName.focus();
}

function closeModal() {
  modalOverlay.classList.add("hidden");
}

modalClose.addEventListener("click",  closeModal);
modalCancel.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });

// ── Form submit ───────────────────────────────────────────────────────────

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFormError();

  const name  = fName.value.trim();
  const sku   = fSku.value.trim();
  const desc  = fDesc.value.trim();
  const price = parseFloat(fPrice.value);

  if (!name || (!isEditing && !sku) || !desc || isNaN(price) || price < 0) {
    showFormError("Please fill in all required fields correctly.");
    return;
  }

  modalSubmit.disabled = true;
  modalSubmit.textContent = "Saving…";

  try {
    let res, data;

    if (isEditing) {
      const id = parseInt(editIdInput.value);
      res  = await fetch(`${API_URL}/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc, price })
      });
    } else {
      res  = await fetch(`${API_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, name, description: desc, price })
      });
    }

    data = await res.json();

    if (!res.ok) {
      const msg = data?.detail || data?.error || "Request failed";
      showFormError(msg);
    } else {
      closeModal();
      toast(isEditing ? "Product updated" : "Product created", "success");
      loadProducts();
    }

  } catch (err) {
    showFormError("Network error: " + err.message);
  } finally {
    modalSubmit.disabled = false;
    modalSubmit.textContent = isEditing ? "Save Changes" : "Save Product";
  }
});

// ══════════════════════════════════════════════════════════════════════════
// Delete
// ══════════════════════════════════════════════════════════════════════════

async function confirmDelete(id, name) {
  const ok = await showConfirm(
    "Delete Product",
    `Are you sure you want to delete <strong>${esc(name)}</strong>? This cannot be undone.`
  );
  if (!ok) return;

  try {
    const res  = await fetch(`${API_URL}/items/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Delete failed");
    toast("Product deleted", "success");
    loadProducts();
  } catch (err) {
    toast("Delete failed: " + err.message, "error");
  }
}

// ── Delete all ────────────────────────────────────────────────────────────

deleteAllBtn.addEventListener("click", async () => {
  const ok = await showConfirm(
    "Delete All Products",
    "This will permanently delete <strong>all products</strong> in the database. Are you sure?"
  );
  if (!ok) return;

  try {
    const res  = await fetch(`${API_URL}/items`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Failed");
    toast("All products deleted", "success");
    currentPage = 1;
    loadProducts();
  } catch (err) {
    toast("Failed: " + err.message, "error");
  }
});

// ══════════════════════════════════════════════════════════════════════════
// Confirm Dialog
// ══════════════════════════════════════════════════════════════════════════

function showConfirm(title, message) {
  return new Promise((resolve) => {
    confirmTitle.textContent   = title;
    confirmMessage.innerHTML   = message;
    confirmOverlay.classList.remove("hidden");
    confirmResolve = resolve;
  });
}

confirmCancel.addEventListener("click", () => {
  confirmOverlay.classList.add("hidden");
  if (confirmResolve) confirmResolve(false);
});

confirmOk.addEventListener("click", () => {
  confirmOverlay.classList.add("hidden");
  if (confirmResolve) confirmResolve(true);
});

confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.add("hidden");
    if (confirmResolve) confirmResolve(false);
  }
});

// ══════════════════════════════════════════════════════════════════════════
// Toast notifications
// ══════════════════════════════════════════════════════════════════════════

function toast(message, type = "info") {
  const icons = {
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `${icons[type] || icons.info} ${esc(message)}`;
  el.addEventListener("click", () => el.remove());
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ══════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showFormError(msg)  { formError.textContent = msg; formError.classList.remove("hidden"); }
function hideFormError()     { formError.classList.add("hidden"); formError.textContent = ""; }

// ── Spinner keyframe (injected for upload button) ─────────────────────────
const style = document.createElement("style");
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
