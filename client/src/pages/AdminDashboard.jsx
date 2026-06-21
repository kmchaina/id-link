import { useState, useEffect } from 'react';
import { getStats, getAdminDocuments, getBranches, createBranch, getStaff, createStaff } from '../api';
import DashboardLayout from '../components/DashboardLayout';
import { useLang } from '../contexts/LangContext';
import {
  IconOverview, IconDocuments, IconBranches, IconStaff, IconRevenue,
  IconCheck, IconClock, IconSearch, IconPlus,
} from '../components/icons';

const STATUS_COLORS = {
  LOGGED: 'bg-amber-100 text-amber-800', VERIFIED: 'bg-blue-100 text-blue-800',
  CLAIMED: 'bg-purple-100 text-purple-800', COLLECTED: 'bg-green-100 text-green-800',
  TRANSFERRED: 'bg-gray-100 text-gray-600', EXPIRED: 'bg-red-100 text-red-700',
};
const BAR_COLORS = {
  LOGGED: 'bg-amber-400', VERIFIED: 'bg-blue-400', CLAIMED: 'bg-purple-400',
  COLLECTED: 'bg-green-500', TRANSFERRED: 'bg-gray-400', EXPIRED: 'bg-red-400',
};
const ACCENTS = {
  brand: 'bg-brand-50 text-brand-700', blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700', green: 'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
};

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '·';

