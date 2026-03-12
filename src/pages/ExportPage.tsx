import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchPatients } from '../api/patients';
import { LoaderPage } from '../components/Loader';
import { exportAllPatientsToExcel, exportPatientToExcel } from '../utils/exportExcel';
import type { Patient } from '../types/patient';

const placeholderImage = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>'
);

function filterPatients(patients: Patient[], query: string): Patient[] {
  const q = query.trim().toLowerCase();
  if (!q) return patients;
  return patients.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.nationalId.toLowerCase().includes(q) ||
      p.town.toLowerCase().includes(q)
  );
}

export function ExportPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const filteredPatients = useMemo(
    () => filterPatients(patients, query),
    [patients, query]
  );

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchPatients()
      .then(setPatients)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load patients');
        setPatients([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportAll = () => {
    setExporting(true);
    try {
      exportAllPatientsToExcel(filteredPatients);
    } finally {
      setExporting(false);
    }
  };

  const handleExportOne = (patient: Patient) => {
    exportPatientToExcel(patient);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Export Data</h1>
          <p className="mt-1 text-slate-600">Export single patient or entire database to Excel (.xlsx).</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <LoaderPage label="Loading patients…" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Export Data</h1>
          <p className="mt-1 text-slate-600">Export single patient or entire database to Excel (.xlsx).</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Export Data</h1>
        <p className="mt-1 text-slate-600">Export single patient or entire database to Excel (.xlsx).</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, town, or ID..."
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-4 py-2 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
        <button
          type="button"
          onClick={handleExportAll}
          disabled={exporting || filteredPatients.length === 0}
          className="rounded-lg bg-teal-600 px-5 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : `Export all (${filteredPatients.length}) to Excel`}
        </button>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          {patients.length === 0
            ? 'No patients to export. '
            : 'No patients match the filter. '}
          <Link to="/register" className="text-teal-600 hover:underline">Register a patient</Link>
          {patients.length > 0 ? ' or clear the filter.' : ' first.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="p-3 font-medium text-slate-600">Image</th>
                  <th className="p-3 font-medium text-slate-600">Name</th>
                  <th className="p-3 font-medium text-slate-600">Age</th>
                  <th className="p-3 font-medium text-slate-600">Town</th>
                  <th className="p-3 font-medium text-slate-600">National ID</th>
                  <th className="p-3 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="h-10 w-10 overflow-hidden rounded bg-slate-100">
                        {p.image ? (
                          <img src={`https://immanuel.fasthosttech.com/storage/${p.image}`} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <img src={placeholderImage} alt="" className="h-full w-full opacity-60" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-medium text-slate-900">{p.name}</td>
                    <td className="p-3 text-slate-600">{p.age}</td>
                    <td className="p-3 text-slate-600">{p.town}</td>
                    <td className="p-3 text-slate-600">{p.nationalId}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleExportOne(p)}
                        className="rounded bg-teal-100 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-200"
                      >
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
