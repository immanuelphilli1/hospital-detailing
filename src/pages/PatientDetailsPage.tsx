import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPatient, updatePatientApi } from '../api/patients';
import { LoaderPage } from '../components/Loader';
import { computeBmi, type Patient } from '../types/patient';
import { formatDateOnly } from '../utils/date';
// import { exportPatientToExcel } from '../utils/exportExcel';

const placeholderImage = 'https://ui-avatars.com/api/?name=Patient&size=800&background=94a3b8&color=fff&bold=true';

export function PatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<Patient | null>(null);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const patientId = id ?? '';
    if (!patientId) {
      setLoading(false);
      setError('Invalid patient id');
      return;
    }
    setLoading(true);
    setError('');
    fetchPatient(patientId)
      .then((p) => {
        setPatient(p);
        setForm({ ...p });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load patient');
        setPatient(null);
        setForm(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8">
        <LoaderPage label="Loading patient…" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        {error || 'Patient not found.'}{' '}
        <button type="button" onClick={() => navigate('/')} className="underline">
          Back to search
        </button>
      </div>
    );
  }

  const display = editing && form ? form : patient;
  /** BMI derived from current height & weight so it updates immediately when they change */
  const displayBmi = display ? computeBmi(display.weight, display.height) : 0;

  const handleSave = async () => {
    if (!form || !id) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updatePatientApi(id, {
        date_of_birth: form.dateOfBirth,
        address: form.address,
        town: form.town,
        bp: form.bp,
        p: form.p,
        height: form.height,
        weight: form.weight,
        bmi: displayBmi,
        fbs: form.fbs,
        psa: form.psa,
        nationality: form.nationality,
        national_id: form.nationalId,
      });
      setPatient(updated);
      setForm({ ...updated });
      setEditing(false);
      setError('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

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
          {/* <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export to Excel
          </button> */}
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
                onClick={() => { setForm({ ...patient }); setEditing(false); setError(''); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
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
      {error && patient && (
        <p className="rounded-lg bg-red-100 py-2 text-center text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2">
            <div className="h-32 md:h-100 w-32 md:w-100 overflow-hidden rounded-lg bg-slate-100">
              {display.image ? (
                <img src={`https://immanuel.fasthosttech.com/storage/${display.image}`} alt={display.name} className="h-full w-full object-cover" />
              ) : (
                <img src={placeholderImage} alt="" className="h-full w-full opacity-60" />
              )}
            </div>
            <p className="text-xs text-slate-500">Image (not editable)</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('Name', 'name', display.name, false)}
            {field('Date of Birth', 'dateOfBirth', formatDateOnly(display.dateOfBirth), false)}
            {field('Age', 'age', display.age, false)}
            {field('Address / Digital Address', 'address', display.address, true)}
            {field('Town', 'town', display.town, true)}
            {field('BP', 'bp', display.bp, true)}
            {field('P', 'p', display.p, true)}
            {field('Height (m)', 'height', display.height, true, 'number')}
            {field('Weight (kg)', 'weight', display.weight, true, 'number')}
            {field('BMI', 'bmi', displayBmi, false)}
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
