import type { Patient } from '../types/patient';
import { computeBmi, ageFromDob } from '../types/patient';
import samplePatientsData from '../data/samplePatients.json';

const STORAGE_KEY = 'hospital-patients';
const SEED_FLAG_KEY = 'hospital-patients-seeded';

function loadPatients(): Patient[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function savePatients(patients: Patient[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
}

export function getAllPatients(): Patient[] {
  return loadPatients();
}

export function getPatientById(id: string): Patient | undefined {
  return loadPatients().find((p) => p.id === id);
}

export function searchPatients(query: string): Patient[] {
  const q = query.trim().toLowerCase();
  if (!q) return loadPatients();
  return loadPatients().filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.nationalId.toLowerCase().includes(q) ||
      p.town.toLowerCase().includes(q)
  );
}

export function createPatient(data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient {
  const patients = loadPatients();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const patient: Patient = {
    ...data,
    id,
    bmi: computeBmi(data.weight, data.height),
    createdAt: now,
    updatedAt: now,
  };
  patients.push(patient);
  savePatients(patients);
  return patient;
}

export function updatePatient(
  id: string,
  updates: Partial<Omit<Patient, 'id' | 'name' | 'age' | 'image' | 'createdAt'>>
): Patient | null {
  const patients = loadPatients();
  const index = patients.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const current = patients[index];
  const height = updates.height ?? current.height;
  const weight = updates.weight ?? current.weight;
  const patient: Patient = {
    ...current,
    ...updates,
    bmi: computeBmi(weight, height),
    updatedAt: new Date().toISOString(),
  };
  patients[index] = patient;
  savePatients(patients);
  return patient;
}

/** Load sample patients from local JSON into localStorage (once per device). */
export function seedSamplePatientsIfNeeded(): void {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(SEED_FLAG_KEY)) return;
  const existing = loadPatients();
  if (existing.length > 0) return;

  const samples = samplePatientsData as Patient[];
  savePatients(samples);
  localStorage.setItem(SEED_FLAG_KEY, '1');
}

export function registerPatientFromForm(data: {
  name: string;
  dateOfBirth: string;
  age: number;
  address: string;
  town: string;
  nationality: string;
  nationalId: string;
  image: string;
  bp?: string;
  p?: string;
  height?: number;
  weight?: number;
  fbs?: string;
  psa?: string;
}): Patient {
  const age = ageFromDob(data.dateOfBirth);
  const height = data.height ?? 0;
  const weight = data.weight ?? 0;
  return createPatient({
    name: data.name,
    dateOfBirth: data.dateOfBirth,
    age,
    address: data.address,
    town: data.town,
    bp: data.bp ?? '',
    p: data.p ?? '',
    height,
    weight,
    bmi: 0, // overwritten in createPatient
    fbs: data.fbs ?? '',
    psa: data.psa ?? '',
    nationality: data.nationality,
    nationalId: data.nationalId,
    image: data.image,
  });
}
