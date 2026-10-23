/* ==========================================================================
   ALMA ESTÉTICA & SPA — script.js
   ETAPA 8: Sistema de configuración

   Qué hace este archivo (8 bloques, cada uno independiente):

     1. SITE_CONFIG: TODOS los datos del negocio, en un solo lugar
     2. Aplicar SITE_CONFIG: vuelca esos datos en el HTML automáticamente
     3. WhatsApp: arma los links usando el número de SITE_CONFIG
     4. Menú mobile: abrir/cerrar el panel de navegación
     5. Header: le agrega una clase cuando el usuario hace scroll
     6. Galería: abre/cierra el lightbox al hacer click en una foto
     7. Scroll reveal: hace aparecer bloques suavemente al hacer scroll
     8. Reserva de turnos: arma el mensaje de WhatsApp del formulario
   ========================================================================== */


/* ==========================================================================
   1. SITE_CONFIG
   ✅ ESTE ES EL ÚNICO LUGAR QUE HAY QUE TOCAR PARA CONVERTIR ESTA
   PLANTILLA EN LA WEB DE OTRO CLIENTE.

   No hace falta buscar "Alma Estética & Spa" ni el teléfono en ningún
   otro archivo: cambiá los valores de acá abajo y el sitio entero
   (textos, links de contacto, redes, colores) se actualiza solo.

   IMPORTANTE: los metadatos para buscadores y redes sociales (el
   <title>, la meta description, las etiquetas Open Graph y el JSON-LD
   de la Etapa 6, en el <head> de index.html) NO se actualizan
   automáticamente desde acá. Eso es intencional: Google y Facebook no
   siempre ejecutan JavaScript antes de leer esa información, así que
   esos datos tienen que seguir escritos directamente en el HTML. El
   README (Etapa 9) explica paso a paso dónde tocar cada cosa.
   ========================================================================== */
const SITE_CONFIG = {

  // --- Identidad ---
  businessName: "Alma Estética & Spa",
  description: "Tu momento, sin apuro.",

  // --- Contacto ---
  // "phone" es lo que se VE en pantalla. "phoneHref" es el mismo
  // número en formato para el atributo href="tel:...": sin espacios,
  // sin guiones, con el +54 al principio.
  phone: "+54 11 0000-0000",
  phoneHref: "tel:+541100000000",

  email: "hola@almaestetica.com.ar",
  emailHref: "mailto:hola@almaestetica.com.ar",

  address: "Av. Cabildo 2340, Buenos Aires",
  hours: "Mar. a Sáb. de 9:00 a 19:00 hs",

  // --- WhatsApp ---
  // Solo dígitos, con el código de país, sin "+" ni espacios.
  whatsapp: "541100000000",
  whatsappMessage: "Hola! Quiero reservar un turno.",

  // --- Redes sociales (poné la URL completa del perfil) ---
  instagram: "https://www.instagram.com/almaestetica",
  facebook: "https://www.facebook.com/almaestetica",

  // --- Textos principales ---
  // Los títulos y bajadas más importantes del sitio. El resto del
  // contenido (servicios, testimonios, galería) se edita directamente
  // en el HTML — ver el README para esa parte.
  mainTexts: {
    heroTitle: "Tu momento, sin apuro.",
    heroSubtitle:
      "Manicura, depilación, faciales, masajes y maquillaje. Reservá tu " +
      "turno online en segundos, sin llamadas ni esperas.",
  },

  // --- Colores ---
  // Las mismas variables que existen en :root de style.css. Cambiarlas
  // acá pisa el valor del CSS al cargar la página, así que rebrandear
  // el sitio para otro cliente es tocar estos 8 valores y nada más.
  // Paleta suave: blush + rosa viejo (primera plantilla de fondo claro
  // del sistema — las otras dos son de fondo oscuro).
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


/* ==========================================================================
   2. APLICAR SITE_CONFIG AL HTML
   No hay que tocar nada acá abajo para personalizar el sitio — esta
   parte es "motor", no "datos". Busca en el HTML los elementos
   marcados con data-config-text / data-config-href y les pone el
   valor que corresponda de SITE_CONFIG.
   ========================================================================== */

// Permite usar rutas como "mainTexts.heroTitle" para leer valores anidados
function getConfigValue(path) {
  return path
    .split(".")
    .reduce((value, key) => (value ? value[key] : undefined), SITE_CONFIG);
}

// <h1 data-config-text="mainTexts.heroTitle">...</h1> → le pone el texto
function applyConfigText() {
  document.querySelectorAll("[data-config-text]").forEach((el) => {
    const value = getConfigValue(el.getAttribute("data-config-text"));
    if (value !== undefined) el.textContent = value;
  });
}

// <a data-config-href="instagram">...</a> → le pone el href
function applyConfigHref() {
  document.querySelectorAll("[data-config-href]").forEach((el) => {
    const value = getConfigValue(el.getAttribute("data-config-href"));
    if (value !== undefined) el.setAttribute("href", value);
  });
}

// <a aria-label="..." data-config-aria-template="{name} - Inicio">
// El "{name}" del template se reemplaza por SITE_CONFIG.businessName.
// Es el mismo mecanismo que data-config-text / data-config-href, pero
// para aria-label — así funciona igual sin importar el nombre del
// negocio (antes buscaba el texto literal "Brasa Urbana", que se
// rompía apenas cambiabas de cliente).
function applyConfigAriaLabels() {
  document.querySelectorAll("[data-config-aria-template]").forEach((el) => {
    const template = el.getAttribute("data-config-aria-template");
    el.setAttribute("aria-label", template.replace("{name}", SITE_CONFIG.businessName));
  });
}

// El copyright del footer arma su propio texto con el año actual, para
// no tener que acordarse de cambiarlo a mano cada enero.
function applyCopyright() {
  const el = document.getElementById("footer-copyright");
  if (!el) return;
  const year = new Date().getFullYear();
  el.textContent = `© ${year} ${SITE_CONFIG.businessName}. Todos los derechos reservados.`;
}

// "#15181B" → "21, 24, 27" — style.css necesita el fondo también en
// formato "r, g, b" para poder usarlo dentro de rgba() (header, lightbox).
function hexToRgbString(hex) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r}, ${g}, ${b}`;
}

// Pisa las variables CSS de :root (style.css, Etapa 2) con los colores
// definidos en SITE_CONFIG.
function applyBrandColors() {
  const cssVariableByColorKey = {
    background: "--color-background",
    surface: "--color-surface",
    text: "--color-text",
    textMuted: "--color-text-muted",
    accent: "--color-accent",
    accentDark: "--color-accent-dark",
    border: "--color-border",
    onAccent: "--color-on-accent",
  };

  Object.keys(cssVariableByColorKey).forEach((key) => {
    const value = SITE_CONFIG.colors[key];
    if (value) {
      document.documentElement.style.setProperty(cssVariableByColorKey[key], value);
    }
  });

  // El fondo necesita, además, su versión "r, g, b" (ver arriba)
  if (SITE_CONFIG.colors.background) {
    document.documentElement.style.setProperty(
      "--color-background-rgb",
      hexToRgbString(SITE_CONFIG.colors.background)
    );
  }
}

function applySiteConfig() {
  applyBrandColors();
  applyConfigText();
  applyConfigHref();
  applyConfigAriaLabels();
  applyCopyright();
}


/* ==========================================================================
   3. WHATSAPP
   Arma el link de WhatsApp una sola vez, a partir del número y el
   mensaje definidos en SITE_CONFIG, y lo aplica a los 3 botones del
   sitio (Hero, Ubicación y flotante).
   ========================================================================== */
function buildWhatsappLink() {
  const text = encodeURIComponent(SITE_CONFIG.whatsappMessage);
  return `https://wa.me/${SITE_CONFIG.whatsapp}?text=${text}`;
}

