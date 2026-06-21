import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';

export default function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useLang();

  const search = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const steps = [
    { icon: '🔍', step: '1', titleKey: 'home_step1_title', descKey: 'home_step1_desc' },
    { icon: '✅', step: '2', titleKey: 'home_step2_title', descKey: 'home_step2_desc' },
    { icon: '🏪', step: '3', titleKey: 'home_step3_title', descKey: 'home_step3_desc' },
  ];

  const fees = [
    { nameKey: 'home_fee1_name', amount: '10,000', descKey: 'home_fee1_desc' },
    { nameKey: 'home_fee2_name', amount: '25,000', descKey: 'home_fee2_desc' },
    { nameKey: 'home_fee3_name', amount: '5,000',  descKey: 'home_fee3_desc' },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-800 to-brand-700 text-white px-4 py-12 sm:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-4">🪪</div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
            {t('home_hero_title_1')}<br />{t('home_hero_title_2')}
          </h1>
          <p className="text-brand-100 text-lg mb-2">
            {t('home_hero_subtitle')}
          </p>
          <p className="text-brand-200 text-sm mb-8">
            {t('home_hero_tagline')}
          </p>

          <form onSubmit={search} className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('home_search_placeholder')}
              className="input flex-1 text-gray-900"
            />
            <button type="submit" className="bg-white text-brand-800 font-bold px-5 py-3 rounded-xl hover:bg-brand-50 transition-colors whitespace-nowrap">
              {t('home_search_btn')}
            </button>
          </form>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">{t('home_how_title')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map(item => (
            <div key={item.step} className="card text-center">
              <div className="text-4xl mb-3">{item.icon}</div>
              <div className="text-xs font-bold text-brand-600 uppercase tracking-wide mb-1">{t('home_step')} {item.step}</div>
              <h3 className="font-bold text-lg mb-2">{t(item.titleKey)}</h3>
              <p className="text-sm text-gray-600">{t(item.descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-brand-50 px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6 text-gray-800">{t('home_fees_title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {fees.map(item => (
              <div key={item.nameKey} className="card text-center">
                <p className="text-2xl font-bold text-brand-800">TZS {item.amount}</p>
                <p className="font-semibold text-gray-800 mt-1">{t(item.nameKey)}</p>
                <p className="text-xs text-gray-500 mt-1">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">{t('home_fees_note')}</p>
        </div>
      </div>

      {/* Alert CTA */}
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <h2 className="text-xl font-bold mb-2">{t('home_alert_title')}</h2>
        <p className="text-gray-600 mb-5 text-sm">{t('home_alert_desc')}</p>
        <button onClick={() => navigate('/search?alert=1')} className="btn-primary max-w-xs mx-auto">
          {t('home_alert_btn')}
        </button>
      </div>
    </div>
  );
}
