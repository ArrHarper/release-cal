/**
 * Release Tracker — fetches releases from API, renders cards, manages tabs and selection.
 */

const API_URL = "https://wistia.tools/url/fnr-01"; // Set to Retool Workflow webhook URL, or leave empty to use fallback
const FALLBACK_DATA_URL = "json-examples/releases-sample.json";

const CATEGORY_ORDER = ["now_live", "pending", "coming_soon", "on_the_horizon"];

const selectedCards = new Set();
let selectionModeActive = false;
let releasesData = null;

const elements = {
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  tabBtns: document.querySelectorAll(".tab-btn"),
  selectionModeToggle: document.getElementById("selection-mode-toggle"),
  selectionBar: document.getElementById("selection-bar"),
  selectionCount: document.getElementById("selection-count"),
  clearSelection: document.getElementById("clear-selection"),
  openPresentation: document.getElementById("open-presentation")
};

function showLoading(show) {
  elements.loading.hidden = !show;
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = !message;
}

function renderCard(card, category) {
  const div = document.createElement("div");
  div.className = "card";
  div.dataset.releaseId = String(card.release_id);
  div.dataset.category = category;

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = card.title || "Untitled";

  const channel = document.createElement("span");
  channel.className = "card-channel";
  channel.textContent = card.slack_channel || "";

  div.appendChild(title);
  div.appendChild(channel);

  if (card.plans) {
    const plans = document.createElement("p");
    plans.className = "card-plans";
    plans.textContent = card.plans;
    div.appendChild(plans);
  }

  if (card.description) {
    const desc = document.createElement("p");
    desc.className = "card-description";
    desc.textContent = card.description;
    div.appendChild(desc);
  }

  if (card.feature_brief_url) {
    const brief = document.createElement("div");
    brief.className = "card-brief";
    const link = document.createElement("a");
    link.href = card.feature_brief_url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Feature Brief";
    brief.appendChild(link);
    div.appendChild(brief);
  }

  return div;
}

function renderCategory(categoryKey, cards, container) {
  container.innerHTML = "";
  for (const card of cards) {
    const el = renderCard(card, categoryKey);
    container.appendChild(el);
  }
  syncSelectionUI(container);
  attachCardListeners(container);
}

function syncSelectionUI(container) {
  if (!container) return;
  container.querySelectorAll(".card").forEach((card) => {
    const id = card.dataset.releaseId;
    card.classList.toggle("selected", selectedCards.has(id));
    card.classList.toggle("selectable", selectionModeActive);
  });
}

function attachCardListeners(container) {
  if (!container) return;
  container.querySelectorAll(".card").forEach((card) => {
    card.replaceWith(card.cloneNode(true));
  });
  container.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      if (!selectionModeActive) return;
      const id = card.dataset.releaseId;
      if (selectedCards.has(id)) {
        selectedCards.delete(id);
      } else {
        selectedCards.add(id);
      }
      card.classList.toggle("selected", selectedCards.has(id));
      updateSelectionBar();
    });
  });
}

function updateSelectionBar() {
  const count = selectedCards.size;
  elements.selectionCount.textContent = `${count} card${count !== 1 ? "s" : ""} selected`;
  elements.openPresentation.disabled = count === 0;
}

function setSelectionMode(active) {
  selectionModeActive = active;
  elements.selectionModeToggle.textContent = active ? "Exit Selection Mode" : "Selection Mode";
  elements.selectionBar.hidden = !active;

  document.querySelectorAll(".card").forEach((card) => {
    card.classList.toggle("selectable", active);
    const id = card.dataset.releaseId;
    card.classList.toggle("selected", active && selectedCards.has(id));
  });

  if (!active) {
    selectedCards.clear();
  }
  updateSelectionBar();
}

function clearSelection() {
  selectedCards.clear();
  document.querySelectorAll(".card").forEach((card) => {
    card.classList.remove("selected");
  });
  updateSelectionBar();
}

function getSelectedReleasesByCategory() {
  if (!releasesData) return {};

  const result = {};
  for (const categoryKey of CATEGORY_ORDER) {
    const cards = releasesData[categoryKey] || [];
    const selected = cards.filter((c) => selectedCards.has(String(c.release_id)));
    if (selected.length > 0) {
      result[categoryKey] = selected;
    }
  }
  return result;
}

function switchTab(tabId) {
  const hash = `#${tabId}`;
  history.replaceState(null, "", hash);

  elements.tabBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabId}`);
  });
}

function initTabs() {
  const hash = window.location.hash.slice(1).replace(/_/g, "-");
  const validTabs = ["now-live", "pending", "coming-soon", "on-the-horizon"];
  const initialTab = validTabs.includes(hash) ? hash : "now-live";
  switchTab(initialTab);

  elements.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  window.addEventListener("hashchange", () => {
    const h = window.location.hash.slice(1).replace(/_/g, "-");
    if (validTabs.includes(h)) switchTab(h);
  });
}

async function fetchReleases() {
  const url = API_URL || FALLBACK_DATA_URL;
  if (!url) {
    throw new Error("No API URL configured. Set API_URL in app.js or add json-examples/releases-sample.json");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
}

async function loadAndRender() {
  showLoading(true);
  showError("");
  try {
    const data = await fetchReleases();
    releasesData = data;

    const panels = {
      now_live: document.getElementById("cards-now-live"),
      pending: document.getElementById("cards-pending"),
      coming_soon: document.getElementById("cards-coming-soon"),
      on_the_horizon: document.getElementById("cards-on-the-horizon")
    };

    for (const key of CATEGORY_ORDER) {
      const cards = data[key] || [];
      renderCategory(key, cards, panels[key]);
    }

    initTabs();
  } catch (err) {
    showError(err.message || "Failed to load releases");
  } finally {
    showLoading(false);
  }
}

elements.selectionModeToggle.addEventListener("click", () => {
  setSelectionMode(!selectionModeActive);
});

elements.clearSelection.addEventListener("click", clearSelection);

elements.openPresentation.addEventListener("click", () => {
  const selected = getSelectedReleasesByCategory();
  if (Object.keys(selected).length === 0) return;
  if (typeof window.openPresentation === "function") {
    window.openPresentation(selected);
  }
});

loadAndRender();
