/**
 * Gabriel Family Clinic v2.0
 * Static Landing Page Interactions
 *
 * - Smooth anchor scrolling
 * - Mobile nav toggle
 * - Senior mode (A+) toggle with persistence
 * - Quick booking + contact form validation with friendly toasts
 * - Lightweight in-view animations (guarded by prefers-reduced-motion)
 */

(function () {
  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  }

  /* ------------------------------------------------------------------------
   * Smooth Scrolling for Anchor Links
   * --------------------------------------------------------------------- */

  function handleSmoothScrollClick(event) {
    const targetId = event.currentTarget.getAttribute("data-target") ||
      event.currentTarget.getAttribute("href");

    if (!targetId || !targetId.startsWith("#")) return;

    const targetEl = qs(targetId);
    if (!targetEl) return;

    event.preventDefault();
    scrollToElement(targetEl);
  }

  function scrollToElement(el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 72;

    if (prefersReducedMotion) {
      window.scrollTo(0, top);
      return;
    }

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  }

  function initSmoothScroll() {
    const links = qsa(".js-scroll");
    links.forEach((link) => {
      link.addEventListener("click", handleSmoothScrollClick);
    });

    const navLinks = qsa('.navbar-links a[href^="#"]');
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        closeMobileNav();
      });
    });
  }

  /* ------------------------------------------------------------------------
   * Mobile Navigation Toggle
   * --------------------------------------------------------------------- */

  let navbarMenu;
  let navbarToggle;

  function openMobileNav() {
    if (!navbarMenu || !navbarToggle) return;
    navbarMenu.classList.add("is-open");
    navbarToggle.setAttribute("aria-expanded", "true");
  }

  function closeMobileNav() {
    if (!navbarMenu || !navbarToggle) return;
    navbarMenu.classList.remove("is-open");
    navbarToggle.setAttribute("aria-expanded", "false");
  }

  function toggleMobileNav() {
    if (!navbarMenu) return;
    if (navbarMenu.classList.contains("is-open")) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  }

  function initMobileNav() {
    navbarMenu = qs("[data-navbar-menu]");
    navbarToggle = qs(".navbar-toggle");
    if (!navbarMenu || !navbarToggle) return;

    navbarToggle.addEventListener("click", toggleMobileNav);

    document.addEventListener("click", (e) => {
      if (!navbarMenu.classList.contains("is-open")) return;
      const withinNav = navbarMenu.contains(e.target);
      const withinToggle = navbarToggle.contains(e.target);
      if (!withinNav && !withinToggle) {
        closeMobileNav();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navbarMenu.classList.contains("is-open")) {
        closeMobileNav();
      }
    });
  }

  /* ------------------------------------------------------------------------
   * Senior Mode Toggle (A+)
   * --------------------------------------------------------------------- */

  const SENIOR_KEY = "gfc_senior_mode";

  function applySeniorModeFromStorage() {
    try {
      const stored = window.localStorage.getItem(SENIOR_KEY);
      if (stored === "on") {
        document.body.classList.add("senior-mode");
        syncSeniorToggle(true);
      }
    } catch {
      // ignore
    }
  }

  function syncSeniorToggle(isOn) {
    const toggle = qs(".senior-toggle");
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", isOn ? "true" : "false");
  }

  function toggleSeniorMode() {
    const isOn = document.body.classList.toggle("senior-mode");
    syncSeniorToggle(isOn);
    try {
      window.localStorage.setItem(SENIOR_KEY, isOn ? "on" : "off");
    } catch {
      // ignore
    }
    showToast(
      isOn
        ? "Senior-friendly mode enabled: larger text & higher contrast."
        : "Senior-friendly mode disabled."
    );
  }

  function initSeniorMode() {
    applySeniorModeFromStorage();
    const toggle = qs(".senior-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", toggleSeniorMode);
  }

  /* ------------------------------------------------------------------------
   * Toast Notifications
   * --------------------------------------------------------------------- */

  let toastTimeout;

  function showToast(message) {
    const toast = qs("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2600);
  }

  /* ------------------------------------------------------------------------
   * Form Validation Helpers
   * --------------------------------------------------------------------- */

  function setError(inputId, message) {
    const errorEl = qs('[data-error-for="' + inputId + '"]');
    if (errorEl) {
      errorEl.textContent = message || "";
    }
  }

  function clearErrors(form) {
    const errors = qsa(".field-error", form);
    errors.forEach((e) => {
      e.textContent = "";
    });
  }

  function getValue(id) {
    const el = qs("#" + id);
    return el ? el.value.trim() : "";
  }

  function validatePhoneSG(phone) {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, "");
    // Simple, forgiving: SG mobile typically 8 digits starting with 8 or 9 (plus some 6)
    if (digits.length !== 8) return false;
    const first = digits.charAt(0);
    return first === "8" || first === "9" || first === "6";
  }

  function validateEmail(email) {
    if (!email) return false;
    // Simple, robust-enough regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /* ------------------------------------------------------------------------
   * Quick Booking Form
   * --------------------------------------------------------------------- */

  function initQuickBookingForm() {
    const form = qs("#quick-booking-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      clearErrors(form);

      const name = getValue("qb-name");
      const phone = getValue("qb-phone");
      const reason = getValue("qb-reason");
      const slot = getValue("qb-slot");

      let valid = true;

      if (!name) {
        setError("qb-name", "Please enter your full name.");
        valid = false;
      }

      if (!validatePhoneSG(phone)) {
        setError("qb-phone", "Enter a valid Singapore mobile number (8 digits).");
        valid = false;
      }

      if (!reason) {
        setError("qb-reason", "Select a reason for your visit.");
        valid = false;
      }

      if (!slot) {
        setError("qb-slot", "Select a preferred slot.");
        valid = false;
      }

      if (!valid) return;

      form.reset();
      showToast(
        "Thank you, we’ve recorded your request. Our team will call to confirm your slot."
      );
    });
  }

  /* ------------------------------------------------------------------------
   * Contact Form
   * --------------------------------------------------------------------- */

  function initContactForm() {
    const form = qs("#contact-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      clearErrors(form);

      const name = getValue("cf-name");
      const email = getValue("cf-email");
      const message = getValue("cf-message");

      let valid = true;

      if (!name) {
        setError("cf-name", "Please enter your name.");
        valid = false;
      }

      if (!validateEmail(email)) {
        setError("cf-email", "Enter a valid email address.");
        valid = false;
      }

      if (!message || message.length < 8) {
        setError("cf-message", "Tell us a bit more so we can assist you.");
        valid = false;
      }

      if (!valid) return;

      form.reset();
      showToast("Thank you. Your message has been recorded.");
    });
  }

  /* ------------------------------------------------------------------------
   * In-view Animations (optional, minimal)
   * --------------------------------------------------------------------- */

  function initInViewAnimations() {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      return;
    }

    const observed = qsa(
      ".section, .card-soft, .card-elevated, .doctor-card, .step, .testimonial"
    );

    observed.forEach((el) => {
      el.classList.add("fade-in");
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
      }
    );

    observed.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
   * Footer Year
   * --------------------------------------------------------------------- */

  function setCurrentYear() {
    const yearEl = qs("#year");
    if (!yearEl) return;
    yearEl.textContent = new Date().getFullYear().toString();
  }

  /* ------------------------------------------------------------------------
   * Init
   * --------------------------------------------------------------------- */

  function init() {
    initSmoothScroll();
    initMobileNav();
    initSeniorMode();
    initQuickBookingForm();
    initContactForm();
    initInViewAnimations();
    setCurrentYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();