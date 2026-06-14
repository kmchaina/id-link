import { useState, useEffect, useRef } from 'react';
import { login, logDocument, getClerkDocuments, updateDocumentStatus, collectDocument, uploadPhoto, changePassword } from '../api';

const DOC_TYPES = ['NIDA', 'VOTER', 'LICENCE', 'PASSPORT', 'OTHER'];
const STATUSES  = ['LOGGED', 'VERIFIED', 'CLAIMED', 'COLLECTED', 'TRANSFERRED'];
const STATUS_COLORS = {
  LOGGED: 'bg-yellow-100 text-yellow-800', VERIFIED: 'bg-blue-100 text-blue-800',
  CLAIMED: 'bg-purple-100 text-purple-800', COLLECTED: 'bg-green-100 text-green-800',
  TRANSFERRED: 'bg-gray-100 text-gray-600',
};
const NEXT_STATUS = { LOGGED: 'VERIFIED', VERIFIED: 'CLAIMED', CLAIMED: 'COLLECTED' };

// ── Reusable alert banner ───────────────────────────────────────────
function Alert({ msg }) {
  if (!msg) return null;
  const ok = msg.startsWith('✅');
  return (
    <div className={`rounded-xl p-3 text-sm ${ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
      {msg}
    </div>
  );
}

// ── Login ───────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await login(phone, password);
      localStorage.setItem('idlink_token', res.data.token);
      localStorage.setItem('idlink_staff', JSON.stringify(res.data.staff));
      onLogin(res.data.staff);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your phone and password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🏪</div>
        <h1 className="text-2xl font-bold">Staff Login</h1>
        <p className="text-sm text-gray-500 mt-1">Tanzania Post Office — ID-Link Portal</p>
      </div>
      <Alert msg={error} />
      <form onSubmit={handleSubmit} className="space-y-4 card mt-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+255 700 000 001" className="input" required />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Signing in...' : 'Sign In'}</button>
      </form>
    </div>
  );
}

// ── Log new document ─────────────────────────────────────────────────
function LogDocumentForm({ staff, onSuccess }) {
  const [form, setForm] = useState({
    doc_type: 'NIDA', full_name: '', id_number: '', dob: '',
    region_found: staff.branch_region || '', finder_phone: '',
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl]         = useState('');
  const [ocrLoading, setOcrLoading]     = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [msg, setMsg]     = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setOcrLoading(true); setMsg('');
    try {
      const res = await uploadPhoto(file);
      setPhotoUrl(res.data.url);
      const { full_name, id_number, dob, doc_type, confidence } = res.data.ocr;
      if (full_name)  set('full_name', full_name);
      if (id_number)  set('id_number', id_number);
      if (dob)        set('dob', dob);
      if (doc_type)   set('doc_type', doc_type);
      setOcrConfidence(confidence);
      if (confidence > 0) setMsg(`✅ OCR extracted data (${confidence}% confidence). Review and correct every field before saving.`);
      else setMsg('Photo uploaded. OCR found no structured text — please fill fields manually.');
    } catch {
      setMsg('Photo uploaded but OCR is not available. Fill fields manually.');
    } finally { setOcrLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setMsg(''); setLoading(true);
    try {
      const payload = { ...form, photo_url: photoUrl || undefined, ocr_confidence: ocrConfidence ?? undefined,
        dob: form.dob || undefined, finder_phone: form.finder_phone || undefined };
      const res = await logDocument(payload);
      setMsg(`✅ Logged! Masked ID: ${res.data.id_number_masked}  Name shown: ${res.data.name_initial}`);
      setForm(f => ({ ...f, full_name: '', id_number: '', dob: '', finder_phone: '' }));
      setPhotoPreview(null); setPhotoUrl(''); setOcrConfidence(null);
      onSuccess?.();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to log document. Check all fields.');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="font-bold text-lg">Log a Found Document</h2>
      <Alert msg={msg} />

      {/* Photo capture */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Photo of Document (optional — enables OCR)</label>
        <div className="flex gap-3 items-start">
          <div
            onClick={() => fileRef.current?.click()}
            className={`w-28 h-20 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 ${photoPreview ? 'border-brand-600' : 'border-gray-300 hover:border-brand-400'}`}
          >
            {photoPreview
              ? <img src={photoPreview} alt="ID preview" className="w-full h-full object-cover" />
              : <span className="text-2xl text-gray-300">{ocrLoading ? '⏳' : '📷'}</span>}
          </div>
          <div className="flex-1">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={ocrLoading}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors">
              {ocrLoading ? 'Extracting...' : photoPreview ? 'Change photo' : 'Choose photo'}
            </button>
            <p className="text-xs text-gray-400 mt-1">JPEG/PNG/WebP · max 5 MB. Snap ID with your camera for OCR auto-fill.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Document Type *</label>
          <select value={form.doc_type} onChange={e => set('doc_type', e.target.value)} className="input text-sm">
            {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Region Found *</label>
          <input value={form.region_found} onChange={e => set('region_found', e.target.value)} placeholder="e.g. Arusha" className="input text-sm" required />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name (as on document) *</label>
        <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. Juma Hassan Mbeki" className="input" required />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          ID Number *
          {ocrConfidence !== null && ocrConfidence < 80 && (
            <span className="text-amber-600 font-normal ml-2">(OCR confidence low — verify carefully)</span>
          )}
        </label>
        <input value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder="Enter exactly as printed on document" className="input font-mono" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Date of Birth (internal only)</label>
          <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Finder's Phone</label>
          <input type="tel" value={form.finder_phone} onChange={e => set('finder_phone', e.target.value)} placeholder="+255..." className="input text-sm" />
          <p className="text-xs text-gray-400 mt-0.5">TZS 2,000 reward on collection</p>
        </div>
      </div>
      <button type="submit" disabled={loading || ocrLoading} className="btn-primary">
        {loading ? 'Saving...' : 'Log Document'}
      </button>
    </form>
  );
}

// ── Branch document list ─────────────────────────────────────────────
function DocumentList({ refresh }) {
  const [docs, setDocs]             = useState([]);
  const [total, setTotal]           = useState(0);
  const [statusFilter, setStatus]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getClerkDocuments({ status: statusFilter || undefined });
      setDocs(res.data.documents); setTotal(res.data.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, refresh]); // eslint-disable-line

  const handleStatus = async (docId, newStatus) => {
    setUpdatingId(docId);
    try { await updateDocumentStatus(docId, newStatus); load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to update status'); }
    finally { setUpdatingId(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">Branch Documents ({total})</h2>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <p className="text-center text-gray-400 py-8">Loading...</p>
        : docs.length === 0 ? <p className="text-center text-gray-400 py-8">No documents found</p>
        : (
          <div className="space-y-3">
            {docs.map(doc => (
              <div key={doc.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{doc.name_initial}</span>
                    <span className="text-xs text-gray-500">{doc.doc_type}</span>
                    <span className={`badge ${STATUS_COLORS[doc.status]}`}>{doc.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{doc.id_number_masked} · {doc.region_found}</p>
                  <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
                {NEXT_STATUS[doc.status] && (
                  <button onClick={() => handleStatus(doc.id, NEXT_STATUS[doc.status])} disabled={updatingId === doc.id}
                    className="text-xs bg-brand-800 text-white px-3 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0 hover:bg-brand-700 disabled:opacity-50">
                    {updatingId === doc.id ? '...' : `→ ${NEXT_STATUS[doc.status]}`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── QR Collection (clerk scans QR when owner arrives) ───────────────
// QR format: IDLINK:<documentId>:<claimId>:<secret>
function parseQR(raw) {
  const parts = raw.trim().split(':');
  if (parts.length !== 4 || parts[0] !== 'IDLINK') return null;
  return { documentId: parts[1], claimId: parts[2], full: raw.trim() };
}

function CollectTab() {
  const [rawQR, setRawQR]   = useState('');
  const [parsed, setParsed] = useState(null);
  const [msg, setMsg]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleQRChange = (val) => {
    setRawQR(val);
    setParsed(parseQR(val));
    setMsg('');
  };

  const handleCollect = async (e) => {
    e.preventDefault(); setMsg(''); setLoading(true);
    if (!parsed) return setLoading(false);
    try {
      await collectDocument(parsed.claimId, parsed.full);
      setMsg('✅ Document marked as COLLECTED. Hand over the document and note the transaction.');
      setRawQR(''); setParsed(null);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Collection failed. Token may be invalid or already used.');
    } finally { setLoading(false); }
  };

  return (
    <div className="card space-y-4 max-w-lg">
      <h2 className="font-bold text-lg">Verify QR & Collect</h2>
      <p className="text-sm text-gray-600">
        Ask the claimant to show their QR token screen.
        <strong> Verify their face matches the document photo before confirming collection.</strong>
      </p>
      <Alert msg={msg} />
      <form onSubmit={handleCollect} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">QR Token (paste or scan)</label>
          <input
            value={rawQR}
            onChange={e => handleQRChange(e.target.value)}
            placeholder="IDLINK:…:…:…"
            className={`input font-mono text-sm ${rawQR && !parsed ? 'border-red-400 ring-1 ring-red-300' : ''}`}
            required
          />
          {rawQR && !parsed && <p className="text-xs text-red-500 mt-1">Invalid QR format — must start with IDLINK: and have 4 parts</p>}
          {parsed && (
            <p className="text-xs text-green-600 mt-1">✓ Valid QR · Claim ID: <span className="font-mono">{parsed.claimId.slice(0, 8)}…</span></p>
          )}
          <p className="text-xs text-gray-400 mt-1">Use a USB barcode scanner, a barcode-reader app, or type the string manually.</p>
        </div>
        <button type="submit" disabled={loading || !parsed} className="btn-primary">
          {loading ? 'Verifying...' : 'Confirm Collection'}
        </button>
      </form>
    </div>
  );
}

// ── Change password ──────────────────────────────────────────────────
function ChangePasswordTab() {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg]         = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setMsg('');
    if (next !== confirm) return setMsg('New passwords do not match');
    setLoading(true);
    try {
      await changePassword(current, next);
      setMsg('✅ Password updated. You will need the new password on your next login.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 max-w-sm">
      <h2 className="font-bold text-lg">Change Password</h2>
      <Alert msg={msg} />
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password</label>
        <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
        <input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="8+ chars, 1 uppercase, 1 number" className="input" required minLength={8} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input" required />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}

// ── Main portal ──────────────────────────────────────────────────────
const TABS = [
  ['log',      'Log Found ID'],
  ['list',     'Branch Documents'],
  ['collect',  'Collect / QR Verify'],
  ['password', 'Change Password'],
];

export default function ClerkPortal() {
  const storedStaff = JSON.parse(localStorage.getItem('idlink_staff') || 'null');
  const [staff, setStaff]     = useState(storedStaff);
  const [tab, setTab]         = useState('log');
  const [refresh, setRefresh] = useState(0);

  if (!staff) return <LoginForm onLogin={setStaff} />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">{staff.branch_name}</h1>
          <p className="text-sm text-gray-500">{staff.full_name} · <span className="capitalize">{staff.role}</span></p>
        </div>
        {staff.role === 'admin' && (
          <a href="/admin" className="text-sm text-brand-700 font-semibold underline">Admin Panel →</a>
        )}
      </div>

      <div className="flex gap-0 mb-6 border-b overflow-x-auto">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`pb-2 px-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
              tab === key ? 'border-brand-800 text-brand-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'log'      && <LogDocumentForm staff={staff} onSuccess={() => setRefresh(r => r + 1)} />}
      {tab === 'list'     && <DocumentList refresh={refresh} />}
      {tab === 'collect'  && <CollectTab />}
      {tab === 'password' && <ChangePasswordTab />}
    </div>
  );
}
