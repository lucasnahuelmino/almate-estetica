/* Configuración visible del sitio. Los secretos y cuentas autorizadas viven en el .env del servidor. */
const SITE_CONFIG = {
  businessName: "Tu Estética",
  description: "Un espacio para volver a vos.",
  phone: "+54 11 0000-0000",
  phoneHref: "tel:+541100000000",
  email: "hola@tudominio.com",
  emailHref: "mailto:hola@tudominio.com",
  address: "Agregá la dirección del centro",
  hours: "Editá los días y horarios de atención",
  whatsapp: "",
  whatsappMessage: "Hola! Quiero hacer una consulta.",
  instagram: "",
  facebook: "",
  mainTexts: {
    heroTitle: "Un espacio para volver a vos.",
    heroSubtitle:
      "Belleza, cuidado y bienestar en un solo lugar. Descubrí una nueva forma de reservar tu momento.",
  },
  colors: {
    background: "#FAF4F1",
    surface: "#FFFFFF",
    text: "#2B2320",
    textMuted: "#8C7A74",
    accent: "#C96E88",
    accentDark: "#A84F6B",
    border: "#EDE0DB",
    onAccent: "#FFFFFF",
  },
};

function getConfigValue(path) {
  return path.split(".").reduce((value, key) => value?.[key], SITE_CONFIG);
}

function applySiteConfig() {
  document.querySelectorAll("[data-config-text]").forEach((element) => {
    const value = getConfigValue(element.getAttribute("data-config-text"));
    if (value !== undefined) element.textContent = value;
  });

  document.querySelectorAll("[data-config-href]").forEach((element) => {
    const value = getConfigValue(element.getAttribute("data-config-href"));
    if (value) {
      element.setAttribute("href", value);
      element.hidden = false;
    } else {
      element.removeAttribute("href");
      element.hidden = true;
    }
  });

  document.querySelectorAll("[data-config-aria-template]").forEach((element) => {
    const template = element.getAttribute("data-config-aria-template");
    element.setAttribute("aria-label", template.replace("{name}", SITE_CONFIG.businessName));
  });

  Object.entries(SITE_CONFIG.colors).forEach(([key, value]) => {
    const cssVariable = {
      background: "--color-background",
      surface: "--color-surface",
      text: "--color-text",
      textMuted: "--color-text-muted",
      accent: "--color-accent",
      accentDark: "--color-accent-dark",
      border: "--color-border",
      onAccent: "--color-on-accent",
    }[key];
    if (cssVariable && value) document.documentElement.style.setProperty(cssVariable, value);
  });

  const background = SITE_CONFIG.colors.background;
  if (background) {
    const value = Number.parseInt(background.slice(1), 16);
    document.documentElement.style.setProperty(
      "--color-background-rgb",
      `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`
    );
  }

  const copyright = document.getElementById("footer-copyright");
  if (copyright) {
    copyright.textContent = `© ${new Date().getFullYear()} ${SITE_CONFIG.businessName}. Todos los derechos reservados.`;
  }
}

function initWhatsappLinks() {
  const targets = [
    document.getElementById("whatsapp-cta-hero"),
    document.getElementById("whatsapp-cta-location"),
    document.getElementById("whatsapp-float"),
  ];
  const number = SITE_CONFIG.whatsapp.replace(/\D/g, "");
  targets.forEach((element) => {
    if (!element) return;
    if (!number) {
      element.hidden = true;
      return;
    }
    element.href = `https://wa.me/${number}?text=${encodeURIComponent(SITE_CONFIG.whatsappMessage)}`;
    element.target = "_blank";
    element.rel = "noopener noreferrer";
    element.hidden = false;
  });
}

function initMobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("header-nav");
  if (!toggle || !nav) return;

  const close = () => {
    nav.classList.remove("header__nav--open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú de navegación");
  };
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("header__nav--open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú de navegación" : "Abrir menú de navegación");
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) close();
  });
}

function initHeaderScroll() {
  const header = document.getElementById("site-header");
  if (!header) return;
  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function initGalleryLightbox() {
  const grid = document.getElementById("gallery-grid");
  const lightbox = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-image");
  const closeButton = document.getElementById("lightbox-close");
  if (!grid || !lightbox || !image || !closeButton) return;
  let lastFocusedElement;

  const close = () => {
    lightbox.classList.remove("lightbox--open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocusedElement?.focus();
  };
  grid.querySelectorAll(".gallery__item").forEach((item) => {
    item.addEventListener("click", () => {
      const source = item.querySelector("img");
      if (!source) return;
      image.src = source.src;
      image.alt = source.alt;
      lastFocusedElement = document.activeElement;
      lightbox.classList.add("lightbox--open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      closeButton.focus();
    });
  });
  closeButton.addEventListener("click", close);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("lightbox--open")) close();
  });
}

function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((item) => observer.observe(item));
}

