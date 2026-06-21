import { useLang } from '../contexts/LangContext';

export default function LangToggle({ className = '' }) {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      aria-label="Switch language / Badilisha lugha"
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors ${className}`}
    >
      <span
        className="fi fi-gb fis rounded-sm"
        style={{ fontSize: '1.1rem', opacity: lang === 'en' ? 1 : 0.3 }}
      />
      <span style={{ opacity: 0.25 }} className="text-[10px]">|</span>
      <span
        className="fi fi-tz fis rounded-sm"
        style={{ fontSize: '1.1rem', opacity: lang === 'sw' ? 1 : 0.3 }}
      />
    </button>
  );
}
