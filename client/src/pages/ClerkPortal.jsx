import { useState, useEffect, useRef } from 'react';
import { login, logDocument, getClerkDocuments, updateDocumentStatus, collectDocument, uploadPhoto, changePassword } from '../api';
import DashboardLayout from '../components/DashboardLayout';
import { IconLogDoc, IconDocuments, IconScan, IconLock, IconChevronRight } from '../components/icons';
import { useLang } from '../contexts/LangContext';

const DOC_TYPES = ['NIDA', 'VOTER', 'LICENCE', 'PASSPORT', 'OTHER'];
const STATUSES  = ['LOGGED', 'VERIFIED', 'CLAIMED', 'COLLECTED', 'TRANSFERRED'];
const STATUS_COLORS = {
  LOGGED: 'bg-amber-100 text-amber-800', VERIFIED: 'bg-blue-100 text-blue-800',
  CLAIMED: 'bg-purple-100 text-purple-800', COLLECTED: 'bg-green-100 text-green-800',
  TRANSFERRED: 'bg-gray-100 text-gray-600',
};
const NEXT_STATUS = { LOGGED: 'VERIFIED', VERIFIED: 'CLAIMED', CLAIMED: 'COLLECTED' };

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '·';

function Alert({ msg }) {
  if (!msg) return null;
  const ok = msg.startsWith('✅');
  return (
    <div className={`rounded-xl p-3 text-sm ${ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
      {msg}
    </div>
  );
}

function SettingsRow({ icon: Icon, title, description, children }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:gap-10">
      <div className="lg:pt-1">
        {Icon && (
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Icon size={22} />
          </div>
        )}
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
      <div className="lg:col-span-2">{children}</div>
    </div>
  );
}

// ── Login ────────────────────────────────────────────────────────────
function LoginForm({ onLogin }) {
  const { t } = useLang();
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
      setError(err.response?.data?.error || t('login_failed'));
    } finally { setLoading(false); }
  };

  const features = [t('login_feature1'), t('login_feature2'), t('login_feature3')];

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-900 via-brand-900 to-brand-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <span className="text-xl">🪪</span>
          </div>
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight">ID-Link</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-300">{t('login_brand_sub')}</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">{t('login_brand_headline')}</h2>
          <p className="mt-4 text-brand-200">{t('login_brand_body')}</p>
          <div className="mt-8 space-y-3 text-sm text-brand-100">
            {features.map(feat => (
              <div key={feat} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500/30 text-brand-200">✓</span>
                {feat}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-brand-300/80">{t('footer_data_protected')}</p>
      </div>

      {/* Form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl lg:hidden">🏪</div>
            <h1 className="text-2xl font-bold text-gray-900">{t('login_title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('login_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert msg={error} />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('login_phone_label')}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+255 700 000 001" className="input" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">{t('login_password_label')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? t('login_submitting') : t('login_submit')}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400 lg:text-left">{t('login_trouble')}</p>
        </div>
      </div>
    </div>
  );
}

// ── Log document ─────────────────────────────────────────────────────
function LogDocumentForm({ staff, onSuccess }) {
  const { t } = useLang();
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
    <SettingsRow
      icon={IconLogDoc}
      title={t('log_settings_title')}
      description={t('log_settings_desc')}
    >
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <Alert msg={msg} />

      {/* Photo capture */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">{t('log_photo_label')}</label>
        <div className="flex items-start gap-3">
          <div
            onClick={() => fileRef.current?.click()}
            className={`flex h-20 w-28 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed ${photoPreview ? 'border-brand-600' : 'border-gray-300 hover:border-brand-400'}`}
          >
            {photoPreview
              ? <img src={photoPreview} alt="ID preview" className="h-full w-full object-cover" />
              : <span className="text-2xl text-gray-300">{ocrLoading ? '⏳' : '📷'}</span>}
          </div>
          <div className="flex-1">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={ocrLoading}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
              {ocrLoading ? t('log_photo_extracting') : photoPreview ? t('log_photo_change') : t('log_photo_choose')}
            </button>
            <p className="mt-1 text-xs text-gray-400">{t('log_photo_hint')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">{t('log_doc_type_label')}</label>
          <select value={form.doc_type} onChange={e => set('doc_type', e.target.value)} className="input text-sm">
            {DOC_TYPES.map(tp => <option key={tp}>{tp}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">{t('log_region_label')}</label>
          <input value={form.region_found} onChange={e => set('region_found', e.target.value)} placeholder={t('log_region_placeholder')} className="input text-sm" required />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">{t('log_name_label')}</label>
        <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder={t('log_name_placeholder')} className="input" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">
          {t('log_id_label')}
          {ocrConfidence !== null && ocrConfidence < 80 && (
            <span className="ml-2 font-normal text-amber-600">{t('log_ocr_low')}</span>
          )}
        </label>
        <input value={form.id_number} onChange={e => set('id_number', e.target.value)} placeholder={t('log_id_placeholder')} className="input font-mono" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">{t('log_dob_label')}</label>
          <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">{t('log_finder_label')}</label>
          <input type="tel" value={form.finder_phone} onChange={e => set('finder_phone', e.target.value)} placeholder={t('log_finder_placeholder')} className="input text-sm" />
          <p className="mt-0.5 text-xs text-gray-400">{t('log_finder_reward')}</p>
        </div>
      </div>
      <button type="submit" disabled={loading || ocrLoading} className="btn-primary max-w-xs">
        {loading ? t('log_saving') : t('log_submit')}
      </button>
    </form>
    </SettingsRow>
  );
}

// ── Document list ─────────────────────────────────────────────────────
function DocumentList({ refresh }) {
  const { t } = useLang();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-gray-500">
          <span className="font-semibold text-gray-800">{total}</span> {t('list_count')}
        </p>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">{t('list_all_statuses')}</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-gray-400">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          {t('list_empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                {initials(doc.name_initial)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-gray-900">{doc.name_initial}</span>
                  <span className="text-[13px] text-gray-500">{doc.doc_type}</span>
                  <span className={`badge ${STATUS_COLORS[doc.status]}`}>{doc.status}</span>
                </div>
                <p className="mt-1 font-mono text-[13px] text-gray-500">{doc.id_number_masked} · {doc.region_found}</p>
                <p className="text-[13px] text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
              {NEXT_STATUS[doc.status] && (
                <button onClick={() => handleStatus(doc.id, NEXT_STATUS[doc.status])} disabled={updatingId === doc.id}
                  className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-brand-800 px-3.5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50">
                  {updatingId === doc.id ? '…' : <>{t('list_advance')} {NEXT_STATUS[doc.status]} <IconChevronRight size={15} /></>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── QR Collection ────────────────────────────────────────────────────
function parseQR(raw) {
  const parts = raw.trim().split(':');
  if (parts.length !== 4 || parts[0] !== 'IDLINK') return null;
  return { documentId: parts[1], claimId: parts[2], full: raw.trim() };
}

function CollectTab() {
  const { t } = useLang();
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
      setMsg(t('collect_success'));
      setRawQR(''); setParsed(null);
    } catch (err) {
      setMsg(err.response?.data?.error || t('collect_failed'));
    } finally { setLoading(false); }
  };

  return (
    <SettingsRow
      icon={IconScan}
      title={t('collect_settings_title')}
      description={t('collect_settings_desc')}
    >
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-800">
          <span className="text-lg leading-none">⚠️</span>
          <p><strong>{t('collect_face_check')}</strong> {t('collect_face_check_desc')}</p>
        </div>
        <Alert msg={msg} />
        <form onSubmit={handleCollect} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t('collect_qr_label')}</label>
            <input
              value={rawQR}
              onChange={e => handleQRChange(e.target.value)}
              placeholder="IDLINK:…:…:…"
              className={`input font-mono text-sm ${rawQR && !parsed ? 'border-red-400 ring-1 ring-red-300' : ''}`}
              required
            />
            {rawQR && !parsed && <p className="mt-1.5 text-xs text-red-500">{t('collect_qr_invalid')}</p>}
            {parsed && (
              <p className="mt-1.5 text-xs text-green-600">✓ {t('collect_qr_valid')} <span className="font-mono">{parsed.claimId.slice(0, 8)}…</span></p>
            )}
            <p className="mt-1.5 text-xs text-gray-400">{t('collect_qr_hint')}</p>
          </div>
          <button type="submit" disabled={loading || !parsed} className="btn-primary max-w-xs">
            {loading ? t('collect_verifying') : t('collect_submit')}
          </button>
        </form>
      </div>
    </SettingsRow>
  );
}

// ── Change password ──────────────────────────────────────────────────
function ChangePasswordTab() {
  const { t } = useLang();
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg]         = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setMsg('');
    if (next !== confirm) return setMsg(t('password_mismatch'));
    setLoading(true);
    try {
      await changePassword(current, next);
      setMsg(t('password_success'));
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <SettingsRow
      icon={IconLock}
      title={t('password_settings_title')}
      description={t('password_settings_desc')}
    >
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <Alert msg={msg} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t('password_current_label')}</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t('password_new_label')}</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder={t('password_new_placeholder')} className="input" required minLength={8} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t('password_confirm_label')}</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input" required />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary max-w-xs">
          {loading ? t('password_updating') : t('password_submit')}
        </button>
      </form>
    </SettingsRow>
  );
}

// ── Main portal ──────────────────────────────────────────────────────
export default function ClerkPortal() {
  const { t } = useLang();
  const storedStaff = JSON.parse(localStorage.getItem('idlink_staff') || 'null');
  const [staff, setStaff]     = useState(storedStaff);
  const [tab, setTab]         = useState('log');
  const [refresh, setRefresh] = useState(0);

  if (!staff) return <LoginForm onLogin={setStaff} />;

  const signOut = () => {
    localStorage.removeItem('idlink_token');
    localStorage.removeItem('idlink_staff');
    window.location.href = '/clerk';
  };

  const NAV = [
    { key: 'log',      label: t('clerk_nav_log'),      icon: IconLogDoc },
    { key: 'list',     label: t('clerk_nav_list'),     icon: IconDocuments },
    { key: 'collect',  label: t('clerk_nav_collect'),  icon: IconScan },
    { key: 'password', label: t('clerk_nav_password'), icon: IconLock },
  ];

  const TAB_META = {
    log:      { title: t('clerk_tab_log_title'),      subtitle: t('clerk_tab_log_subtitle') },
    list:     { title: t('clerk_tab_list_title'),     subtitle: t('clerk_tab_list_subtitle') },
    collect:  { title: t('clerk_tab_collect_title'),  subtitle: t('clerk_tab_collect_subtitle') },
    password: { title: t('clerk_tab_password_title'), subtitle: t('clerk_tab_password_subtitle') },
  };

  const headerRight = staff.role === 'admin' ? (
    <a href="/admin" className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50">
      {t('clerk_admin_console')} <IconChevronRight size={15} />
    </a>
  ) : null;

  const meta = TAB_META[tab];

  return (
    <DashboardLayout
      brandSub={t('login_brand_sub')}
      nav={NAV}
      activeKey={tab}
      onNavigate={setTab}
      user={staff}
      onSignOut={signOut}
      title={meta.title}
      subtitle={meta.subtitle}
      headerRight={headerRight}
    >
      {tab === 'log'      && <LogDocumentForm staff={staff} onSuccess={() => setRefresh(r => r + 1)} />}
      {tab === 'list'     && <DocumentList refresh={refresh} />}
      {tab === 'collect'  && <CollectTab />}
      {tab === 'password' && <ChangePasswordTab />}
    </DashboardLayout>
  );
}
