import { randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { DateTime } from "luxon";
import { config } from "./config.js";
import { initializeDatabase, pool } from "./database.js";
import {
  cancelAppointment,
  createAppointment,
  getAvailableSlots,
  listAppointments,
  parseDate,
  updateAppointment,
  ValidationError,
} from "./appointments.js";
import {
  createOAuthClient,
  isCalendarConnected,
  removeCalendarRefreshToken,
  saveCalendarRefreshToken,
} from "./google-calendar.js";

const app = express();
const PgSession = connectPgSimple(session);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const adminEmailSet = new Set(config.adminEmails);

if (!config.adminEmails.length) {
  throw new Error("Configura al menos una dirección Google en ADMIN_EMAILS.");
}

if (config.nodeEnv === "production" && !config.appBaseUrl.startsWith("https://")) {
  throw new Error("APP_BASE_URL debe usar HTTPS en producción.");
}

app.disable("x-powered-by");
app.set("trust proxy", config.nodeEnv === "production" ? 1 : false);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        frameSrc: ["'self'", "https://www.google.com", "https://maps.google.com"],
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        upgradeInsecureRequests: config.nodeEnv === "production" ? [] : null,
      },
    },
    hsts: config.nodeEnv === "production",
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);
app.use(express.json({ limit: "16kb", strict: true }));
app.use(
  session({
    name: "almate_admin",
    secret: config.sessionSecret,
    store: new PgSession({
      pool,
      tableName: "admin_sessions",
      createTableIfMissing: true,
      pruneSessionInterval: 15 * 60,
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    },
  })
);

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const publicBookingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const availabilityRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

function createState(req, sessionKey) {
  const state = randomBytes(32).toString("hex");
  req.session[sessionKey] = state;
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve(state)));
  });
}

function consumeState(req, sessionKey, receivedState) {
  const expectedState = req.session[sessionKey];
  delete req.session[sessionKey];
  if (
    typeof expectedState !== "string" ||
    typeof receivedState !== "string" ||
    expectedState.length !== receivedState.length ||
    !timingSafeEqual(Buffer.from(expectedState), Buffer.from(receivedState))
  ) {
    return false;
  }
  return true;
}

async function verifyGoogleIdentity(oauthClient, tokens) {
  if (!tokens.id_token) throw new Error("Google no devolvió una identidad verificable.");
  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  const email = payload?.email?.toLowerCase();
  if (!email || payload.email_verified !== true) {
    throw new Error("La cuenta de Google no tiene un email verificado.");
  }
  return email;
}

function requireAdmin(req, res, next) {
  const email = req.session.admin?.email;
  if (!email || !adminEmailSet.has(email)) {
    res.status(401).json({ error: "Iniciá sesión con una cuenta autorizada." });
    return;
  }
  next();
}

function requireCsrf(req, res, next) {
  const origin = req.get("Origin");
  let expectedOrigin;
  try {
    expectedOrigin = new URL(config.appBaseUrl).origin;
  } catch {
    res.status(500).json({ error: "La URL base del sitio no está configurada correctamente." });
    return;
  }
  if (origin !== expectedOrigin) {
    res.status(403).json({ error: "Origen de solicitud no autorizado." });
    return;
  }

  const token = req.get("X-CSRF-Token");
  const expectedToken = req.session.csrfToken;
  if (
    typeof token !== "string" ||
    typeof expectedToken !== "string" ||
    token.length !== expectedToken.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
  ) {
    res.status(403).json({ error: "La sesión expiró. Actualizá la página e intentá de nuevo." });
    return;
  }
  next();
}

function apiError(res, error, fallbackMessage) {
  if (error.code === "CALENDAR_NOT_CONNECTED") {
    res.status(503).json({ error: "Conectá la agenda de Google desde el panel antes de usar los turnos." });
    return;
  }
  if (error.code === "BOOKING_TAKEN" || error.code === "BOOKING_CLOSED") {
    res.status(409).json({ error: error.message });
    return;
  }
  if (error.code === "APPOINTMENT_NOT_FOUND") {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error.code === "23505" || error.code === "23P01") {
    res.status(409).json({ error: "Ese horario acaba de ocuparse. Elegí otro turno disponible." });
    return;
  }
  if (error.code === "23503" || error.code === "22P02") {
    res.status(400).json({ error: "El dato enviado no tiene un formato válido." });
    return;
  }
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }
  console.error(`${fallbackMessage} (${error.code || "sin código"}): ${error.message}`);
  res.status(502).json({ error: fallbackMessage });
}

