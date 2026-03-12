import * as XLSX from 'xlsx';
import type { Patient } from '../types/patient';
import { formatDateOnly } from './date';

const patientToRow = (p: Patient) => ({
  Name: p.name,
  'Date of Birth': formatDateOnly(p.dateOfBirth),
  Age: p.age,
  Address: p.address,
  Town: p.town,
  BP: p.bp,
  P: p.p,
  Height: p.height,
  Weight: p.weight,
  BMI: p.bmi,
  FBS: p.fbs,
  PSA: p.psa,
  Nationality: p.nationality,
  'National ID': p.nationalId,
  'Updated At': p.updatedAt,
});

export function exportPatientToExcel(patient: Patient, filename?: string) {
  const rows = [patientToRow(patient)];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Patient');
  XLSX.writeFile(wb, filename ?? `patient-${patient.id}.xlsx`);
}

export function exportAllPatientsToExcel(patients: Patient[], filename?: string) {
  const rows = patients.map(patientToRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Patients');
  XLSX.writeFile(wb, filename ?? `patients-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
