import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchDocuments, getRegions, subscribeAlert } from '../api';
import DocumentCard from '../components/DocumentCard';
import { useLang } from '../contexts/LangContext';

const DOC_TYPES = ['NIDA', 'VOTER', 'LICENCE', 'PASSPORT', 'OTHER'];

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLang();

  const [query, setQuery]     = useState(searchParams.get('q') || '');
  const [region, setRegion]   = useState(searchParams.get('region') || '');
  const [type, setType]       = useState(searchParams.get('type') || '');
  const [page, setPage]       = useState(1);
  const [results, setResults] = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);

  const [showAlert, setShowAlert] = useState(searchParams.get('alert') === '1');
  const [alertPhone, setAlertPhone] = useState('');
  const [alertId, setAlertId]       = useState('');
  const [alertMsg, setAlertMsg]     = useState('');
  const [alertLoading, setAlertLoading] = useState(false);

  useEffect(() => { getRegions().then(r => setRegions(r.data)).catch(() => {}); }, []);

  const doSearch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await searchDocuments({ q: query, region, type, page: p });
      setResults(res.data.results);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, region, type]);

  useEffect(() => { doSearch(1); }, []); // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: query, region, type });
    doSearch(1);
  };

  const handleAlert = async (e) => {
    e.preventDefault();
    if (!alertPhone || !alertId) return setAlertMsg('Both fields are required');
    setAlertLoading(true);
    try {
      await subscribeAlert({ phone: alertPhone, id_number: alertId });
      setAlertMsg('✅ Alert created! You will receive an SMS when your document is found.');
      setAlertPhone(''); setAlertId('');
    } catch (err) {
      setAlertMsg(err.response?.data?.error || 'Failed to create alert');
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6 space-y-3">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="input flex-1"
          />
          <button type="submit" className="bg-brand-800 text-white font-semibold px-5 py-3 rounded-xl hover:bg-brand-700 transition-colors">
            {t('search_btn')}
          </button>
        </div>
        <div className="flex gap-2">
          <select value={region} onChange={e => setRegion(e.target.value)} className="input flex-1">
            <option value="">{t('search_all_regions')}</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={type} onChange={e => setType(e.target.value)} className="input flex-1">
            <option value="">{t('search_all_types')}</option>
            {DOC_TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        </div>
      </form>

      {/* Alert CTA */}
      {!showAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">{t('search_cant_find')}</p>
          <button onClick={() => setShowAlert(true)} className="text-sm font-semibold text-amber-900 whitespace-nowrap underline">
            {t('search_setup_alert')}
          </button>
        </div>
      )}

      {showAlert && (
        <div className="card mb-6 border-amber-200">
          <h3 className="font-bold mb-3">{t('search_alert_title')}</h3>
          {alertMsg ? (
            <p className={`text-sm ${alertMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{alertMsg}</p>
          ) : (
            <form onSubmit={handleAlert} className="space-y-3">
              <input value={alertPhone} onChange={e => setAlertPhone(e.target.value)} placeholder={t('search_alert_phone_placeholder')} className="input" />
              <input value={alertId} onChange={e => setAlertId(e.target.value)} placeholder={t('search_alert_id_placeholder')} className="input" />
              <p className="text-xs text-gray-500">{t('search_alert_payment_note')}</p>
              <button type="submit" disabled={alertLoading} className="btn-primary text-sm py-2.5">
                {alertLoading ? t('search_alert_processing') : t('search_alert_confirm')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">🔍</div>
          <p>{t('search_searching')}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-gray-600">{t('search_no_results')}</p>
          <p className="text-sm mt-1">{t('search_no_results_hint')}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-brand-700 text-sm underline">{t('search_back_home')}</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {total} {total === 1 ? t('search_results_one') : t('search_results_many')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => doSearch(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                    p === page ? 'bg-brand-800 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-brand-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
