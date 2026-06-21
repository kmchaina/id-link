import { useLang } from '../contexts/LangContext';

export default function LangToggle({ className = '' }) {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      aria-label="Switch language / Badilisha lugha"
      className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${className}`}
    >
      <span style={{ opacity: lang === 'en' ? 1 : 0.35 }}>EN</span>
      <span style={{ opacity: 0.3 }}>|</span>
      <span style={{ opacity: lang === 'sw' ? 1 : 0.35 }}>SW</span>
    </button>
  );
}
