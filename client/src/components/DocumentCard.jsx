import { useNavigate } from 'react-router-dom';

const TYPE_LABELS = { NIDA: 'NIDA Card', VOTER: 'Voter Card', LICENCE: 'Driving Licence', PASSPORT: 'Passport', OTHER: 'Other ID' };
const STATUS_COLORS = {
  LOGGED:      'bg-yellow-100 text-yellow-800',
  VERIFIED:    'bg-blue-100 text-blue-800',
  CLAIMED:     'bg-purple-100 text-purple-800',
  COLLECTED:   'bg-green-100 text-green-800',
  TRANSFERRED: 'bg-gray-100 text-gray-700',
};

export default function DocumentCard({ doc }) {
  const navigate = useNavigate();
  const daysAgo = Math.floor((Date.now() - new Date(doc.created_at)) / 86400000);

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-lg">{doc.name_initial}</p>
          <p className="text-sm text-gray-500">{TYPE_LABELS[doc.doc_type] || doc.doc_type}</p>
        </div>
        <span className={`badge ${STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-600'}`}>
          {doc.status}
        </span>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">📍</span>
          <span>Found in <strong>{doc.region_found}</strong></span>
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
          <span>{daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`}</span>
        </div>
      </div>

      {doc.status !== 'COLLECTED' && (
        <button
          onClick={() => navigate(`/claim/${doc.id}`)}
          className="btn-primary text-sm py-2.5"
        >
          This is mine — Claim it
        </button>
      )}
    </div>
  );
}
