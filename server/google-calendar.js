import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";
import { pool } from "./database.js";
import { decryptSecret, encryptSecret } from "./crypto.js";

export function createOAuthClient(redirectUri) {
  return new OAuth2Client(
    config.googleClientId,
    config.googleClientSecret,
    redirectUri
  );
}

export async function saveCalendarRefreshToken(ownerEmail, refreshToken) {
  const encrypted = encryptSecret(refreshToken, config.tokenEncryptionKey);
  await pool.query(
    `INSERT INTO google_calendar_tokens (owner_email, encrypted_refresh_token)
     VALUES ($1, $2)
     ON CONFLICT (owner_email) DO UPDATE
     SET encrypted_refresh_token = EXCLUDED.encrypted_refresh_token, updated_at = NOW()`,
    [ownerEmail, encrypted]
  );
}

export async function removeCalendarRefreshToken(ownerEmail) {
  await pool.query("DELETE FROM google_calendar_tokens WHERE owner_email = $1", [ownerEmail]);
}

async function getCalendarApi() {
  if (!config.calendarOwnerEmail) {
    throw new Error("Configura GOOGLE_CALENDAR_OWNER_EMAIL y autorizalo en el panel.");
  }

  const result = await pool.query(
    "SELECT encrypted_refresh_token FROM google_calendar_tokens WHERE owner_email = $1",
    [config.calendarOwnerEmail]
  );
  const encryptedToken = result.rows[0]?.encrypted_refresh_token;
  if (!encryptedToken) {
    const error = new Error("La agenda de Google todavía no está conectada.");
    error.code = "CALENDAR_NOT_CONNECTED";
    throw error;
  }

  const auth = createOAuthClient(config.googleCalendarRedirectUri);
  auth.setCredentials({
    refresh_token: decryptSecret(encryptedToken, config.tokenEncryptionKey),
  });
  return google.calendar({ version: "v3", auth });
}

export async function isCalendarConnected() {
  if (!config.calendarOwnerEmail) return false;
  const result = await pool.query(
    "SELECT 1 FROM google_calendar_tokens WHERE owner_email = $1",
    [config.calendarOwnerEmail]
  );
  return result.rowCount === 1;
}

export async function listCalendarEvents(start, end) {
  const calendar = await getCalendarApi();
  const events = [];
  let pageToken;
  do {
    const response = await calendar.events.list({
      calendarId: config.calendarId,
      timeMin: start.toUTC().toISO(),
      timeMax: end.toUTC().toISO(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
      pageToken,
    });
    events.push(...(response.data.items || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return events.filter((event) => event.status !== "cancelled");
}

export async function createCalendarEvent(appointment) {
  const calendar = await getCalendarApi();
  const response = await calendar.events.insert({
    calendarId: config.calendarId,
    requestBody: toGoogleEvent(appointment),
  });
  return response.data;
}

export async function updateCalendarEvent(eventId, appointment) {
  const calendar = await getCalendarApi();
  const response = await calendar.events.update({
    calendarId: config.calendarId,
    eventId,
    requestBody: toGoogleEvent(appointment),
  });
  return response.data;
}

export async function deleteCalendarEvent(eventId) {
  const calendar = await getCalendarApi();
  try {
    await calendar.events.delete({ calendarId: config.calendarId, eventId });
  } catch (error) {
    if (error.code !== 404) throw error;
  }
}

function toGoogleEvent(appointment) {
  const description = [
    `Contacto: ${appointment.client_contact}`,
    appointment.notes ? `Notas: ${appointment.notes}` : "",
    "Administrado por la agenda online del centro.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    summary: `${appointment.service} — ${appointment.client_name}`,
    description,
    visibility: "private",
    start: {
      dateTime: appointment.start_at.toISOString(),
      timeZone: config.timeZone,
    },
    end: {
      dateTime: appointment.end_at.toISOString(),
      timeZone: config.timeZone,
    },
  };
}
