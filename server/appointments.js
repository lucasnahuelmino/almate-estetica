import { DateTime } from "luxon";
import { config } from "./config.js";
import { pool, withAppointmentLock } from "./database.js";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "./google-calendar.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export class ValidationError extends Error {}

export function parseDate(date) {
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) return null;
  const parsed = DateTime.fromISO(date, { zone: config.timeZone });
  return parsed.isValid && parsed.toISODate() === date ? parsed.startOf("day") : null;
}

export function parseAppointmentInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("La solicitud no contiene datos de reserva válidos.");
  }
  const clientName = typeof body.name === "string" ? body.name.trim() : "";
  const clientContact = typeof body.contact === "string" ? body.contact.trim() : "";
  const service = typeof body.service === "string" ? body.service.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  const status = body.status === undefined ? "confirmed" : body.status;
  const duration = config.serviceDurations[service];

  if (status !== "confirmed" && status !== "pending") {
    throw new ValidationError("El estado del turno no es válido.");
  }
  if (clientName.length < 2 || clientName.length > 100) {
    throw new ValidationError("Ingresá un nombre de entre 2 y 100 caracteres.");
  }
  if (
    clientContact.length < 6 ||
    clientContact.length > 50 ||
    !/^[+\d()\s.-]+$/.test(clientContact)
  ) {
    throw new ValidationError("Ingresá un teléfono o contacto válido (6 a 50 caracteres).");
  }
  if (!duration) throw new ValidationError("El servicio seleccionado no está disponible.");
  if (notes.length > 1000) throw new ValidationError("Las notas no pueden superar los 1000 caracteres.");
  if (!TIME_PATTERN.test(time)) throw new ValidationError("La hora no tiene un formato válido.");

  const day = parseDate(date);
  if (!day) throw new ValidationError("La fecha no tiene un formato válido.");

  const start = DateTime.fromISO(`${date}T${time}`, { zone: config.timeZone });
  if (!start.isValid || start <= DateTime.now().setZone(config.timeZone)) {
    throw new ValidationError("Elegí una fecha y hora futura.");
  }
  if (start < DateTime.now().setZone(config.timeZone).plus({ minutes: config.minimumNoticeMinutes })) {
    throw new ValidationError("Ese turno no respeta la anticipación mínima requerida.");
  }
  const end = start.plus({ minutes: duration });

  return {
    client_name: clientName,
    client_contact: clientContact,
    service,
    notes,
    start_at: start.toUTC().toJSDate(),
    end_at: end.toUTC().toJSDate(),
    start_local: start,
    end_local: end,
    status,
  };
}

function isWithinBusinessHours(appointment) {
  const weekday = appointment.start_local.weekday % 7;
  const intervals = config.bookingHours[weekday] || [];
  const startMinutes = appointment.start_local.hour * 60 + appointment.start_local.minute;
  const endMinutes = appointment.end_local.hour * 60 + appointment.end_local.minute;
  return intervals.some(([opens, closes]) => {
    const [openHour, openMinute] = opens.split(":").map(Number);
    const [closeHour, closeMinute] = closes.split(":").map(Number);
    const openingMinutes = openHour * 60 + openMinute;
    return (
      startMinutes >= openingMinutes &&
      endMinutes <= closeHour * 60 + closeMinute &&
      (startMinutes - openingMinutes) % config.slotIntervalMinutes === 0 &&
      appointment.start_local.toISODate() === appointment.end_local.toISODate()
    );
  });
}

function overlaps(start, end, eventStart, eventEnd) {
  return start < eventEnd && end > eventStart;
}

function getEventBounds(event) {
  if (event.start?.dateTime && event.end?.dateTime) {
    return [DateTime.fromISO(event.start.dateTime), DateTime.fromISO(event.end.dateTime)];
  }
  if (event.start?.date && event.end?.date) {
    return [
      DateTime.fromISO(event.start.date, { zone: config.timeZone }).startOf("day"),
      DateTime.fromISO(event.end.date, { zone: config.timeZone }).startOf("day"),
    ];
  }
  return [null, null];
}