function initWhatsappLinks() {
  const link = buildWhatsappLink();
  const targets = [
    document.getElementById("whatsapp-cta-hero"),
    document.getElementById("whatsapp-cta-location"),
    document.getElementById("whatsapp-float"),
  ];

  targets.forEach((el) => {
    if (!el) return;
    el.setAttribute("href", link);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  });
}


/* ==========================================================================
   4. MENÚ MOBILE
   El CSS de la Etapa 3 ya sabe mostrar/ocultar el panel según la clase
   `header__nav--open`. Acá solo la agregamos, quitamos, y mantenemos
   `aria-expanded` sincronizado para lectores de pantalla.
   ========================================================================== */
function initMobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("header-nav");
  if (!toggle || !nav) return;

  function closeMenu() {
    nav.classList.remove("header__nav--open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú de navegación");
  }

  function openMenu() {
    nav.classList.add("header__nav--open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú de navegación");
  }

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.contains("header__nav--open");
    isOpen ? closeMenu() : openMenu();
  });

  // Al tocar un link del menú, cerrarlo (si no, tapa el contenido al navegar)
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Cerrar con la tecla Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  // Cerrar si el usuario toca fuera del menú
  document.addEventListener("click", (event) => {
    const clickedInsideNav = nav.contains(event.target);
    const clickedToggle = toggle.contains(event.target);
    if (!clickedInsideNav && !clickedToggle) closeMenu();
  });
}


/* ==========================================================================
   5. HEADER AL HACER SCROLL
   Agrega la clase `is-scrolled` al header apenas el usuario baja un
   poco la página. El aspecto visual de esa clase está definido en
   style.css (Etapa 3); acá solo decidimos cuándo se activa.
   ========================================================================== */
function initHeaderScroll() {
  const header = document.getElementById("site-header");
  if (!header) return;

  function updateHeaderState() {
    const shouldBeScrolled = window.scrollY > 40;
    header.classList.toggle("is-scrolled", shouldBeScrolled);
  }

  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });
}