function initHeroCarousel() {
  const carousel = document.getElementById("hero-carousel");
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll(".hero-carousel__slide")];
  const dots = carousel.querySelector(".hero-carousel__dots");
  const previous = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  if (slides.length < 2 || !dots || !previous || !next) return;

  let activeIndex = 0;
  let timer;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const indicators = slides.map((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hero-carousel__dot";
    button.setAttribute("aria-label", `Mostrar foto ${index + 1} de ${slides.length}`);
    button.addEventListener("click", () => {
      showSlide(index);
      start();
    });
    dots.append(button);
    return button;
  });

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === activeIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      indicators[slideIndex].classList.toggle("is-active", active);
      indicators[slideIndex].setAttribute("aria-current", String(active));
    });
  }

  function stop() {
    window.clearInterval(timer);
  }

  function start() {
    stop();
    if (!reducedMotion.matches && !document.hidden) {
      timer = window.setInterval(() => showSlide(activeIndex + 1), 5000);
    }
  }

  previous.addEventListener("click", () => {
    showSlide(activeIndex - 1);
    start();
  });
  next.addEventListener("click", () => {
    showSlide(activeIndex + 1);
    start();
  });
  carousel.addEventListener("mouseenter", stop);
  carousel.addEventListener("mouseleave", start);
  carousel.addEventListener("focusin", stop);
  carousel.addEventListener("focusout", start);
  document.addEventListener("visibilitychange", start);
  reducedMotion.addEventListener("change", start);
  showSlide(0);
  start();
}

async function requestJson(url, options) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "No se pudo completar la solicitud.");
  return body;
}

function localDateKey(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function initPublicBooking() {
  const form = document.getElementById("booking-form");
  if (!form) return;
  const serviceSelect = document.getElementById("booking-service");
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("booking-time");
  const submitButton = document.getElementById("booking-submit");
  const feedback = document.getElementById("booking-feedback");
  let timeZone = "America/Argentina/Buenos_Aires";
  let requestId = 0;

  function setFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.classList.toggle("is-error", isError);
  }

  function syncSubmitState() {
    submitButton.disabled =
      !serviceSelect.value || !dateInput.value || !timeSelect.value || timeSelect.disabled;
  }

  async function loadSlots() {
    const service = serviceSelect.value;
    const date = dateInput.value;
    const thisRequest = ++requestId;
    timeSelect.replaceChildren(new Option("Consultando disponibilidad…", ""));
    timeSelect.disabled = true;
    submitButton.disabled = true;
    if (!service || !date) {
      timeSelect.replaceChildren(new Option("Primero elegí servicio y día", ""));
      setFeedback("");
      syncSubmitState();
      return;
    }

    try {
      const query = new URLSearchParams({ date, service });
      const { slots } = await requestJson(`/api/public/availability?${query}`);
      if (thisRequest !== requestId) return;
      timeSelect.replaceChildren(
        new Option(slots.length ? "Elegí un horario" : "No hay horarios disponibles", "")
      );
      slots.forEach((slot) => timeSelect.add(new Option(slot, slot)));
      timeSelect.disabled = slots.length === 0;
      syncSubmitState();
      setFeedback(slots.length ? "Estos horarios se consultan en tiempo real." : "Probá otro día o servicio.");
    } catch (error) {
      if (thisRequest !== requestId) return;
      timeSelect.replaceChildren(new Option("Disponibilidad no disponible", ""));
      setFeedback(error.message, true);
      syncSubmitState();
    }
  }

  requestJson("/api/public/config")
    .then(({ services, timeZone: configuredTimeZone }) => {
      timeZone = configuredTimeZone;
      const currentSelection = serviceSelect.value;
      serviceSelect.replaceChildren(new Option("Elegí un servicio", ""));
      services.forEach(({ name }) => serviceSelect.add(new Option(name, name)));
      serviceSelect.value = currentSelection;
      dateInput.min = localDateKey(timeZone);
      dateInput.value = dateInput.min;
      loadSlots();
    })
    .catch((error) => {
      serviceSelect.disabled = true;
      dateInput.disabled = true;
      setFeedback(error.message, true);
    });

  serviceSelect.addEventListener("change", loadSlots);
  dateInput.addEventListener("change", loadSlots);
  timeSelect.addEventListener("change", syncSubmitState);
  document.querySelectorAll(".menu-card__book").forEach((link) => {
    link.addEventListener("click", () => {
      const service = link.getAttribute("data-service");
      if (service) {
        serviceSelect.value = service;
        loadSlots();
      }
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submitButton.disabled = true;
    setFeedback("Confirmando el turno…");
    try {
      await requestJson("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      form.reset();
      dateInput.min = localDateKey(timeZone);
      dateInput.value = dateInput.min;
      await loadSlots();
      setFeedback("¡Turno reservado! Recibimos tu solicitud de forma segura.");
    } catch (error) {
      await loadSlots();
      setFeedback(error.message, true);
    } finally {
      syncSubmitState();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applySiteConfig();
  initWhatsappLinks();
  initMobileMenu();
  initHeaderScroll();
  initGalleryLightbox();
  initScrollReveal();
  initHeroCarousel();
  initPublicBooking();
});
