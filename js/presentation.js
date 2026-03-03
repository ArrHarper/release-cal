/**
 * Presentation Mode — slide generation, viewer, and PNG export.
 * Works with the original app.js IIFE which exposes getSelectedReleasesByCategory on window.
 */

const CARDS_PER_SLIDE = 3;
const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;

const CATEGORY_CONFIG = {
  now_live: { label: "Now Live", headerClass: "now-live" },
  pending: { label: "Pending", headerClass: "pending" },
  coming_soon: { label: "Coming Soon", headerClass: "coming-soon" },
  on_the_horizon: { label: "On the Horizon", headerClass: "on-the-horizon" }
};

const PRESENTATION_CATEGORY_ORDER = ["now_live", "pending", "coming_soon", "on_the_horizon"];

function generateSlides(selectedByCategory) {
  const slides = [];
  for (const categoryKey of PRESENTATION_CATEGORY_ORDER) {
    const cards = selectedByCategory[categoryKey];
    if (!cards || cards.length === 0) continue;

    const config = CATEGORY_CONFIG[categoryKey];
    const chunks = [];
    for (let i = 0; i < cards.length; i += CARDS_PER_SLIDE) {
      chunks.push(cards.slice(i, i + CARDS_PER_SLIDE));
    }

    chunks.forEach((chunk, index) => {
      slides.push({
        category: categoryKey,
        categoryLabel: config.label,
        headerClass: config.headerClass,
        isContinuation: index > 0,
        cards: chunk
      });
    });
  }
  return slides;
}

function renderSlideToDOM(slide) {
  const slideEl = document.createElement("div");
  slideEl.className = "slide";

  const headerLabel = slide.isContinuation
    ? `${slide.categoryLabel} (cont.)`
    : slide.categoryLabel;

  const header = document.createElement("div");
  header.className = `slide-header ${slide.headerClass}`;
  header.textContent = headerLabel;
  slideEl.appendChild(header);

  const cardsContainer = document.createElement("div");
  cardsContainer.className = "slide-cards";

  for (const card of slide.cards) {
    const cardEl = document.createElement("div");
    cardEl.className = "slide-card";

    const title = document.createElement("h3");
    title.className = "slide-card-title";
    title.textContent = card.title || "Untitled";
    cardEl.appendChild(title);

    if (card.slack_channel) {
      const channel = document.createElement("span");
      channel.className = "slide-card-channel";
      channel.textContent = card.slack_channel;
      cardEl.appendChild(channel);
    }

    if (card.plans) {
      const plans = document.createElement("p");
      plans.className = "slide-card-plans";
      plans.textContent = card.plans;
      cardEl.appendChild(plans);
    }

    if (card.description) {
      const desc = document.createElement("p");
      desc.className = "slide-card-description";
      desc.textContent = card.description;
      cardEl.appendChild(desc);
    }

    if (card.feature_brief_url) {
      const brief = document.createElement("div");
      brief.className = "slide-card-brief";
      const link = document.createElement("a");
      link.href = card.feature_brief_url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Feature Brief";
      brief.appendChild(link);
      cardEl.appendChild(brief);
    }

    cardsContainer.appendChild(cardEl);
  }

  slideEl.appendChild(cardsContainer);
  return slideEl;
}

let slideElements = [];
let currentSlideIndex = 0;
let keyHandler = null;
let resizeHandler = null;

function getSlideFilename(slideIndex) {
  const slide = slideElements[slideIndex];
  if (!slide) return `release-update-${slideIndex + 1}.png`;
  const header = slide.querySelector(".slide-header");
  const rawLabel = header
    ? header.textContent.replace(/\s*\(cont\.\)\s*/, "").trim().toLowerCase().replace(/\s+/g, "-")
    : "slide";
  const categorySlug = rawLabel.replace(/[^a-z0-9-]/g, "");
  return `release-update-${categorySlug}-${slideIndex + 1}.png`;
}