function StatCard({ label, value, sub, accent = 'brand', icon: Icon }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <p className="mt-3 truncate text-[32px] font-bold leading-none text-gray-900">{value}</p>
          {sub && <p className="mt-2.5 text-[13px] text-gray-400">{sub}</p>}
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${ACCENTS[accent]}`}>
          {Icon && <Icon size={22} />}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, action, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useLang();
  const user = JSON.parse(localStorage.getItem('idlink_staff') || 'null');

  const [stats, setStats]       = useState(null);
  const [docs, setDocs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [branches, setBranches] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [tab, setTab]           = useState('overview');
  const [loading, setLoading]   = useState(true);
  const [filters, setFilters]   = useState({ q: '', status: '', type: '', branch: '' });

  const [newStaff, setNewStaff] = useState({ full_name: '', phone: '', password: '', role: 'clerk', branch_id: '' });
  const [staffMsg, setStaffMsg] = useState('');

  const [newBranch, setNewBranch] = useState({ name: '', region: '', district: '', contact_phone: '' });
  const [branchMsg, setBranchMsg] = useState('');

  useEffect(() => {
    Promise.all([getStats(), getBranches()])
      .then(([s, b]) => { setStats(s.data); setBranches(b.data); })
      .finally(() => setLoading(false));
  }, []);

  const loadDocs = async (f = filters) => {
    const res = await getAdminDocuments({ ...f, branch: f.branch || undefined, status: f.status || undefined, type: f.type || undefined, q: f.q || undefined });
    setDocs(res.data.documents);
    setTotal(res.data.total);
  };

  useEffect(() => {
    if (tab === 'documents') loadDocs();
    if (tab === 'staff') getStaff().then(r => setStaffList(r.data)).catch(() => {});
  }, [tab]); // eslint-disable-line

  const handleAddStaff = async (e) => {
    e.preventDefault(); setStaffMsg('');
    try {
      await createStaff({ ...newStaff, branch_id: parseInt(newStaff.branch_id) });
      setStaffMsg('✅ Staff member created');
      setNewStaff({ full_name: '', phone: '', password: '', role: 'clerk', branch_id: '' });
      getStaff().then(r => setStaffList(r.data));
    } catch (err) { setStaffMsg('❌ ' + (err.response?.data?.error || 'Failed')); }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault(); setBranchMsg('');
    try {
      const res = await createBranch(newBranch);
      setBranchMsg(`✅ Branch created: ${res.data.name}`);
      setNewBranch({ name: '', region: '', district: '', contact_phone: '' });
      getBranches().then(r => setBranches(r.data));
    } catch (err) { setBranchMsg('❌ ' + (err.response?.data?.error || 'Failed')); }
  };

  const signOut = () => {
    localStorage.removeItem('idlink_token');
    localStorage.removeItem('idlink_staff');
    window.location.href = '/clerk';
  };

  const statusCount = (st) => Number(stats?.by_status?.find(s => s.status === st)?.count || 0);
  const inProcess = statusCount('LOGGED') + statusCount('VERIFIED') + statusCount('CLAIMED');

  const NAV = [
    { key: 'overview',  label: t('admin_nav_overview'),  icon: IconOverview },
    { key: 'documents', label: t('admin_nav_documents'), icon: IconDocuments },
    { key: 'branches',  label: t('admin_nav_branches'),  icon: IconBranches },
    { key: 'staff',     label: t('admin_nav_staff'),     icon: IconStaff },
  ];

  const TAB_META = {
    overview:  { title: t('admin_tab_overview_title'),  subtitle: t('admin_tab_overview_subtitle') },
    documents: { title: t('admin_tab_documents_title'), subtitle: t('admin_tab_documents_subtitle') },
    branches:  { title: t('admin_tab_branches_title'),  subtitle: t('admin_tab_branches_subtitle') },
    staff:     { title: t('admin_tab_staff_title'),     subtitle: t('admin_tab_staff_subtitle') },
  };

  const headerRight = (
    <div className="hidden items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 sm:flex">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
        <IconRevenue size={18} />
      </span>
      <div className="leading-tight">
        <p className="text-[15px] font-bold text-gray-900">TZS {Number(stats?.revenue?.total_tzs || 0).toLocaleString()}</p>
        <p className="text-[11px] uppercase tracking-wide text-gray-400">{stats?.revenue?.transactions || 0} {t('admin_transactions')}</p>
      </div>
    </div>
  );

  const meta = TAB_META[tab];

  return (
    <DashboardLayout
      nav={NAV}
      activeKey={tab}
      onNavigate={setTab}
      user={user}
      onSignOut={signOut}
      title={meta.title}
      subtitle={meta.subtitle}
      headerRight={headerRight}
    >
      {loading ? (
        <div className="grid place-items-center py-24 text-gray-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
          <p className="mt-3 text-sm">{t('admin_loading')}</p>
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ─────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label={t('admin_stat_total')} value={stats?.total ?? 0} accent="brand" icon={IconDocuments} />
                <StatCard label={t('admin_stat_in_process')} value={inProcess} sub={t('admin_stat_in_process_sub')} accent="amber" icon={IconClock} />
                <StatCard label={t('admin_stat_collected')} value={statusCount('COLLECTED')} accent="green" icon={IconCheck} />
                <StatCard label={t('admin_stat_revenue')} value={`TZS ${Number(stats?.revenue?.total_tzs || 0).toLocaleString()}`} sub={`${stats?.revenue?.transactions || 0} ${t('admin_transactions')}`} accent="purple" icon={IconRevenue} />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <SectionCard title={t('admin_recent_activity')} className="lg:col-span-3">
                  <div className="space-y-0.5">
                    {(stats?.recent_activity?.length ?? 0) === 0 && (
                      <p className="py-10 text-center text-sm text-gray-400">{t('admin_no_activity')}</p>
                    )}
                    {stats?.recent_activity?.map(d => (
                      <div key={d.id} className="flex items-center gap-3.5 rounded-xl px-2.5 py-3.5 transition-colors hover:bg-gray-50">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                          {initials(d.name_initial)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-gray-900">{d.name_initial}</p>
                          <p className="truncate text-[13px] text-gray-500">{d.doc_type} · {d.branch}</p>
                        </div>
                        <span className={`badge ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                        <span className="hidden text-[13px] text-gray-400 sm:block">{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title={t('admin_by_status')} className="lg:col-span-2">
                  <div className="space-y-5 py-1">
                    {(stats?.by_status?.length ?? 0) === 0 && (
                      <p className="py-10 text-center text-sm text-gray-400">{t('admin_no_docs_yet')}</p>
                    )}
                    {stats?.by_status?.map(s => {
                      const pct = stats?.total ? Math.round((Number(s.count) / Number(stats.total)) * 100) : 0;
                      return (
                        <div key={s.status}>
                          <div className="mb-2 flex items-center justify-between text-[14px]">
                            <span className="font-semibold text-gray-700">{s.status}</span>
                            <span className="text-gray-400">{s.count} · {pct}%</span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className={`h-full rounded-full ${BAR_COLORS[s.status] || 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {/* ── DOCUMENTS ────────────────────────────────────────── */}
          {tab === 'documents' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <IconSearch size={18} />
                    </span>
                    <input
                      value={filters.q}
                      onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && loadDocs()}
                      placeholder={t('admin_search_placeholder')}
                      className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-3 text-[14px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="rounded-xl border border-gray-200 px-3.5 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">{t('admin_all_statuses')}</option>
                    {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select value={filters.branch} onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))} className="rounded-xl border border-gray-200 px-3.5 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">{t('admin_all_branches')}</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <button onClick={() => loadDocs()} className="rounded-xl bg-brand-800 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-700">
                    {t('admin_apply')}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <p className="text-[14px] text-gray-500">
                  <span className="font-semibold text-gray-800">{total}</span> {t('admin_docs_count')}
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[11px] uppercase tracking-wider text-gray-400">
                        <th className="px-6 py-4 font-semibold">{t('admin_col_owner')}</th>
                        <th className="px-6 py-4 font-semibold">{t('admin_col_id')}</th>
                        <th className="px-6 py-4 font-semibold">{t('admin_col_type')}</th>
                        <th className="px-6 py-4 font-semibold">{t('admin_col_branch')}</th>
                        <th className="px-6 py-4 font-semibold">{t('admin_col_status')}</th>
                        <th className="px-6 py-4 font-semibold">{t('admin_col_logged')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {docs.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-14 text-center text-gray-400">{t('admin_no_match')}</td></tr>
                      )}
                      {docs.map(doc => (
                        <tr key={doc.id} className="transition-colors hover:bg-gray-50/70">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                                {initials(doc.name_initial)}
                              </div>
                              <span className="font-semibold text-gray-900">{doc.name_initial}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-[13px] text-gray-500">{doc.id_number_masked}</td>
                          <td className="px-6 py-4 text-gray-600">{doc.doc_type}</td>
                          <td className="px-6 py-4 text-gray-600">
                            <span className="block">{doc.branch_name}</span>
                            <span className="text-[13px] text-gray-400">{doc.region_found}</span>
                          </td>
                          <td className="px-6 py-4"><span className={`badge ${STATUS_COLORS[doc.status]}`}>{doc.status}</span></td>
                          <td className="px-6 py-4 text-[13px] text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── BRANCHES ─────────────────────────────────────────── */}
          {tab === 'branches' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
                {branches.map(b => (
                  <div key={b.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <IconBranches size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-gray-900">{b.name}</p>
                      <p className="truncate text-[13px] text-gray-500">{b.region}{b.district ? ` · ${b.district}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold leading-none text-gray-900">{b.active_docs ?? 0}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">{t('admin_active')}</p>
                    </div>
                  </div>
                ))}
                {branches.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-sm text-gray-400">{t('admin_no_branches')}</div>
                )}
              </div>

              <form onSubmit={handleAddBranch} className="h-fit space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-1 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><IconPlus size={18} /></span>
                  <h3 className="text-[15px] font-bold text-gray-900">{t('admin_add_branch')}</h3>
                </div>
                {branchMsg && <p className={`text-[14px] ${branchMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{branchMsg}</p>}
                <input value={newBranch.name} onChange={e => setNewBranch(b => ({ ...b, name: e.target.value }))} placeholder={t('admin_branch_name_ph')} className="input" required />
                <input value={newBranch.region} onChange={e => setNewBranch(b => ({ ...b, region: e.target.value }))} placeholder={t('admin_branch_region_ph')} className="input" required />
                <input value={newBranch.district} onChange={e => setNewBranch(b => ({ ...b, district: e.target.value }))} placeholder={t('admin_branch_district_ph')} className="input" />
                <input value={newBranch.contact_phone} onChange={e => setNewBranch(b => ({ ...b, contact_phone: e.target.value }))} placeholder={t('admin_branch_phone_ph')} className="input" />
                <button type="submit" className="btn-primary">{t('admin_add_branch')}</button>
              </form>
            </div>
          )}

          {/* ── STAFF ────────────────────────────────────────────── */}
          {tab === 'staff' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <SectionCard title={`${t('admin_all_staff')} (${staffList.length})`}>
                  <div className="space-y-0.5">
                    {staffList.length === 0 && (
                      <p className="py-10 text-center text-sm text-gray-400">{t('admin_no_staff')}</p>
                    )}
                    {staffList.map(s => (
                      <div key={s.id} className="flex items-center gap-3.5 rounded-xl px-2.5 py-3.5 transition-colors hover:bg-gray-50">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
                          {initials(s.full_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-gray-900">{s.full_name}</p>
                          <p className="truncate text-[13px] text-gray-500">{s.phone} · {s.branch_name}</p>
                        </div>
                        <span className={`badge ${s.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{s.role}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              <form onSubmit={handleAddStaff} className="h-fit space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-1 flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><IconPlus size={18} /></span>
                  <h3 className="text-[15px] font-bold text-gray-900">{t('admin_add_staff')}</h3>
                </div>
                {staffMsg && <p className={`text-[14px] ${staffMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{staffMsg}</p>}
                <input value={newStaff.full_name} onChange={e => setNewStaff(s => ({ ...s, full_name: e.target.value }))} placeholder={t('admin_staff_name_ph')} className="input" required />
                <input type="tel" value={newStaff.phone} onChange={e => setNewStaff(s => ({ ...s, phone: e.target.value }))} placeholder={t('admin_staff_phone_ph')} className="input" required />
                <input type="password" value={newStaff.password} onChange={e => setNewStaff(s => ({ ...s, password: e.target.value }))} placeholder={t('admin_staff_password_ph')} className="input" required minLength={8} />
                <select value={newStaff.role} onChange={e => setNewStaff(s => ({ ...s, role: e.target.value }))} className="input">
                  <option value="clerk">{t('admin_role_clerk')}</option>
                  <option value="admin">{t('admin_role_admin')}</option>
                </select>
                <select value={newStaff.branch_id} onChange={e => setNewStaff(s => ({ ...s, branch_id: e.target.value }))} className="input" required>
                  <option value="">{t('admin_staff_select_branch')}</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <button type="submit" className="btn-primary">{t('admin_create_staff')}</button>
              </form>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