async function findDatabaseAppointments(start, end, excludeId = null, executor = pool) {
  const result = await executor.query(
    `SELECT id, client_name, client_contact, service, notes, start_at, end_at,
            status, google_event_id
     FROM appointments
     WHERE status <> 'cancelled'
       AND start_at < $2 AND end_at > $1
       AND ($3::uuid IS NULL OR id <> $3)
     ORDER BY start_at`,
    [start.toUTC().toJSDate(), end.toUTC().toJSDate(), excludeId]
  );
  return result.rows;
}

async function assertAvailable(appointment, excludeId = null, executor = pool) {
  if (!isWithinBusinessHours(appointment)) {
    const error = new Error("El horario seleccionado está fuera de los días u horas de atención.");
    error.code = "BOOKING_CLOSED";
    throw error;
  }

  const [databaseAppointments, googleEvents] = await Promise.all([
    findDatabaseAppointments(appointment.start_local, appointment.end_local, excludeId, executor),
    listCalendarEvents(appointment.start_local, appointment.end_local),
  ]);

  const databaseConflict = databaseAppointments.some((existing) =>
    overlaps(
      appointment.start_at,
      appointment.end_at,
      new Date(existing.start_at),
      new Date(existing.end_at)
    )
  );
  const googleConflict = googleEvents.some((event) => {
    if (event.id === appointment.google_event_id) return false;
    const [eventStart, eventEnd] = getEventBounds(event);
    return (
      eventStart &&
      eventEnd &&
      overlaps(
        appointment.start_local,
        appointment.end_local,
        eventStart.toJSDate(),
        eventEnd.toJSDate()
      )
    );
  });

  if (databaseConflict || googleConflict) {
    const error = new Error("Ese horario acaba de ocuparse. Elegí otro turno disponible.");
    error.code = "BOOKING_TAKEN";
    throw error;
  }
}

export async function getAvailableSlots(date, service) {
  const day = parseDate(date);
  const duration = config.serviceDurations[service];
  if (!day) throw new ValidationError("La fecha no tiene un formato válido.");
  if (!duration) throw new ValidationError("El servicio seleccionado no está disponible.");
  if (day < DateTime.now().setZone(config.timeZone).startOf("day")) {
    throw new ValidationError("No se pueden consultar fechas pasadas.");
  }

  const dayEnd = day.plus({ days: 1 });
  const [databaseAppointments, googleEvents] = await Promise.all([
    findDatabaseAppointments(day, dayEnd),
    listCalendarEvents(day, dayEnd),
  ]);
  const busy = [
    ...databaseAppointments.map((appointment) => [
      DateTime.fromJSDate(new Date(appointment.start_at)),
      DateTime.fromJSDate(new Date(appointment.end_at)),
    ]),
    ...googleEvents.map(getEventBounds).filter(([start, end]) => start && end),
  ];
  const now = DateTime.now().setZone(config.timeZone).plus({ minutes: config.minimumNoticeMinutes });
  const weekday = day.weekday % 7;
  const slots = [];

  for (const [opens, closes] of config.bookingHours[weekday] || []) {
    const [openHour, openMinute] = opens.split(":").map(Number);
    const [closeHour, closeMinute] = closes.split(":").map(Number);
    const opening = day.set({ hour: openHour, minute: openMinute });
    const closing = day.set({ hour: closeHour, minute: closeMinute });
    for (
      let slot = opening;
      slot.plus({ minutes: duration }) <= closing;
      slot = slot.plus({ minutes: config.slotIntervalMinutes })
    ) {
      const end = slot.plus({ minutes: duration });
      if (slot < now) continue;
      if (!busy.some(([busyStart, busyEnd]) => slot < busyEnd && end > busyStart)) {
        slots.push(slot.toFormat("HH:mm"));
      }
    }
  }
  return slots;
}

export async function createAppointment(body) {
  const appointment = parseAppointmentInput(body);
  let createdGoogleEventId;
  try {
    return await withAppointmentLock(async (client) => {
      await assertAvailable(appointment, null, client);
      const result = await client.query(
        `INSERT INTO appointments
          (client_name, client_contact, service, notes, start_at, end_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, client_name, client_contact, service, notes, start_at, end_at, status, google_event_id`,
        [
          appointment.client_name,
          appointment.client_contact,
          appointment.service,
          appointment.notes,
          appointment.start_at,
          appointment.end_at,
          appointment.status,
        ]
      );
      const row = result.rows[0];
      const event = await createCalendarEvent(row);
      createdGoogleEventId = event.id;
      const updated = await client.query(
        "UPDATE appointments SET google_event_id = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        [row.id, event.id]
      );
      return updated.rows[0];
    });
  } catch (error) {
    if (createdGoogleEventId) {
      try {
        await deleteCalendarEvent(createdGoogleEventId);
      } catch (cleanupError) {
        console.error("No se pudo limpiar un evento de Calendar tras fallar la reserva:", cleanupError.message);
      }
    }
    throw error;
  }
}

