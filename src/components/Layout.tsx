import { Outlet } from 'react-router-dom';

export function Layout() {
  // const location = useLocation();
  // const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-semibold text-teal-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
              ⊕
            </span>
            Hospital Detailing
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {!isHome && (
              <Link
                to="/"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Search
              </Link>
            )}
            <Link
              to="/register"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
            >
              Register Patient
            </Link>
            <Link
              to="/export"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Export Data
            </Link>
          </nav>
        </div>
      </header> */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
