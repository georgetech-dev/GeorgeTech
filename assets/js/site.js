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
