import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
process.env.SESSION_SECRET ||= "test-only-session-secret-at-least-32-characters";
process.env.TOKEN_ENCRYPTION_KEY ||= "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.GOOGLE_CLIENT_ID ||= "test-client-id";
process.env.GOOGLE_CLIENT_SECRET ||= "test-client-secret";
process.env.ADMIN_EMAILS ||= "owner@example.com";
process.env.GOOGLE_CALENDAR_OWNER_EMAIL ||= "owner@example.com";

const { parseAppointmentInput, ValidationError } = await import("./appointments.js");
const zone = "America/Argentina/Buenos_Aires";

function validInput(overrides = {}) {
  const tomorrow = DateTime.now().setZone(zone).plus({ days: 1 }).toISODate();
  return {
    name: "Cliente de prueba",
    contact: "+54 11 1234-5678",
    service: "Manicura & Pedicura",
    date: tomorrow,
    time: "18:00",
    notes: "",
    ...overrides,
  };
}

test("parses appointment details with the configured Buenos Aires timezone", () => {
  const appointment = parseAppointmentInput(validInput());
  assert.equal(appointment.service, "Manicura & Pedicura");
  assert.equal(appointment.status, "confirmed");
  assert.equal(appointment.end_local.diff(appointment.start_local, "minutes").minutes, 60);
  assert.equal(appointment.start_local.zoneName, zone);
});

test("rejects an unknown service and malformed contact data", () => {
  assert.throws(() => parseAppointmentInput(validInput({ service: "Servicio inventado" })), ValidationError);
  assert.throws(() => parseAppointmentInput(validInput({ contact: "cliente@example.com" })), ValidationError);
});

test("rejects past dates, invalid time, excessive notes, and invalid status", () => {
  assert.throws(() => parseAppointmentInput(validInput({ date: "2020-01-01" })), ValidationError);
  assert.throws(() => parseAppointmentInput(validInput({ time: "9:00" })), ValidationError);
  assert.throws(() => parseAppointmentInput(validInput({ notes: "x".repeat(1001) })), ValidationError);
  assert.throws(() => parseAppointmentInput(validInput({ status: "cancelled" })), ValidationError);
});
