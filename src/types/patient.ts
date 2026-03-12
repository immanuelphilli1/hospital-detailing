export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  age: number;
  address: string;
  town: string;
  bp: string;
  p: string;
  height: number; // meters
  weight: number; // kg
  bmi: number;
  fbs: string;
  psa: string;
  nationality: string;
  nationalId: string;
  image: string; // base64 or URL
  createdAt: string;
  updatedAt: string;
}

export type PatientFormData = Omit<Patient, 'id' | 'bmi' | 'createdAt' | 'updatedAt'> & {
  image?: string;
};

/**
 * BMI = weight (kg) / [height (m)]²
 * Height can be in meters (e.g. 1.75) or cm (e.g. 175); values > 10 are treated as cm.
 */
export function computeBmi(weightKg: number, heightMOrCm: number): number {
  if (!weightKg || weightKg <= 0) return 0;
  const heightM = heightMOrCm > 10 ? heightMOrCm / 100 : heightMOrCm;
  if (!heightM || heightM <= 0) return 0;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 100) / 100;
}

export function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
