import { useNavigate } from 'react-router-dom';
import { useLang } from '../contexts/LangContext';

const TYPE_LABEL_KEYS = {
  NIDA: 'doc_type_nida',
  VOTER: 'doc_type_voter',
  LICENCE: 'doc_type_licence',
  PASSPORT: 'doc_type_passport',
  OTHER: 'doc_type_other',
};

const STATUS_COLORS = {
  LOGGED:      'bg-yellow-100 text-yellow-800',
  VERIFIED:    'bg-blue-100 text-blue-800',
  CLAIMED:     'bg-purple-100 text-purple-800',
  COLLECTED:   'bg-green-100 text-green-800',
  TRANSFERRED: 'bg-gray-100 text-gray-700',
};

export default function DocumentCard({ doc }) {
  const navigate = useNavigate();
  const { t } = useLang();
  const daysAgo = Math.floor((Date.now() - new Date(doc.created_at)) / 86400000);

  const ageLabel = daysAgo === 0
    ? t('doc_today')
    : daysAgo === 1
      ? `1 ${t('doc_day_ago')}`
      : `${daysAgo} ${t('doc_days_ago')}`;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-lg">{doc.name_initial}</p>
          <p className="text-sm text-gray-500">{t(TYPE_LABEL_KEYS[doc.doc_type]) || doc.doc_type}</p>
        </div>
        <span className={`badge ${STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-600'}`}>
          {doc.status}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">📍</span>
          <span>{t('doc_found_in')} <strong>{doc.region_found}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">🏪</span>
          <span>{doc.branch_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">🔢</span>
          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{doc.id_number_masked}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">🕐</span>
          <span>{ageLabel}</span>
        </div>
      </div>

      {doc.status !== 'COLLECTED' && (
        <button
          onClick={() => navigate(`/claim/${doc.id}`)}
          className="btn-primary text-sm py-2.5"
        >
          {t('doc_claim_btn')}
        </button>
      )}
    </div>
  );
}
