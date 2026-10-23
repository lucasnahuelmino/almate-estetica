# Alma Estética & Spa — sitio construido con ALMATE

Este sitio es una copia de la plantilla base de restaurantes (Brasa
Urbana), adaptada por completo al rubro estética y belleza — incluye
una sección nueva que no existía en la plantilla original: un
formulario de reserva de turnos (ver sección 4 más abajo, es
importante leerla antes de prometerle esto a un cliente real).

La plantilla nació como el primer producto del sistema **ALMATE**: una
base reutilizable que después se va a poder convertir en ALMATE
Barber, ALMATE Inmobiliaria, ALMATE Profesional, etc., cambiando
contenido pero manteniendo el mismo motor.

Este documento está pensado para alguien sin experiencia previa en
programación. No asume que sepas qué es un "framework" ni cómo
funciona un servidor — si en algún punto no se entiende algo, es un
problema del README, no tuyo.

---

## 1. Qué contiene el proyecto

```
plantilla-restaurante/
  index.html    → todo el contenido y la estructura de la página
  style.css     → todo el diseño visual (colores, tipografía, layout)
  script.js     → toda la interactividad (menú, WhatsApp, animaciones)
  img/          → las fotos del sitio
  assets/       → para íconos u otros archivos que no sean fotos
  README.md     → este archivo
```

Los tres archivos principales están divididos así a propósito:
**contenido** (HTML) separado de **diseño** (CSS) separado de
**comportamiento** (JS). Si querés cambiar un color, no vas a tocar el
HTML. Si querés cambiar un texto, no vas a tocar el CSS.

No hay ningún framework, ni proceso de instalación, ni build. Es HTML,
CSS y JavaScript "puro" — funciona igual hoy que dentro de cinco años,
sin depender de que una librería externa siga actualizada.

---

## 2. Cómo abrirlo

La forma más simple: hacer doble click en `index.html`. Se abre en tu
navegador y funciona completo — menú, WhatsApp, galería, animaciones.

