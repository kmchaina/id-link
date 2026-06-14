import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const { pathname } = useLocation();
  const isClerkArea = pathname.startsWith('/clerk') || pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-800 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">ID-Link</span>
            <span className="text-brand-200 text-sm hidden sm:block">Tanzania</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {!isClerkArea && (
              <>
                <Link to="/search" className="text-brand-100 hover:text-white transition-colors">Search</Link>
                <Link to="/clerk" className="bg-white text-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                  Staff Login
                </Link>
              </>
            )}
            {isClerkArea && (
              <button
                onClick={() => { localStorage.removeItem('idlink_token'); localStorage.removeItem('idlink_staff'); window.location.href = '/clerk'; }}
                className="text-brand-100 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-brand-900 text-brand-200 text-xs text-center py-4 px-4">
        <p>ID-Link Tanzania — In partnership with Tanzania Posts Corporation</p>
        <p className="mt-1 text-brand-400">Data protected under the Personal Data Protection Act, 2022</p>
      </footer>
    </div>
  );
}
