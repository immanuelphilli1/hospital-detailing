import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllPatients, searchPatients } from '../store/patients';
import { exportAllPatientsToExcel, exportPatientToExcel } from '../utils/exportExcel';
import type { Patient } from '../types/patient';

const placeholderImage = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><circle cx="12" cy="8" r="3"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>'
);

export function ExportPage() {
  const [query, setQuery] = useState('');
  const patients = query.trim() ? searchPatients(query) : getAllPatients();
  const [exporting, setExporting] = useState(false);

  const handleExportAll = () => {
    setExporting(true);
    try {
      exportAllPatientsToExcel(patients);
    } finally {
      setExporting(false);
    }
  };

  const handleExportOne = (patient: Patient) => {
    exportPatientToExcel(patient);
  };

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
          disabled={exporting || patients.length === 0}
          className="rounded-lg bg-teal-600 px-5 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : `Export all (${patients.length}) to Excel`}
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No patients to export. <Link to="/register" className="text-teal-600 hover:underline">Register a patient</Link> first.
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
                {patients.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="h-10 w-10 overflow-hidden rounded bg-slate-100">
                        {p.image ? (
                          <img src={p.image} alt="" className="h-full w-full object-cover" />
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
