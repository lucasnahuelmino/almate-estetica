# Demo de sitio para estética — ALMATE

Este es un sitio de muestra para adaptar y ofrecer a centros de
estética. No representa a un negocio real: reemplazá los datos y textos
de ejemplo antes de publicarlo para un cliente.

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
Estetica/
  index.html    → página pública, servicios y reserva online
  admin.html    → panel administrativo protegido por Google OAuth
  script.js     → configuración pública, carrusel y reserva del cliente
  admin.js      → panel conectado al backend autenticado
  server/       → API, sesiones seguras, PostgreSQL y Google Calendar
  .env.example  → ejemplo de configuración privada del servidor
  compose.yaml  → PostgreSQL local para desarrollo
  package.json  → dependencias y comandos Node
  style.css     → diseño responsive
  img/          → las fotos del sitio
  README.md     → este archivo
```

Los tres archivos principales están divididos así a propósito:
**contenido** (HTML) separado de **diseño** (CSS) separado de
**comportamiento** (JS). Si querés cambiar un color, no vas a tocar el
HTML. Si querés cambiar un texto, no vas a tocar el CSS.

La web pública está hecha con HTML, CSS y JavaScript. Para reservas y
el panel privado requiere Node.js 22 o superior, PostgreSQL y
credenciales OAuth de Google configuradas en el servidor.

---

## 2. Cómo abrirlo

Para probar el flujo completo, no abras los HTML con doble click ni
Live Server: el inicio de sesión y las reservas necesitan el servidor.
Seguí los pasos de "Arranque local y Google OAuth" más abajo y abrí
`http://localhost:3000`.

---

## 3. Guía rápida de personalización

Esta es la parte que vas a usar todo el tiempo. Casi todo lo que hace
único a un negocio vive en **un solo lugar**: el objeto `SITE_CONFIG`
al principio de `script.js`.

### Nombre, teléfono, email, dirección, horarios, WhatsApp, redes sociales

Abrí `script.js` y editá el objeto `SITE_CONFIG` (está en las primeras
líneas del archivo, bien marcado). Cambiás el valor ahí, y se actualiza
solo en TODOS los lugares del sitio donde aparece ese dato — el header,
el footer, la sección de Ubicación y el panel privado. No hace falta buscar
el nombre del negocio a mano en otros archivos.

```js
const SITE_CONFIG = {
  businessName: "Nombre del negocio",
  phone: "+54 11 1234-5678",
  phoneHref: "tel:+541112345678",
  email: "contacto@negocio.com",
  emailHref: "mailto:contacto@negocio.com",
  address: "Calle Falsa 123, Ciudad",
  hours: "Lun. a Sáb. de 10:00 a 20:00 hs",
  whatsapp: "",                       // dígitos con código de país, sin +
  whatsappMessage: "Hola! Quiero...",
  instagram: "https://instagram.com/...",
  facebook: "https://facebook.com/...",
  // ...
};
```

Esta configuración pública no contiene contraseñas ni tokens. Las
cuentas que pueden iniciar sesión se configuran aparte en el `.env`
privado del servidor.

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

### Arranque local y Google OAuth

**Requisitos:** Node.js 22+, Docker Desktop (para PostgreSQL local) y
una cuenta de Google con acceso a Google Cloud Console.

1. Copiá `.env.example` como `.env`. Ese archivo está ignorado por Git;
   no lo publiques ni lo envíes por chat.
2. Generá dos secretos distintos desde PowerShell:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Pegá el primero en `SESSION_SECRET`, el segundo en
   `TOKEN_ENCRYPTION_KEY`. No reutilices ni compartas esos valores.
3. En Google Cloud Console, creá un proyecto y habilitá **Google
   Calendar API**. Configurá la pantalla de consentimiento OAuth como
   externa y, mientras esté en prueba, agregá las cuentas autorizadas
   como usuarios de prueba.
4. Creá un ID de cliente OAuth de tipo **Aplicación web**. Agregá estos
   URI de redirección autorizados para desarrollo:

   ```text
   http://localhost:3000/auth/google/callback
   http://localhost:3000/auth/calendar/callback
   ```

   Copiá el ID y el secreto OAuth en `GOOGLE_CLIENT_ID` y
   `GOOGLE_CLIENT_SECRET` del `.env`. Nunca los pongas en el frontend.
5. En `ADMIN_EMAILS`, configurá el email o emails autorizados, separados
   por comas. Poné la cuenta propietaria de la agenda también en
   `GOOGLE_CALENDAR_OWNER_EMAIL`; inicialmente debe estar autorizada
   como administrador. No se usa ni se guarda la contraseña de Google.
6. Iniciá la base y el servidor:

   ```powershell
   docker compose up -d database
   npm install
   npm start
   ```

   Abrí `http://localhost:3000/admin.html`, iniciá sesión con una cuenta
   autorizada y elegí **Conectar Google Calendar**. En ese segundo paso,
   Google solicita permiso para leer y gestionar eventos del calendario.
7. Probá una reserva desde `http://localhost:3000`. La disponibilidad se
   calcula usando los horarios de atención, la duración de cada
   servicio, turnos del sistema y eventos ya existentes en Google
   Calendar. Las nuevas reservas se escriben en PostgreSQL y en Google
   Calendar; también se pueden agregar, cancelar o reprogramar desde el
   panel autenticado.

