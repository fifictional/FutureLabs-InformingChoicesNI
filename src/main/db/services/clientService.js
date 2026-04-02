import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { appSettings, clients } from '../schema';

const TOTAL_APPOINTMENTS_KEY = 'total_appointments';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeIdentifier(value) {
  return normalizeText(value).toUpperCase();
}

function parseOptionalDate(value) {
  const text = normalizeText(value);
  if (!text) return null;

  const parsed = new Date(`${text}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Date of birth must be a valid date');
  }

  return parsed;
}

function parseAppointmentsValue(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('Appointments total must be a non-negative whole number');
  }

  return parsed;
}

async function ensureAppointmentsRow() {
  const db = getDb();
  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, TOTAL_APPOINTMENTS_KEY))
    .get();

  if (existing) return existing;

  const inserted = await db
    .insert(appSettings)
    .values({
      key: TOTAL_APPOINTMENTS_KEY,
      valueText: null,
      valueNumber: 0,
      updatedAt: new Date()
    })
    .returning();

  return inserted[0];
}

export async function listClients() {
  const db = getDb();
  return db.select().from(clients);
}

export async function createClient(data) {
  const db = getDb();
  const initials = normalizeIdentifier(data?.nonConfidentialIdentifier);
  const referenceId = normalizeText(data?.referenceId);
  const dateOfBirth = parseOptionalDate(data?.dateOfBirth);

  if (!initials) {
    throw new Error('Initials are required');
  }

  if (!referenceId) {
    throw new Error('Reference ID is required');
  }

  if (!dateOfBirth) {
    throw new Error('Date of birth is required');
  }

  const inserted = await db
    .insert(clients)
    .values({
      nonConfidentialIdentifier: initials,
      dateOfBirth,
      referenceId
    })
    .returning();

  return inserted[0];
}

export async function updateClient(id, data) {
  const db = getDb();
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw new Error('Invalid client id');
  }

  const initials = normalizeIdentifier(data?.nonConfidentialIdentifier);
  const referenceId = normalizeText(data?.referenceId);
  const dateOfBirth = parseOptionalDate(data?.dateOfBirth);

  if (!initials) {
    throw new Error('Initials are required');
  }

  if (!referenceId) {
    throw new Error('Reference ID is required');
  }

  if (!dateOfBirth) {
    throw new Error('Date of birth is required');
  }

  const updated = await db
    .update(clients)
    .set({
      nonConfidentialIdentifier: initials,
      dateOfBirth,
      referenceId
    })
    .where(eq(clients.id, clientId))
    .returning();

  return updated[0] || null;
}

export async function deleteClient(id) {
  const db = getDb();
  return db.delete(clients).where(eq(clients.id, id)).returning();
}

export async function getTotalAppointments() {
  const row = await ensureAppointmentsRow();
  return Number(row?.valueNumber || 0);
}

export async function setTotalAppointments(value) {
  const db = getDb();
  const nextValue = parseAppointmentsValue(value);
  await ensureAppointmentsRow();

  const updated = await db
    .update(appSettings)
    .set({ valueNumber: nextValue, updatedAt: new Date() })
    .where(eq(appSettings.key, TOTAL_APPOINTMENTS_KEY))
    .returning();

  return Number(updated[0]?.valueNumber || nextValue);
}

export async function adjustTotalAppointments(delta) {
  const current = await getTotalAppointments();
  const parsedDelta = Number(delta);
  if (!Number.isInteger(parsedDelta)) {
    throw new Error('Appointment adjustment must be a whole number');
  }

  return setTotalAppointments(Math.max(0, current + parsedDelta));
}
