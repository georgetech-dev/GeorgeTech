document.documentElement.classList.add("js");

const navToggle = document.querySelector("[data-nav-toggle]");
const primaryNav = document.querySelector("[data-primary-nav]");
const mobileNavigation = window.matchMedia("(max-width: 860px)");
let navBackdrop = null;
let lastFocusedElement = null;
const navigationHome = primaryNav ? {
  parent: primaryNav.parentNode,
  nextSibling: primaryNav.nextSibling,
} : null;

function syncNavigationContainer() {
  if (!primaryNav || !navigationHome) return;

  if (mobileNavigation.matches && primaryNav.parentNode !== document.body) {
    document.body.append(primaryNav);
  } else if (!mobileNavigation.matches && primaryNav.parentNode !== navigationHome.parent) {
    navigationHome.parent.insertBefore(primaryNav, navigationHome.nextSibling);
  }
}

function updateNavigationLabel(isOpen) {
  if (!navToggle) return;
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  const label = navToggle.querySelector(".sr-only");
  if (label) label.textContent = isOpen ? "Close navigation" : "Open navigation";
}

function closeNavigation({ restoreFocus = false } = {}) {
  if (!navToggle || !primaryNav) return;
  primaryNav.classList.remove("open");
  navBackdrop?.classList.remove("visible");
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
  updateNavigationLabel(false);

  if (restoreFocus && lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
}

function openNavigation() {
  if (!navToggle || !primaryNav) return;
  syncNavigationContainer();
  lastFocusedElement = document.activeElement;
  primaryNav.classList.add("open");
  navBackdrop?.classList.add("visible");
  document.body.classList.add("nav-open");
  navToggle.setAttribute("aria-expanded", "true");
  updateNavigationLabel(true);

  window.setTimeout(() => {
    const currentLink = primaryNav.querySelector("a.active") || primaryNav.querySelector("a");
    currentLink?.focus({ preventScroll: true });
  }, 260);
}

if (navToggle && primaryNav) {
  navBackdrop = document.createElement("button");
  navBackdrop.type = "button";
  navBackdrop.className = "nav-backdrop";
  navBackdrop.setAttribute("aria-label", "Close navigation");
  document.body.append(navBackdrop);
  syncNavigationContainer();
  updateNavigationLabel(false);

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) closeNavigation({ restoreFocus: true });
    else openNavigation();
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeNavigation();
  });

  navBackdrop.addEventListener("click", () => closeNavigation({ restoreFocus: true }));

  document.addEventListener("keydown", (event) => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeNavigation({ restoreFocus: true });
      return;
    }

    if (event.key === "Tab" && mobileNavigation.matches) {
      const focusableItems = [navToggle, ...primaryNav.querySelectorAll("a")];
      const firstItem = focusableItems[0];
      const lastItem = focusableItems[focusableItems.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }
  });

  mobileNavigation.addEventListener("change", (event) => {
    closeNavigation();
    syncNavigationContainer();
  });
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

document.querySelectorAll(".detail-grid, .contact-grid, .steps, .card-grid, .principle-columns, .service-benefits").forEach((group) => {
  [...group.children].forEach((item, index) => {
    item.classList.add("reveal");
    item.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 70}ms`);
  });
});

const observedItems = document.querySelectorAll(".section-observe, .reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible", "visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -35px" });
  observedItems.forEach((item) => observer.observe(item));
} else {
  observedItems.forEach((item) => item.classList.add("is-visible", "visible"));
}

window.requestAnimationFrame(() => document.body.classList.add("page-ready"));

const backToTop = document.createElement("button");
backToTop.type = "button";
backToTop.className = "back-to-top";
backToTop.setAttribute("aria-label", "Back to top");
backToTop.innerHTML = `
  <svg class="scroll-ring" viewBox="0 0 52 52" aria-hidden="true">
    <circle class="back-to-top-track" cx="26" cy="26" r="22"></circle>
    <circle class="back-to-top-progress" cx="26" cy="26" r="22"></circle>
  </svg>
  <svg class="scroll-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>`;
document.body.append(backToTop);

const progressCircle = backToTop.querySelector(".back-to-top-progress");
const progressLength = 2 * Math.PI * 22;
progressCircle.style.strokeDasharray = `${progressLength}`;
progressCircle.style.strokeDashoffset = `${progressLength}`;

let scrollUpdateQueued = false;
const updateScrollProgress = () => {
  const scrollableDistance = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(Math.max(window.scrollY / scrollableDistance, 0), 1);
  progressCircle.style.strokeDashoffset = `${progressLength * (1 - progress)}`;
  backToTop.classList.toggle("is-visible", window.scrollY > 420);
  scrollUpdateQueued = false;
};

const queueScrollUpdate = () => {
  if (scrollUpdateQueued) return;
  scrollUpdateQueued = true;
  window.requestAnimationFrame(updateScrollProgress);
};

window.addEventListener("scroll", queueScrollUpdate, { passive: true });
window.addEventListener("resize", queueScrollUpdate);
backToTop.addEventListener("click", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
});
updateScrollProgress();

if (!document.body.hasAttribute("data-no-chat")) {
const chatWidget = document.createElement("script");
chatWidget.src = "https://chat.georgetech.uk/widget.js";
chatWidget.dataset.site = "bcd47f2f-e479-4521-a472-2e10001f5c97";
chatWidget.async = true;
document.body.append(chatWidget);
}