Los días y duración de servicios se pueden adaptar en
`BUSINESS_HOURS_JSON` y `SERVICE_DURATIONS_JSON` del `.env`. En el
horario semanal, 0 es domingo y 6 sábado. La anticipación mínima y el
intervalo de turnos se configuran en `MINIMUM_BOOKING_NOTICE_MINUTES` y
`BOOKING_SLOT_INTERVAL_MINUTES`.

### Seguridad y cambio de cuenta

- La sesión usa cookies `HttpOnly`, `SameSite=Lax`, expiración y
  almacenamiento en PostgreSQL; las acciones administrativas validan
  cuenta autorizada, origen y token CSRF.
- Las credenciales de OAuth quedan en el servidor. El token de
  renovación de Calendar se cifra en PostgreSQL con
  `TOKEN_ENCRYPTION_KEY`; guardá una copia segura de esa clave. Si se
  pierde, eliminá la conexión anterior y autorizá Calendar de nuevo.
- Para cambiar la cuenta del negocio, desconectá el Calendar desde el
  panel, actualizá `ADMIN_EMAILS` y `GOOGLE_CALENDAR_OWNER_EMAIL`,
  agregá la cuenta nueva como usuario de prueba en Google Cloud y
  reiniciá el servidor. Luego iniciá sesión y volvé a conectar Calendar.
- Las cuentas listadas en `ADMIN_EMAILS` administran el mismo negocio y
  calendario configurado en `GOOGLE_CALENDAR_OWNER_EMAIL`. Esta demo es
  de una instalación por negocio; para venderla a varios clientes,
  desplegá una instancia/base aislada por cliente o implementá
  aislamiento multi-tenant antes de compartir una base.
- No alojes datos de clientas reales hasta definir privacidad, avisos,
  retención y copias de seguridad de PostgreSQL. En producción, usá
  HTTPS, una base administrada con TLS, secretos del proveedor (no un
  archivo `.env`) y actualizá los URI OAuth al dominio publicado.
- Si la pantalla OAuth permanece en modo de prueba, Google puede
  limitar los usuarios o la duración de los tokens. Para operar con
  clientes reales, revisá el proceso de publicación/verificación OAuth
  de Google para los permisos de Calendar.

---

## 4. Metadatos para buscadores y redes sociales (SEO)

Estos datos viven en el `<head>` de `index.html` y **no** se actualizan
automáticamente desde `SITE_CONFIG` — es a propósito, porque Google y
Facebook no siempre ejecutan JavaScript antes de leer esta información,
así que necesitan estar escritos directamente en el HTML. Hay que
actualizar a mano:

- `<title>` y `<meta name="description">`
- Las etiquetas `og:*` y `twitter:*` (título, descripción, imagen, URL)

---

## 5. Cómo convertir esta plantilla en la web de un cliente real

Checklist, en orden:

1. **Duplicar la carpeta**: copiá la carpeta completa y renombrala con
   el nombre del cliente.
2. **Completar `SITE_CONFIG`** en `script.js` con los datos reales del
   negocio (nombre, teléfono, WhatsApp, redes, dirección, horarios,
   colores).
3. **Reemplazar todas las fotos** de `img/` por fotos reales del
   negocio (ver los tamaños recomendados más arriba).
4. **Reescribir los textos**: la bajada del Hero, la sección
   "Nosotros", servicios y testimonios — con contenido real del cliente.
5. **Actualizar el mapa** con la dirección real.
6. **Actualizar los metadatos del `<head>`** (sección 4 de arriba) con
   el dominio real donde va a vivir el sitio.
7. **Probar en un celular real** (no solo en la computadora): menú,
   carrusel, galería, agenda y enlaces de contacto.
8. **Revisar todos los links**: WhatsApp, teléfono, email, redes
   sociales, mapa — que abran lo que corresponde.
9. **Definir la firma "Built with ALMATE"** del footer según el acuerdo
   comercial con el cliente — dejarla, sacarla, o cambiarla por un link
   a tu propia página de desarrollador.

---

## 6. El sistema ALMATE (para reutilizar en otros rubros)

Esta carpeta es la base. Lo que la hace reutilizable para otros
negocios (barberías, inmobiliarias, talleres, profesionales) es que
casi todo lo específico del negocio vive en el contenido (HTML) y
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
- [x] Demo adaptable al rubro estética y belleza
- [x] Carrusel automático con controles y respeto por movimiento reducido
- [x] Reserva de turnos con disponibilidad compartida entre PostgreSQL y Google Calendar
- [x] Panel privado para consultar, agregar, cancelar y reprogramar turnos
- [x] Inicio de sesión Google con cuentas administradoras configurables
- [x] Tokens de Calendar cifrados y sesiones administrativas almacenadas en PostgreSQL
- [ ] Configuración de PostgreSQL, OAuth y despliegue: completar para cada instalación

Antes de usarlo con un cliente, configurá PostgreSQL y Google OAuth,
desplegá el servidor con HTTPS y reemplazá los textos, fotos y datos de
ejemplo. No uses testimonios de muestra como opiniones reales.
