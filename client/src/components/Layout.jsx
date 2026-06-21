import { Outlet, Link } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';
import LangToggle from './LangToggle';

export default function Layout() {
  const { t } = useLang();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-800 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight">ID-Link</span>
            <span className="text-brand-200 text-sm hidden sm:block">Tanzania</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link to="/search" className="text-brand-100 hover:text-white transition-colors">{t('nav_search')}</Link>
            <Link to="/clerk" className="bg-white text-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
              {t('nav_staff_login')}
            </Link>
            <LangToggle className="text-brand-100 border-brand-600 hover:text-white hover:border-brand-300" />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-brand-900 text-brand-200 text-xs text-center py-4 px-4">
        <p>{t('footer_partnership')}</p>
        <p className="mt-1 text-brand-400">{t('footer_data_protected')}</p>
      </footer>
    </div>
  );
}