/* ==========================================================================
   6. GALERÍA / LIGHTBOX
   Al tocar una foto de la galería, se abre en grande sobre el resto de
   la página. Se puede cerrar con el botón, con Escape, o tocando fuera
   de la imagen.
   ========================================================================== */
function initGalleryLightbox() {
  const grid = document.getElementById("gallery-grid");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const closeButton = document.getElementById("lightbox-close");
  if (!grid || !lightbox || !lightboxImage || !closeButton) return;

  let lastFocusedElement = null;

  function openLightbox(sourceImg) {
    lightboxImage.src = sourceImg.getAttribute("src");
    lightboxImage.alt = sourceImg.getAttribute("alt") || "";
    lightbox.classList.add("lightbox--open");
    lightbox.setAttribute("aria-hidden", "false");
    lastFocusedElement = document.activeElement;
    closeButton.focus();
    document.body.style.overflow = "hidden"; // evita el scroll de fondo
  }

  function closeLightbox() {
    lightbox.classList.remove("lightbox--open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  grid.querySelectorAll(".gallery__item").forEach((item) => {
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      if (img) openLightbox(img);
    });
  });

  closeButton.addEventListener("click", closeLightbox);

  // Tocar el fondo oscuro (fuera de la imagen) también cierra
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("lightbox--open")) {
      closeLightbox();
    }
  });
}


/* ==========================================================================
   7. APARICIÓN DE ELEMENTOS AL HACER SCROLL
   Observa todos los elementos con clase `.reveal` (tarjetas de menú,
   fotos de la galería, testimonios, bloques de "Nosotros" y
   "Ubicación") y les agrega `.is-visible` la primera vez que entran en
   pantalla. El aspecto de ambos estados está definido en style.css.
   ========================================================================== */
function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Si el navegador no soporta IntersectionObserver, o el usuario pidió
  // menos movimiento, mostramos todo directamente sin animar.
  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target); // aparece una sola vez
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}


/* ==========================================================================
   8. RESERVA DE TURNOS
   ⚠️ IMPORTANTE — leer antes de prometerle esto a un cliente:
   Este formulario NO es un calendario en tiempo real. No bloquea
   horarios, no sabe qué turnos ya están ocupados y no guarda nada en
   ningún lado — es un sitio estático, sin backend. Lo que hace es
   juntar los datos que la persona cargó y armar un link de WhatsApp
   con todo ya escrito, para que el negocio lo reciba y confirme el
   turno a mano (o lo rechace, si ese horario ya está ocupado).

   Si en algún momento hace falta un calendario real con disponibilidad
   en vivo, hay que sumar algún servicio externo (Google Calendar,
   Calendly, etc.) o un backend propio — queda fuera del alcance de
   esta plantilla HTML/CSS/JS sin servidor.
   ========================================================================== */
function initBookingForm() {
  const form = document.getElementById("booking-form");
  const dateInput = document.getElementById("booking-date");
  const serviceSelect = document.getElementById("booking-service");
  if (!form || !dateInput || !serviceSelect) return;

  // No dejar elegir una fecha anterior a hoy
  const today = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", today);

  // Los links "Reservar este servicio →" de cada tarjeta precargan el
  // select del formulario con ese servicio y llevan el scroll hasta ahí.
  document.querySelectorAll(".menu-card__book").forEach((link) => {
    link.addEventListener("click", () => {
      const service = link.getAttribute("data-service");
      if (service) serviceSelect.value = service;
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const name = (data.get("name") || "").toString().trim();
    const service = (data.get("service") || "").toString();
    const date = (data.get("date") || "").toString();
    const time = (data.get("time") || "").toString();
    const notes = (data.get("notes") || "").toString().trim();

    if (!name || !service || !date || !time) {
      form.reportValidity();
      return;
    }

    // Convierte "2026-11-03" a "03/11/2026", más legible en el mensaje
    const [year, month, day] = date.split("-");
    const dateFormatted = `${day}/${month}/${year}`;

    let message =
      `Hola! Quiero reservar un turno.\n` +
      `Nombre: ${name}\n` +
      `Servicio: ${service}\n` +
      `Fecha preferida: ${dateFormatted}\n` +
      `Horario preferido: ${time}`;

    if (notes) {
      message += `\nComentario: ${notes}`;
    }

    const link = `https://wa.me/${SITE_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(link, "_blank", "noopener,noreferrer");
  });
}


/* ==========================================================================
   INICIALIZACIÓN
   applySiteConfig() va primero: así el resto del sitio (WhatsApp
   incluido) ya encuentra los datos actualizados cuando arranca.
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  applySiteConfig();
  initWhatsappLinks();
  initMobileMenu();
  initHeaderScroll();
  initGalleryLightbox();
  initScrollReveal();
  initBookingForm();
});