function updateSlideView() {
  const container = document.getElementById("presentation-slide-container");
  const viewport = container.closest(".presentation-viewport");
  container.innerHTML = "";
  const current = slideElements[currentSlideIndex];
  if (current) {
    container.appendChild(current.cloneNode(true));
  }

  document.getElementById("slide-counter").textContent =
    `${currentSlideIndex + 1} / ${slideElements.length}`;

  const scale = Math.min(
    viewport.clientWidth / SLIDE_WIDTH,
    viewport.clientHeight / SLIDE_HEIGHT
  );
  container.style.transform = `scale(${scale})`;
}

function handleKeydown(e) {
  if (e.key === "Escape") {
    closePresentationOverlay();
    return;
  }
  if (e.key === "ArrowLeft" && currentSlideIndex > 0) {
    currentSlideIndex--;
    updateSlideView();
    return;
  }
  if (e.key === "ArrowRight" && currentSlideIndex < slideElements.length - 1) {
    currentSlideIndex++;
    updateSlideView();
  }
}

function closePresentationOverlay() {
  const overlay = document.getElementById("presentation-overlay");
  overlay.classList.add("is-hidden");
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
}

function openPresentation(selectedByCategory) {
  const slides = generateSlides(selectedByCategory);
  if (slides.length === 0) return;

  const offScreen = document.getElementById("presentation-slides-offscreen");
  offScreen.innerHTML = "";
  slideElements = slides.map((s) => renderSlideToDOM(s));
  slideElements.forEach((el) => offScreen.appendChild(el));
  currentSlideIndex = 0;

  const overlay = document.getElementById("presentation-overlay");
  overlay.classList.remove("is-hidden");

  const container = document.getElementById("presentation-slide-container");
  const viewport = container.closest(".presentation-viewport");
  container.style.width = `${SLIDE_WIDTH}px`;
  container.style.height = `${SLIDE_HEIGHT}px`;

  updateSlideView();

  keyHandler = handleKeydown;
  document.addEventListener("keydown", keyHandler);

  document.getElementById("slide-prev").onclick = () => {
    if (currentSlideIndex > 0) {
      currentSlideIndex--;
      updateSlideView();
    }
  };

  document.getElementById("slide-next").onclick = () => {
    if (currentSlideIndex < slideElements.length - 1) {
      currentSlideIndex++;
      updateSlideView();
    }
  };

  document.getElementById("close-presentation").onclick = closePresentationOverlay;

  document.getElementById("export-current-slide").onclick = () => {
    const el = slideElements[currentSlideIndex];
    if (el) exportCurrentSlide(el, getSlideFilename(currentSlideIndex));
  };

  document.getElementById("export-all-slides").onclick = () => {
    exportAllSlides(slideElements);
  };

  resizeHandler = () => {
    const s = Math.min(
      viewport.clientWidth / SLIDE_WIDTH,
      viewport.clientHeight / SLIDE_HEIGHT
    );
    container.style.transform = `scale(${s})`;
  };
  window.addEventListener("resize", resizeHandler);
}

function exportCurrentSlide(slideEl, filename) {
  if (typeof html2canvas === "undefined") {
    alert("html2canvas is not loaded. Check CDN script.");
    return;
  }
  html2canvas(slideEl, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    scale: 1,
    useCORS: true,
    logging: false
  }).then((canvas) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

async function exportAllSlides(slideEls) {
  if (typeof html2canvas === "undefined" || typeof JSZip === "undefined") {
    alert("html2canvas or JSZip is not loaded. Check CDN scripts.");
    return;
  }
  const zip = new JSZip();
  for (let i = 0; i < slideEls.length; i++) {
    const canvas = await html2canvas(slideEls[i], {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      scale: 1,
      useCORS: true,
      logging: false
    });
    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    zip.file(getSlideFilename(i), base64, { base64: true });
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.download = "release-update-slides.zip";
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

window.openPresentation = openPresentation;
