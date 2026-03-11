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

export function computeBmi(weightKg: number, heightM: number): number {
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