function requireCalendarOwnerConfigured(req, res, next) {
  if (!config.calendarOwnerEmail || !adminEmailSet.has(config.calendarOwnerEmail)) {
    res.status(503).json({
      error: "Configurá GOOGLE_CALENDAR_OWNER_EMAIL y autorizá esa cuenta en ADMIN_EMAILS.",
    });
    return;
  }
  next();
}

function dateRangeQuery(req) {
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  if (!from || !to || to <= from || to.diff(from, "days").days > 93) {
    throw new ValidationError("El rango de fechas debe ser válido y no superar 93 días.");
  }
  return [from, to];
}

app.get("/auth/google", loginRateLimit, async (req, res, next) => {
  try {
    const oauthClient = createOAuthClient(config.googleRedirectUri);
    const state = await createState(req, "googleOAuthState");
    res.redirect(
      oauthClient.generateAuthUrl({
        access_type: "online",
        include_granted_scopes: true,
        prompt: "select_account",
        scope: ["openid", "email", "profile"],
        state,
      })
    );
  } catch (error) {
    next(error);
  }
});

app.get("/auth/google/callback", loginRateLimit, async (req, res, next) => {
  try {
    if (req.query.error || !consumeState(req, "googleOAuthState", req.query.state)) {
      res.redirect("/admin.html?error=login_cancelled");
      return;
    }
    const oauthClient = createOAuthClient(config.googleRedirectUri);
    const { tokens } = await oauthClient.getToken(String(req.query.code || ""));
    const email = await verifyGoogleIdentity(oauthClient, tokens);
    if (!adminEmailSet.has(email)) {
      res.redirect("/admin.html?error=not_authorized");
      return;
    }
    await new Promise((resolve, reject) => req.session.regenerate((error) => (error ? reject(error) : resolve())));
    req.session.admin = { email };
    req.session.csrfToken = randomBytes(32).toString("hex");
    res.redirect("/admin.html");
  } catch (error) {
    next(error);
  }
});

app.get("/auth/calendar", requireAdmin, requireCalendarOwnerConfigured, async (req, res, next) => {
  try {
    const oauthClient = createOAuthClient(config.googleCalendarRedirectUri);
    const state = await createState(req, "calendarOAuthState");
    res.redirect(
      oauthClient.generateAuthUrl({
        access_type: "offline",
        include_granted_scopes: true,
        prompt: "consent",
        scope: ["openid", "email", "https://www.googleapis.com/auth/calendar.events"],
        state,
      })
    );
  } catch (error) {
    next(error);
  }
});

app.get("/auth/calendar/callback", requireAdmin, requireCalendarOwnerConfigured, async (req, res, next) => {
  try {
    if (req.query.error || !consumeState(req, "calendarOAuthState", req.query.state)) {
      res.redirect("/admin.html?error=calendar_cancelled");
      return;
    }
    const oauthClient = createOAuthClient(config.googleCalendarRedirectUri);
    const { tokens } = await oauthClient.getToken(String(req.query.code || ""));
    const email = await verifyGoogleIdentity(oauthClient, tokens);
    if (email !== config.calendarOwnerEmail) {
      res.redirect("/admin.html?error=wrong_calendar_account");
      return;
    }
    if (!tokens.refresh_token) {
      res.redirect("/admin.html?error=calendar_reconnect");
      return;
    }
    await saveCalendarRefreshToken(email, tokens.refresh_token);
    res.redirect("/admin.html?calendar=connected");
  } catch (error) {
    next(error);
  }
});

app.get("/api/public/config", (_req, res) => {
  res.json({
    services: Object.entries(config.serviceDurations).map(([name, durationMinutes]) => ({
      name,
      durationMinutes,
    })),
    timeZone: config.timeZone,
  });
});

app.get("/api/public/availability", availabilityRateLimit, async (req, res) => {
  try {
    const slots = await getAvailableSlots(String(req.query.date || ""), String(req.query.service || ""));
    res.set("Cache-Control", "no-store");
    res.json({ slots });
  } catch (error) {
    apiError(res, error, "No se pudo consultar la disponibilidad. Intentá más tarde.");
  }
});

app.post("/api/public/appointments", publicBookingRateLimit, async (req, res) => {
  try {
    const saved = await createAppointment(req.body);
    res.status(201).json({ appointment: publicAppointment(saved) });
  } catch (error) {
    apiError(res, error, "No se pudo reservar el turno. Intentá nuevamente.");
  }
});

