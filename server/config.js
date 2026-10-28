import "dotenv/config";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta configurar ${name}.`);
  return value;
}

function parseJsonEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} debe contener JSON válido.`);
  }
}

const defaultBusinessHours = {
  2: [["09:00", "19:00"]],
  3: [["09:00", "19:00"]],
  4: [["09:00", "19:00"]],
  5: [["09:00", "19:00"]],
  6: [["09:00", "19:00"]],
};

const defaultServiceDurations = {
  "Manicura & Pedicura": 60,
  Depilación: 30,
  "Tratamientos faciales": 60,
  "Masajes & Spa": 60,
  Maquillaje: 60,
  "Color y Peinado": 90,
};

const bookingHours = parseJsonEnv("BUSINESS_HOURS_JSON", defaultBusinessHours);
const serviceDurations = parseJsonEnv("SERVICE_DURATIONS_JSON", defaultServiceDurations);

if (
  !bookingHours ||
  typeof bookingHours !== "object" ||
  Array.isArray(bookingHours) ||
  Object.entries(bookingHours).some(
    ([day, intervals]) =>
      !/^[0-6]$/.test(day) ||
      !Array.isArray(intervals) ||
      intervals.some(
        (interval) =>
          !Array.isArray(interval) ||
          interval.length !== 2 ||
          interval.some((time) => typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) ||
          interval[0] >= interval[1]
      )
  )
) {
  throw new Error("BUSINESS_HOURS_JSON debe mapear días (0=domingo...6=sábado) a intervalos HH:mm.");
}

if (
  !serviceDurations ||
  typeof serviceDurations !== "object" ||
  Array.isArray(serviceDurations) ||
  Object.values(serviceDurations).some(
    (duration) => !Number.isInteger(duration) || duration < 15 || duration > 480
  )
) {
  throw new Error("SERVICE_DURATIONS_JSON debe mapear servicios a duraciones enteras entre 15 y 480 minutos.");
}

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
if (encryptionKey && !/^[a-fA-F0-9]{64}$/.test(encryptionKey)) {
  throw new Error("TOKEN_ENCRYPTION_KEY debe contener exactamente 64 caracteres hexadecimales.");
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  databaseUrl: required("DATABASE_URL"),
  databaseSsl: process.env.DATABASE_SSL === "true",
  sessionSecret: required("SESSION_SECRET"),
  tokenEncryptionKey: required("TOKEN_ENCRYPTION_KEY"),
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback",
  googleCalendarRedirectUri:
    process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:3000/auth/calendar/callback",
  adminEmails,
  calendarOwnerEmail: (process.env.GOOGLE_CALENDAR_OWNER_EMAIL || "").trim().toLowerCase(),
  calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
  timeZone: process.env.SITE_TIME_ZONE || "America/Argentina/Buenos_Aires",
  minimumNoticeMinutes: Number(process.env.MINIMUM_BOOKING_NOTICE_MINUTES || 60),
  slotIntervalMinutes: Number(process.env.BOOKING_SLOT_INTERVAL_MINUTES || 30),
  bookingHours,
  serviceDurations,
};

if (config.sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET debe tener al menos 32 caracteres aleatorios.");
}

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error("PORT debe ser un número entre 1 y 65535.");
}

if (config.adminEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
  throw new Error("ADMIN_EMAILS debe contener una lista de emails válidos separados por comas.");
}

if (
  config.calendarOwnerEmail &&
  !config.adminEmails.includes(config.calendarOwnerEmail)
) {
  throw new Error("GOOGLE_CALENDAR_OWNER_EMAIL también debe estar incluido en ADMIN_EMAILS.");
}

if (
  !Number.isInteger(config.minimumNoticeMinutes) ||
  config.minimumNoticeMinutes < 0 ||
  !Number.isInteger(config.slotIntervalMinutes) ||
  config.slotIntervalMinutes < 5 ||
  config.slotIntervalMinutes > 240
) {
  throw new Error("La anticipación y el intervalo de turnos deben ser minutos enteros válidos.");
}
