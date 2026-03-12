import { apiUrl } from './config';
import type { Patient } from '../types/patient';
import { formatDateOnly } from '../utils/date';

/** Map Laravel snake_case patient to app Patient type */
function mapApiPatientToPatient(raw: Record<string, unknown>): Patient {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    dateOfBirth: formatDateOnly(String(raw.date_of_birth ?? '')),
    age: Number(raw.age ?? 0),
    address: String(raw.address ?? ''),
    town: String(raw.town ?? ''),
    bp: String(raw.bp ?? ''),
    p: String(raw.p ?? ''),
    height: Number(raw.height ?? 0),
    weight: Number(raw.weight ?? 0),
    bmi: Number(raw.bmi ?? 0),
    fbs: String(raw.fbs ?? ''),
    psa: String(raw.psa ?? ''),
    nationality: String(raw.nationality ?? ''),
    nationalId: String(raw.national_id ?? ''),
    image: String(raw.image ?? ''),
    createdAt: String(raw.created_at ?? ''),
    updatedAt: String(raw.updated_at ?? ''),
  };
}

export type RegisterPatientPayload = {
  name: string;
  date_of_birth: string;
  age: number;
  address: string;
  town: string;
  nationality: string;
  national_id: string;
  /** Optional: data URL (base64) from camera; will be sent as binary file in FormData */
  image?: string;
  bp?: string;
  p?: string;
  height?: number;
  weight?: number;
  fbs?: string;
  psa?: string;
};

export type LaravelValidationErrors = Record<string, string[]>;

export type RegisterPatientResponse =
  | { data: { id: number | string; [k: string]: unknown } }
  | { patient: { id: number | string; [k: string]: unknown } }
  | { id: number | string; [k: string]: unknown };

/** Convert a data URL (e.g. from canvas.toDataURL) to a Blob for binary upload */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header?.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * POST patient registration to Laravel API.
 * If payload.image (data URL) is present, sends multipart/form-data with image as binary file.
 * Otherwise sends JSON. Expects 201 with patient/data or 422 with errors.
 */
export async function registerPatient(
  payload: RegisterPatientPayload
): Promise<{ id: string; data?: RegisterPatientResponse }> {
  const hasImage = payload.image && payload.image.startsWith('data:');

  let body: FormData | string;
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (hasImage && payload.image) {
    const form = new FormData();
    form.append('name', payload.name);
    form.append('date_of_birth', payload.date_of_birth);
    form.append('age', String(payload.age));
    form.append('address', payload.address);
    form.append('town', payload.town);
    form.append('nationality', payload.nationality);
    form.append('national_id', payload.national_id);
    if (payload.bp != null) form.append('bp', payload.bp);
    if (payload.p != null) form.append('p', payload.p);
    if (payload.height != null) form.append('height', String(payload.height));
    if (payload.weight != null) form.append('weight', String(payload.weight));
    if (payload.fbs != null) form.append('fbs', payload.fbs);
    if (payload.psa != null) form.append('psa', payload.psa);
    const blob = dataUrlToBlob(payload.image);
    form.append('image', blob, 'patient-photo.jpg');
    body = form;
    // Do not set Content-Type; browser sets multipart/form-data with boundary
  } else {
    headers['Content-Type'] = 'application/json';
    const { image: _img, ...rest } = payload;
    body = JSON.stringify(rest);
  }

  const res = await fetch(apiUrl('api/patient-registrations'), {
    method: 'POST',
    headers,
    body,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      json.message ||
      (json.errors && Object.values(json.errors as LaravelValidationErrors).flat().join(' ')) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  const id =
    json?.data?.id ?? json?.patient?.id ?? json?.id;
  if (id == null) {
    throw new Error('Server did not return a patient id');
  }
  return { id: String(id), data: json as RegisterPatientResponse };
}

/**
 * GET list of patients from Laravel API, optionally filtered by search query.
 * Expects 200 with array in data or root: { data: [...] } or [...].
 * Laravel can use request('search') to filter by name, town, national_id, etc.
 */
export async function fetchPatients(search?: string): Promise<Patient[]> {
  const url = new URL(apiUrl('api/patient-registrations'));
  if (search != null && search.trim() !== '') {
    url.searchParams.set('search', search.trim());
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      json.message ||
      (json.errors && Object.values(json.errors as LaravelValidationErrors).flat().join(' ')) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  const rawList = json?.data ?? json?.patients ?? json;
  const list = Array.isArray(rawList) ? rawList : [];
  return list.map((raw: Record<string, unknown>) => mapApiPatientToPatient(raw));
}

/**
 * GET single patient from Laravel API.
 * Expects 200 with patient in data or root; 404 = not found.
 */
export async function fetchPatient(id: string): Promise<Patient> {
  const res = await fetch(apiUrl(`api/patient-registrations/${id}`), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const json = await res.json().catch(() => ({}));

  if (res.status === 404) {
    throw new Error('Patient not found');
  }
  if (!res.ok) {
    const message =
      json.message ||
      (json.errors && Object.values(json.errors as LaravelValidationErrors).flat().join(' ')) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  const raw = json?.data ?? json?.patient ?? json;
  return mapApiPatientToPatient(raw as Record<string, unknown>);
}

export type UpdatePatientPayload = Partial<{
  date_of_birth: string;
  address: string;
  town: string;
  bp: string;
  p: string;
  height: number;
  weight: number;
  bmi: number;
  fbs: string;
  psa: string;
  nationality: string;
  national_id: string;
}>;

/**
 * PUT/PATCH patient update to Laravel API.
 * Expects 200 with updated patient in data or root.
 */
export async function updatePatientApi(
  id: string,
  payload: UpdatePatientPayload
): Promise<Patient> {
  const res = await fetch(apiUrl(`api/patient-registrations/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      json.message ||
      (json.errors && Object.values(json.errors as LaravelValidationErrors).flat().join(' ')) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  const raw = json?.data ?? json?.patient ?? json;
  return mapApiPatientToPatient(raw as Record<string, unknown>);
}