export async function listAppointments(start, end) {
  const [databaseAppointments, googleEvents] = await Promise.all([
    pool.query(
      `SELECT id, client_name, client_contact, service, notes, start_at, end_at,
              status, google_event_id
       FROM appointments
       WHERE start_at < $2 AND end_at > $1
       ORDER BY start_at`,
      [start.toUTC().toJSDate(), end.toUTC().toJSDate()]
    ),
    listCalendarEvents(start, end),
  ]);
  const managedEventIds = new Set(
    databaseAppointments.rows.map((appointment) => appointment.google_event_id).filter(Boolean)
  );
  const externalAppointments = googleEvents
    .filter((event) => !managedEventIds.has(event.id))
    .map((event) => {
      const [eventStart, eventEnd] = getEventBounds(event);
      if (!eventStart || !eventEnd) return null;
      return {
        id: `calendar-${event.id}`,
        client_name: event.summary || "Evento de Google Calendar",
        client_contact: "",
        service: "Evento de Calendar",
        notes: event.description || "",
        start_at: eventStart.toUTC().toJSDate(),
        end_at: eventEnd.toUTC().toJSDate(),
        status: "confirmed",
        external: true,
      };
    })
    .filter(Boolean);
  return [...databaseAppointments.rows, ...externalAppointments].sort(
    (first, second) => new Date(first.start_at) - new Date(second.start_at)
  );
}

export async function updateAppointment(id, body) {
  const appointment = parseAppointmentInput(body);
  let createdGoogleEventId;
  try {
    return await withAppointmentLock(async (client) => {
      const currentResult = await client.query(
        "SELECT * FROM appointments WHERE id = $1 AND status <> 'cancelled' FOR UPDATE",
        [id]
      );
      const current = currentResult.rows[0];
      if (!current) {
        const error = new Error("No se encontró el turno.");
        error.code = "APPOINTMENT_NOT_FOUND";
        throw error;
      }

      appointment.google_event_id = current.google_event_id;
      await assertAvailable(appointment, id, client);
      const event = current.google_event_id
        ? await updateCalendarEvent(current.google_event_id, appointment)
        : await createCalendarEvent(appointment);
      if (!current.google_event_id) createdGoogleEventId = event.id;
      const updated = await client.query(
        `UPDATE appointments
         SET client_name = $2, client_contact = $3, service = $4, notes = $5,
             start_at = $6, end_at = $7, status = $8, google_event_id = $9, updated_at = NOW()
         WHERE id = $1
         RETURNING id, client_name, client_contact, service, notes, start_at, end_at, status, google_event_id`,
        [
          id,
          appointment.client_name,
          appointment.client_contact,
          appointment.service,
          appointment.notes,
          appointment.start_at,
          appointment.end_at,
          appointment.status,
          event.id,
        ]
      );
      return updated.rows[0];
    });
  } catch (error) {
    if (createdGoogleEventId) {
      try {
        await deleteCalendarEvent(createdGoogleEventId);
      } catch (cleanupError) {
        console.error("No se pudo limpiar un evento de Calendar tras fallar la reprogramación:", cleanupError.message);
      }
    }
    throw error;
  }
}

export async function cancelAppointment(id) {
  return withAppointmentLock(async (client) => {
    const result = await client.query(
      "SELECT google_event_id FROM appointments WHERE id = $1 AND status <> 'cancelled' FOR UPDATE",
      [id]
    );
    const appointment = result.rows[0];
    if (!appointment) {
      const error = new Error("No se encontró el turno.");
      error.code = "APPOINTMENT_NOT_FOUND";
      throw error;
    }
    if (appointment.google_event_id) await deleteCalendarEvent(appointment.google_event_id);
    await client.query(
      "UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [id]
    );
  });
}