function publicAppointment(appointment) {
  return {
    id: appointment.id,
    service: appointment.service,
    startAt: appointment.start_at,
    endAt: appointment.end_at,
    status: appointment.status,
  };
}

app.get("/api/admin/session", (req, res) => {
  const email = req.session.admin?.email;
  if (!email || !adminEmailSet.has(email)) {
    res.json({ authenticated: false });
    return;
  }
  if (!req.session.csrfToken) req.session.csrfToken = randomBytes(32).toString("hex");
  res.set("Cache-Control", "no-store");
  res.json({ authenticated: true, email, csrfToken: req.session.csrfToken });
});

app.post("/api/admin/logout", requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    await new Promise((resolve, reject) =>
      req.session.destroy((error) => (error ? reject(error) : resolve()))
    );
    res.clearCookie("almate_admin", { path: "/" });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/calendar/status", requireAdmin, async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({
      connected: await isCalendarConnected(),
      email: config.calendarOwnerEmail || null,
      calendarUrl: "https://calendar.google.com/calendar/u/0/r/week",
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/calendar/connection", requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    if (config.calendarOwnerEmail) {
      await removeCalendarRefreshToken(config.calendarOwnerEmail);
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/appointments", requireAdmin, async (req, res) => {
  try {
    const [from, to] = dateRangeQuery(req);
    res.set("Cache-Control", "no-store");
    res.json({ appointments: await listAppointments(from, to) });
  } catch (error) {
    apiError(res, error, "No se pudieron cargar los turnos.");
  }
});

app.get("/api/admin/summary", requireAdmin, async (_req, res) => {
  try {
    const now = DateTime.now().setZone(config.timeZone);
    const start = now.startOf("day");
    const todayEnd = start.plus({ days: 1 });
    const weekEnd = start.plus({ days: 7 });
    const [appointments, pendingResult] = await Promise.all([
      listAppointments(start, weekEnd),
      pool.query("SELECT COUNT(*) FROM appointments WHERE status = 'pending'"),
    ]);
    const active = appointments.filter((appointment) => appointment.status !== "cancelled");
    res.set("Cache-Control", "no-store");
    res.json({
      today: active.filter((appointment) => {
        const appointmentStart = DateTime.fromJSDate(new Date(appointment.start_at));
        return appointmentStart >= start && appointmentStart < todayEnd;
      }).length,
      pending: Number(pendingResult.rows[0].count),
      week: active.filter((appointment) => {
        const appointmentStart = DateTime.fromJSDate(new Date(appointment.start_at));
        return appointmentStart >= now && appointmentStart < weekEnd;
      }).length,
    });
  } catch (error) {
    apiError(res, error, "No se pudieron actualizar los totales de la agenda.");
  }
});

app.post("/api/admin/appointments", requireAdmin, requireCsrf, async (req, res) => {
  try {
    const appointment = await createAppointment(req.body);
    res.status(201).json({ appointment });
  } catch (error) {
    apiError(res, error, "No se pudo crear el turno.");
  }
});

app.put("/api/admin/appointments/:id", requireAdmin, requireCsrf, async (req, res) => {
  try {
    const appointment = await updateAppointment(req.params.id, req.body);
    res.json({ appointment });
  } catch (error) {
    apiError(res, error, "No se pudo actualizar el turno.");
  }
});

app.delete("/api/admin/appointments/:id", requireAdmin, requireCsrf, async (req, res) => {
  try {
    await cancelAppointment(req.params.id);
    res.status(204).end();
  } catch (error) {
    apiError(res, error, "No se pudo cancelar el turno.");
  }
});

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.use((req, res, next) => {
  if (/^\/(?:server|node_modules)(?:\/|$)/.test(req.path)) {
    res.status(404).end();
    return;
  }
  next();
});
app.use(express.static(projectRoot, {
  dotfiles: "deny",
  index: "index.html",
  maxAge: config.nodeEnv === "production" ? "1h" : 0,
}));

app.use((error, _req, res, _next) => {
  console.error("Error no controlado del servidor:", error.message);
  if (res.headersSent) return;
  if (error.status === 400) {
    res.status(400).send("La solicitud no tiene un formato válido.");
    return;
  }
  res.status(500).send("Ocurrió un error interno. Intentá más tarde.");
});

await initializeDatabase();
const server = app.listen(config.port, () => {
  console.log(`Sitio disponible en ${config.appBaseUrl}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  });
}
