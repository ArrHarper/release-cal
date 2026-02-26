(function () {
  "use strict";

  const CATEGORY_MAP = {
    "now-live": "now_live",
    "coming-soon": "coming_soon",
    "on-the-horizon": "on_the_horizon"
  };

  const PLACEHOLDERS = {
    title: "Untitled release",
    plans: "Plans not specified",
    description: "No description provided.",
    channel: "Channel not provided",
    date: "Date TBD",
    brief: "No feature brief"
  };

  const tabButtons = Array.from(document.querySelectorAll(".tab"));
  const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const lastUpdated = document.getElementById("last-updated");

  function parseIsoDate(isoDate) {
    if (!isoDate || typeof isoDate !== "string") return null;
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function sortByExpectedDateAsc(items) {
    return [...items].sort((a, b) => {
      const aDate = parseIsoDate(a.expected_date);
      const bDate = parseIsoDate(b.expected_date);
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate - bDate;
    });
  }

  function formatExpectedDate(isoDate) {
    const date = parseIsoDate(isoDate);
    if (!date) return PLACEHOLDERS.date;
    return date.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatGeneratedAt(isoDateTime) {
    const date = new Date(isoDateTime);
    if (Number.isNaN(date.getTime())) return "Latest refresh time unavailable";
    return "Last updated " + date.toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }) + " ET";
  }

  function setStatusVisibility(isLoading, errorMessage) {
    loadingState.classList.toggle("is-hidden", !isLoading);
    if (errorMessage) {
      errorState.textContent = errorMessage;
      errorState.classList.remove("is-hidden");
    } else {
      errorState.classList.add("is-hidden");
      errorState.textContent = "";
    }
  }

  function normalizeList(data, key) {
    const list = Array.isArray(data[key]) ? data[key] : [];
    return sortByExpectedDateAsc(list);
  }

  function clearContainer(id) {
    const container = document.getElementById(id);
    container.replaceChildren();
    return container;
  }

  function renderEmpty(container) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "nothing to see here!";
    container.appendChild(empty);
  }

  function renderCards(containerId, rows) {
    const container = clearContainer(containerId);
    if (rows.length === 0) {
      renderEmpty(container);
      return;
    }

    rows.forEach((row) => {
      const card = document.createElement("article");
      card.className = "card";

      const header = document.createElement("header");
      header.className = "card-header";

      const title = document.createElement("h3");
      title.className = "card-title";
      title.textContent = row.title || PLACEHOLDERS.title;

      const channel = document.createElement("span");
      channel.className = "channel";
      channel.textContent = row.slack_channel || PLACEHOLDERS.channel;

      header.append(title, channel);

      const metaRow = document.createElement("div");
      metaRow.className = "meta-row";

      const plans = document.createElement("span");
      plans.className = "meta-label";
      plans.textContent = row.plans || PLACEHOLDERS.plans;

      const date = document.createElement("span");
      date.className = "meta-date";
      date.textContent = "Expected: " + formatExpectedDate(row.expected_date);

      metaRow.append(plans, date);

      const brief = document.createElement("div");
      brief.className = "feature-brief";
      if (row.feature_brief_url) {
        const link = document.createElement("a");
        link.href = row.feature_brief_url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Feature brief";
        brief.appendChild(link);
      } else {
        brief.classList.add("feature-brief-muted");
        brief.textContent = PLACEHOLDERS.brief;
      }

      const description = document.createElement("p");
      description.className = "description";
      description.textContent = row.description || PLACEHOLDERS.description;

      card.append(header, metaRow, brief, description);
      container.appendChild(card);
    });
  }

  function sanitizeHash(hashValue) {
    const hash = (hashValue || "").replace("#", "");
    return CATEGORY_MAP[hash] ? hash : "now-live";
  }

  function setActiveTab(tabSlug) {
    tabButtons.forEach((tab) => {
      const isActive = tab.dataset.tab === tabSlug;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.id === "panel-" + tabSlug);
    });
  }

  function setupTabEvents() {
    tabButtons.forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabSlug = tab.dataset.tab;
        window.location.hash = tabSlug;
      });
    });

    window.addEventListener("hashchange", () => {
      setActiveTab(sanitizeHash(window.location.hash));
    });
  }

  function getApiUrl() {
    const value = window.RELEASE_TRACKER_API_URL;
    if (!value || value.includes("your-retool-webhook-url-here")) return null;
    return value;
  }

  function getMockUrl() {
    const value = window.RELEASE_TRACKER_MOCK_URL;
    return typeof value === "string" && value.trim() ? value : null;
  }

  function getSourceConfig() {
    const source = (window.RELEASE_TRACKER_SOURCE || "").toLowerCase();
    if (source === "api") {
      return {
        kind: "api",
        url: getApiUrl()
      };
    }
    return {
      kind: "mock",
      url: getMockUrl()
    };
  }

  async function loadAndRender() {
    const sourceConfig = getSourceConfig();
    if (!sourceConfig.url) {
      const hint = sourceConfig.kind === "mock"
        ? "Mock URL is missing. Set window.RELEASE_TRACKER_MOCK_URL in js/config.js."
        : "API URL is missing. Set window.RELEASE_TRACKER_API_URL in js/config.js.";
      setStatusVisibility(false, hint);
      lastUpdated.textContent = "Latest refresh time unavailable";
      return;
    }

    setStatusVisibility(true, "");
    try {
      const response = await fetch(sourceConfig.url, { method: "GET" });
      if (!response.ok) {
        throw new Error("Request failed with status " + response.status);
      }
      const payload = await response.json();
      const nowLive = normalizeList(payload, "now_live");
      const comingSoon = normalizeList(payload, "coming_soon");
      const onTheHorizon = normalizeList(payload, "on_the_horizon");

      renderCards("cards-now-live", nowLive);
      renderCards("cards-coming-soon", comingSoon);
      renderCards("cards-on-the-horizon", onTheHorizon);

      const sourceLabel = sourceConfig.kind === "mock" ? "mock data" : "api";
      const generatedAt = payload.generated_at
        ? formatGeneratedAt(payload.generated_at)
        : "Last updated from " + sourceLabel;
      lastUpdated.textContent = generatedAt + " (" + sourceLabel + ")";
      setStatusVisibility(false, "");
    } catch (error) {
      setStatusVisibility(false, "Could not load releases right now. " + error.message);
      lastUpdated.textContent = "Latest refresh time unavailable";
    }
  }

  function init() {
    setupTabEvents();
    setActiveTab(sanitizeHash(window.location.hash));
    loadAndRender();
  }

  init();
})();