Si vas a estar editando seguido, es más cómodo usar la extensión **Live
Server** de VS Code (click derecho sobre `index.html` → "Open with Live
Server"): cada vez que guardás un cambio, la página se refresca sola.
No es obligatorio, es solo más cómodo.

---

## 3. Guía rápida de personalización

Esta es la parte que vas a usar todo el tiempo. Casi todo lo que hace
único a un negocio vive en **un solo lugar**: el objeto `SITE_CONFIG`
al principio de `script.js`.

### Nombre, teléfono, email, dirección, horarios, WhatsApp, redes sociales

Abrí `script.js` y editá el objeto `SITE_CONFIG` (está en las primeras
líneas del archivo, bien marcado). Cambiás el valor ahí, y se actualiza
solo en TODOS los lugares del sitio donde aparece ese dato — el header,
el footer, la sección de Ubicación, los botones de WhatsApp. No hace
falta buscar "Alma Estética & Spa" a mano en ningún otro archivo.

```js
const SITE_CONFIG = {
  businessName: "Nombre del negocio",
  phone: "+54 11 1234-5678",
  phoneHref: "tel:+541112345678",
  email: "contacto@negocio.com",
  emailHref: "mailto:contacto@negocio.com",
  address: "Calle Falsa 123, Ciudad",
  hours: "Lun. a Sáb. de 10:00 a 20:00 hs",
  whatsapp: "541112345678",           // solo números, con código de país
  whatsappMessage: "Hola! Quiero...",
  instagram: "https://instagram.com/...",
  facebook: "https://facebook.com/...",
  // ...
};
```

### Colores

Dos formas, misma idea:

- **Rápida**: cambiá los 7 valores de `SITE_CONFIG.colors` en
  `script.js`. Se aplican solos al cargar la página.
- **Directa**: cambiá las mismas 7 variables en el bloque `:root` al
  principio de `style.css`. Sirve si preferís no tocar JavaScript.

Cualquiera de las dos formas rebrandea el sitio entero — no hay
colores "sueltos" repetidos por otras partes del CSS.

### Tipografías

Están definidas como `--font-display` (títulos) y `--font-body`
(texto) en el mismo bloque `:root` de `style.css`. Si cambiás de
fuente, acordate de también actualizar el `<link>` de Google Fonts en
el `<head>` de `index.html` para que cargue la fuente nueva.

### Imágenes

Van todas dentro de `img/`. Dos opciones:

1. Reemplazar el archivo manteniendo el mismo nombre (por ejemplo,
   pisar `hero-estetica.jpg` con tu propia foto) — no hay que tocar
   nada más.
2. Usar otro nombre de archivo — en ese caso hay que actualizar el
   `src="img/..."` correspondiente en `index.html`.

Recomendación de peso/tamaño (afecta directamente la velocidad del
sitio, ver Etapa 7): JPG o WebP, no más de ~300KB por imagen, con un
ancho real cercano al que se ve en pantalla — no subas una foto de
4000px si en el sitio se muestra a 900px.

### Textos principales del Hero

El título y la bajada grandes de la primera pantalla están en
`SITE_CONFIG.mainTexts` (`script.js`). El resto de los textos del
sitio (Nosotros, testimonios, etc.) se editan directo en `index.html`,
buscando el texto entre las etiquetas correspondientes.

### Agregar o quitar servicios del menú

En `index.html`, buscá `<!-- SERVICIOS / MENÚ -->`. Cada plato es un
bloque así:

```html
<article class="menu-card reveal">
  <img src="img/menu-nuevo.jpg" alt="Descripción de la foto" loading="lazy" decoding="async" width="500" height="375">
  <h3>Nombre del plato</h3>
  <p>Descripción corta.</p>
  <span class="menu-card__price">Desde $0.000</span>
</article>
```

Para agregar uno, copiá y pegá un bloque completo dentro de
`.menu__grid` y cambiá el contenido. Para quitar uno, borrá el bloque
entero (desde `<article` hasta `</article>`).

### Agregar testimonios

Mismo mecanismo, dentro de `.testimonials__grid`:

```html
<blockquote class="testimonial-card reveal">
  <p class="testimonial-card__rating" aria-label="5 de 5 estrellas">★★★★★</p>
  <p class="testimonial-card__text">"Comentario del cliente."</p>
  <footer class="testimonial-card__author">— Nombre Apellido</footer>
</blockquote>
```

### Cambiar el mapa

En la sección Ubicación de `index.html`, buscá el `<iframe>` y
reemplazá su `src` por el link "insertar mapa" de Google Maps para la
dirección real del negocio.

### Cómo funciona la reserva de turnos (sección `#turnos`)

⚠️ **Leer esto antes de ofrecerle el sitio a un cliente real** — es la
diferencia entre una promesa que el sitio cumple y una que no.

Este sitio es HTML/CSS/JS sin servidor — no hay ninguna base de datos
ni backend. Por eso "reserva de turno online" acá significa esto,
concretamente:

1. La persona completa el formulario (nombre, servicio, fecha, horario
   preferido, comentario opcional).
2. Al enviarlo, el JavaScript arma un mensaje de WhatsApp con todos
   esos datos ya escritos y abre una conversación nueva con el número
   de `SITE_CONFIG.whatsapp`.
3. El negocio **confirma el turno a mano**, como si el cliente les
   hubiera escrito directo. El sitio no sabe qué horarios ya están
   ocupados — no bloquea turnos duplicados, no valida disponibilidad
   real, no envía recordatorios.

Es, en la práctica, un formulario que reemplaza escribir el mensaje de
WhatsApp a mano — no un calendario con disponibilidad en vivo (tipo
Calendly o un sistema de turnero real). Para la mayoría de los
salones chicos esto es más que suficiente y evita pagar un servicio
de terceros, pero si el cliente necesita bloqueo de horarios en
tiempo real, eso requiere sumar un servicio externo (Google Calendar,
Calendly, etc.) o un backend propio — queda fuera del alcance de esta
plantilla.

Las 6 tarjetas de servicios tienen un link "Reservar este servicio →"
que lleva directo al formulario con ese servicio ya preseleccionado —
si agregás o quitás servicios (ver sección de arriba), acordate de
agregar también la opción correspondiente en el `<select>` del
formulario (`id="booking-service"`), si no el texto no va a coincidir.

---

## 4. Metadatos para buscadores y redes sociales (SEO)

Estos datos viven en el `<head>` de `index.html` y **no** se actualizan
automáticamente desde `SITE_CONFIG` — es a propósito, porque Google y
Facebook no siempre ejecutan JavaScript antes de leer esta información,
así que necesitan estar escritos directamente en el HTML. Hay que
actualizar a mano:

- `<title>` y `<meta name="description">`
- `<link rel="canonical">` (el dominio real del sitio, una vez publicado)
- Las etiquetas `og:*` y `twitter:*` (título, descripción, imagen, URL)
- El bloque `<script type="application/ld+json">` al final del
  `<head>` (nombre, teléfono, dirección y horario del negocio — esto es
  lo que le permite a Google mostrar el negocio con mapa y horarios en
  los resultados de búsqueda)

---

## 5. Cómo convertir esta plantilla en la web de un cliente real

Checklist, en orden:

1. **Duplicar la carpeta**: copiá `plantilla-restaurante/` completa y
   renombrala con el nombre del cliente (por ejemplo `bella-barberia/`).
2. **Completar `SITE_CONFIG`** en `script.js` con los datos reales del
   negocio (nombre, teléfono, WhatsApp, redes, dirección, horarios,
   colores).
3. **Reemplazar todas las fotos** de `img/` por fotos reales del
   negocio (ver los tamaños recomendados más arriba).
4. **Reescribir los textos**: la bajada del Hero, la sección
   "Nosotros", los 6 servicios/platos y los 3 testimonios — con
   contenido real del cliente, no el de este salón de ejemplo.
5. **Actualizar el mapa** con la dirección real.
6. **Actualizar los metadatos del `<head>`** (sección 4 de arriba) con
   el dominio real donde va a vivir el sitio.
7. **Probar en un celular real** (no solo en la computadora): menú,
   WhatsApp, galería, formularios de contacto si los hay.
8. **Revisar todos los links**: WhatsApp, teléfono, email, redes
   sociales, mapa — que abran lo que corresponde.
9. **Definir la firma "Built with ALMATE"** del footer según el acuerdo
   comercial con el cliente — dejarla, sacarla, o cambiarla por un link
   a tu propia página de desarrollador.

---

## 6. El sistema ALMATE (para reutilizar en otros rubros)

Esta carpeta es la base. Lo que la hace reutilizable para otros
negocios (barberías, inmobiliarias, talleres, profesionales) es que
casi todo lo específico de "restaurante" vive en el contenido (HTML) y
los datos (`SITE_CONFIG`), no en el motor:

- La estructura de carpetas, el sistema de configuración, las
  animaciones, el responsive y la firma del footer **se mantienen
  iguales** de un rubro a otro.
- Lo que cambia entre rubros es: los nombres de sección ("Servicios"
  en vez de "Menú", por ejemplo), las fotos, y el copy.

Para un negocio nuevo de otro rubro, el punto de partida más rápido es
duplicar esta carpeta y seguir la checklist de la sección 5, ajustando
los nombres de sección según corresponda.

---

## 7. Estado del proyecto

- [x] Etapa 1 — Estructura HTML
- [x] Etapa 2 — Diseño CSS
- [x] Etapa 3 — Responsive
- [x] Etapa 4 — JavaScript (menú, WhatsApp, lightbox, header on-scroll)
- [x] Etapa 5 — Animaciones / microinteracciones
- [x] Etapa 6 — SEO
- [x] Etapa 7 — Optimización de velocidad
- [x] Etapa 8 — Sistema de configuración (`SITE_CONFIG`)
- [x] Etapa 9 — Documentación y preparación para vender a clientes
- [x] Adaptación al rubro estética y belleza, con sección nueva de
      reserva de turnos (ver sección 3 arriba, "Cómo funciona la
      reserva de turnos" — importante entender los límites antes de
      vender esto como "turnero online")

Pendiente, y depende de cada cliente puntual, no de la plantilla en sí:
fotos reales (`img/` está con nombres de archivo de ejemplo) y el
contenido definitivo de cada sección.
