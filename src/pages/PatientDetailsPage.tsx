import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById, updatePatient } from '../store/patients';
import { computeBmi, type Patient } from '../types/patient';
import { exportPatientToExcel } from '../utils/exportExcel';

const placeholderImage = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>'
);

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(getPatientById(id ?? ''));
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(patient ? { ...patient } : null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = getPatientById(id ?? '');
    setPatient(p ?? undefined);
    setForm(p ? { ...p } : null);
  }, [id]);

  useEffect(() => {
    if (!form) return;
    const bmi = computeBmi(form.weight, form.height);
    setForm((f) => (f ? { ...f, bmi } : null));
  }, [form?.height, form?.weight]);

  if (!patient) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        Patient not found. <button type="button" onClick={() => navigate('/')} className="underline">Back to search</button>
      </div>
    );
  }

  const handleSave = () => {
    if (!form || !id) return;
    const updated = updatePatient(id, {
      dateOfBirth: form.dateOfBirth,
      address: form.address,
      town: form.town,
      bp: form.bp,
      p: form.p,
      height: form.height,
      weight: form.weight,
      fbs: form.fbs,
      psa: form.psa,
      nationality: form.nationality,
      nationalId: form.nationalId,
    });
    if (updated) {
      setPatient(updated);
      setForm({ ...updated });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleExport = () => {
    exportPatientToExcel(patient);
  };

  const display = editing && form ? form : patient;

  type FieldKey = keyof Pick<Patient, 'dateOfBirth' | 'address' | 'town' | 'bp' | 'p' | 'height' | 'weight' | 'fbs' | 'psa' | 'nationality' | 'nationalId'>;
  const field = (label: string, key: FieldKey | 'name' | 'age' | 'bmi', value: string | number, editable?: boolean, type: string = 'text') => {
    if (editing && form && editable && key !== 'name' && key !== 'age' && key !== 'bmi') {
      const isNum = type === 'number';
      const formValue = form[key];
      return (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-600">{label}</label>
          <input
            type={type}
            value={isNum ? formValue : String(formValue ?? '')}
            onChange={(e) => {
              setForm((f) => (f ? { ...f, [key]: isNum ? Number(e.target.value) || 0 : e.target.value } : null));
            }}
            className="rounded border border-slate-300 px-3 py-2 text-slate-800"
          />
        </div>
      );
    }
    return (
      <div key={key}>
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <p className="text-slate-900">{value}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm font-medium text-teal-600 hover:underline"
        >
          ← Back to Search
        </button>
        <div className="flex gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Edit / Update
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setForm({ ...patient }); setEditing(false); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Save changes
              </button>
            </>
          )}
        </div>
      </div>

      {saved && (
        <p className="rounded-lg bg-teal-100 py-2 text-center text-sm font-medium text-teal-800">
          Changes saved successfully.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2">
            <div className="h-32 md:h-100 w-32 md:w-100 overflow-hidden rounded-lg bg-slate-100">
              {display.image ? (
                <img src={display.image} alt={display.name} className="h-full w-full object-cover" />
              ) : (
                <img src={placeholderImage} alt="" className="h-full w-full opacity-60" />
              )}
            </div>
            <p className="text-xs text-slate-500">Image (not editable)</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Name', 'name', display.name, false)}
            {field('Date of Birth', 'dateOfBirth', display.dateOfBirth, true)}
            {field('Age', 'age', display.age, false)}
            {field('Address / Digital Address', 'address', display.address, true)}
            {field('Town', 'town', display.town, true)}
            {field('BP', 'bp', display.bp, true)}
            {field('P', 'p', display.p, true)}
            {field('Height (m)', 'height', display.height, true, 'number')}
            {field('Weight (kg)', 'weight', display.weight, true, 'number')}
            {field('BMI', 'bmi', display.bmi, false)}
            {field('FBS', 'fbs', display.fbs, true)}
            {field('PSA', 'psa', display.psa, true)}
            {field('Nationality', 'nationality', display.nationality, true)}
            {field('National ID', 'nationalId', display.nationalId, true)}
          </div>
        </div>
      </div>
    </div>
  );
}
