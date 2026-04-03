// app.js — Product Import Frontend

const API_URL = "http://127.0.0.1:8000";
const POLL_INTERVAL = 1200; // ms

// Elements
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const browseLink = document.getElementById("browse-link");
const fileNameEl = document.getElementById("file-name");
const uploadBtn = document.getElementById("upload-btn");
const uploadCard = document.getElementById("upload-card");
const progressCard = document.getElementById("progress-card");
const statusBadge = document.getElementById("status-badge");
const countsEl = document.getElementById("counts");
const progressFill = document.getElementById("progress-fill");
const percentLabel = document.getElementById("percent-label");
const resetBtn = document.getElementById("reset-btn");

let selectedFile = null;
let pollTimer = null;

// ── File Selection ──────────────────────────────────────────────────────────

browseLink.addEventListener("click", () => fileInput.click());
// Don't open file picker when clicking the upload button (outside the zone)
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

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
});

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

// ── Upload ──────────────────────────────────────────────────────────────────

uploadBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading…";

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const res = await fetch(`${API_URL}/uploadfile/`, { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.detail || "Upload failed");

        showProgressCard();
        pollTask(data.task_id);
    } catch (err) {
        uploadBtn.textContent = "Upload & Process";
        uploadBtn.disabled = false;
        setFileName("Error: " + err.message, false);
    }
});

// ── Progress Polling ────────────────────────────────────────────────────────

function showProgressCard() {
    uploadCard.classList.add("hidden");
    progressCard.classList.remove("hidden");
    setProgress(0, "pending", null, null);
}

function pollTask(taskId) {
    pollTimer = setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/task/${taskId}`);
            const data = await res.json();

            // Normalize Celery state names → lowercase friendly names
            let state = (data.state || "pending").toLowerCase();
            if (state === "success") state = "completed";
            if (state === "failure") state = "failed";

            const percent = data.percent ?? 0;
            const current = data.current ?? null;
            const total = data.total ?? null;

            setProgress(percent, state, current, total);

            if (state === "completed" || state === "failed") {
                clearInterval(pollTimer);
            }
        } catch {
            // network hiccup — keep polling
        }
    }, POLL_INTERVAL);
}

function setProgress(percent, state, current, total) {
    // Badge
    statusBadge.textContent = state;
    statusBadge.className = "status-badge " + state;

    // Bar
    progressFill.style.width = percent + "%";
    progressFill.className = "progress-fill"
        + (state === "completed" ? " done" : "")
        + (state === "failed" ? " failed" : "");

    // Label
    percentLabel.textContent = percent + "%";

    // Counts
    if (current !== null && total !== null) {
        countsEl.textContent = `${current.toLocaleString()} / ${total.toLocaleString()} rows`;
    } else {
        countsEl.textContent = "";
    }
}

// ── Reset ───────────────────────────────────────────────────────────────────

resetBtn.addEventListener("click", () => {
    clearInterval(pollTimer);
    selectedFile = null;
    fileInput.value = "";
    setFileName("No file selected", false);
    uploadBtn.textContent = "Upload & Process";
    uploadBtn.disabled = true;
    progressCard.classList.add("hidden");
    uploadCard.classList.remove("hidden");
    setProgress(0, "pending", null, null);
});
