import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchPatients } from '../api/patients';
import { LoaderPage } from '../components/Loader';
import type { Patient } from '../types/patient';

/** Default avatar when patient has no image */
const PLACEHOLDER_AVATAR =
  'https://ui-avatars.com/api/?name=Patient&size=800&background=94a3b8&color=fff&bold=true';

const STORAGE_BASE = 'https://immanuel.fasthosttech.com/storage';

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

const PatientCard = ({
  patient,
  index,
  hovered,
  setHovered,
}: {
  patient: Patient;
  index: number;
  hovered: number | null;
  setHovered: React.Dispatch<React.SetStateAction<number | null>>;
}) => {
  const imageUrl = !patient.image
    ? PLACEHOLDER_AVATAR
    : patient.image.startsWith('http')
      ? patient.image
      : `${STORAGE_BASE}/${patient.image.replace(/^\//, '')}`;

  return (
    <Link
      to={`/patient/${patient.id}`}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      className={cn(
        'relative block h-60 w-full overflow-hidden rounded-lg bg-slate-100 transition-all duration-300 ease-out md:h-96',
        hovered !== null && hovered !== index && 'scale-[0.98] blur-sm'
      )}
    >
      <img
        src={imageUrl}
        alt={patient.name}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Name and age always visible at bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-4 py-6">
        <p className="text-lg font-medium text-white md:text-xl">{patient.name}</p>
        <p className="text-sm text-white/90">Age: {patient.age}</p>
      </div>
      {/* Hover overlay: View details */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 px-4 py-8 transition-opacity duration-300',
          hovered === index ? 'opacity-100' : 'opacity-0'
        )}
      >
        <p className="text-xl font-medium text-white md:text-2xl">{patient.name}</p>
        <p className="text-sm text-white/90">Age: {patient.age}</p>
        <span className="mt-2 rounded-lg border border-white/60 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
          View details
        </span>
      </div>
    </Link>
  );
};

function PatientFocusCards({ patients }: { patients: Patient[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-10">
      {patients.map((patient, index) => (
        <PatientCard
          key={patient.id}
          patient={patient}
          index={index}
          hovered={hovered}
          setHovered={setHovered}
        />
      ))}
    </div>
  );
}

const SEARCH_DEBOUNCE_MS = 300;

export function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim() === '') {
      setResults([]);
      setError('');
      return;
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError('');
      fetchPatients(query)
        .then(setResults)
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Search failed');
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
          debounceRef.current = null;
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search runs via useEffect when query changes; submit keeps accessibility
  };

  return (
    <div className="space-y-6">
      <div className='pt-20'>
        <h1 className="text-7xl font-bold text-slate-900 text-center pb-6">Patient Search</h1>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type patient name..."
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-lg w-full md:w-fit bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700"
        >
          Search
        </button>
      </form>

      <section>
        {query === '' ? (
          <p className="text-slate-500">
            Type a patient name, town, or national ID to search.{' '}
            <Link to="/register" className="text-teal-600 font-medium underline hover:text-teal-900">
              Register Patient
            </Link>
            {' · '}
            <Link to="/invoice" className="text-teal-600 font-medium underline hover:text-teal-900">
              Invoices
            </Link>
          </p>
        ) : loading ? (
          <LoaderPage label="Searching…" />
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>
        ) : results.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            No patients found for &quot;{query}&quot;.{' '}
            <Link to="/register" className="text-teal-600 font-medium underline hover:text-teal-900">
              Register Patient
            </Link>
          </p>
        ) : (
          <PatientFocusCards patients={results} />
        )}
      </section>
    </div>
  );
}
