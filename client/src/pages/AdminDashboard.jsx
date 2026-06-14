import { useState, useEffect } from 'react';
import { getStats, getAdminDocuments, getBranches, createBranch, getStaff, createStaff } from '../api';

const STATUS_COLORS = {
  LOGGED: 'bg-yellow-100 text-yellow-800', VERIFIED: 'bg-blue-100 text-blue-800',
  CLAIMED: 'bg-purple-100 text-purple-800', COLLECTED: 'bg-green-100 text-green-800',
  TRANSFERRED: 'bg-gray-100 text-gray-600', EXPIRED: 'bg-red-100 text-red-700',
};

function StatCard({ label, value, sub, color = 'brand' }) {
  return (
    <div className="card text-center">
      <p className={`text-3xl font-bold text-${color}-800`}>{value}</p>
      <p className="text-sm font-semibold text-gray-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
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

  if (loading) return <div className="text-center py-20 text-gray-400">Loading admin panel...</div>;

  const TABS = [['overview', 'Overview'], ['documents', 'Documents'], ['branches', 'Branches'], ['staff', 'Staff']];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">ID-Link Tanzania — System Overview</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-800">TZS {stats?.revenue?.total_tzs?.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total revenue · {stats?.revenue?.transactions} transactions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`pb-2 px-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === key ? 'border-brand-800 text-brand-800' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Documents" value={stats?.total} />
            {stats?.by_status?.map(s => (
              <StatCard key={s.status} label={s.status} value={s.count} color="gray" />
            ))}
          </div>

          <div className="card">
            <h3 className="font-bold mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {stats?.recent_activity?.map(d => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-medium">{d.name_initial}</span>
                    <span className="text-gray-400 mx-1">·</span>
                    <span className="text-gray-500">{d.doc_type} · {d.branch}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                    <span className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} placeholder="Search name..." className="input text-sm col-span-2" />
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="input text-sm">
              <option value="">All statuses</option>
              {['LOGGED','VERIFIED','CLAIMED','COLLECTED','TRANSFERRED','EXPIRED'].map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filters.branch} onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))} className="input text-sm">
              <option value="">All branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button onClick={() => loadDocs()} className="btn-primary py-2 text-sm max-w-xs">Apply Filters</button>

          <p className="text-sm text-gray-500">{total} documents</p>
          <div className="space-y-2">
            {docs.map(doc => (
              <div key={doc.id} className="card flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{doc.name_initial}</span>
                    <span className="text-xs text-gray-500">{doc.doc_type}</span>
                    <span className={`badge ${STATUS_COLORS[doc.status]}`}>{doc.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{doc.id_number_masked}</p>
                  <p className="text-xs text-gray-400">{doc.branch_name} · {doc.region_found} · {new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Branches tab */}
      {tab === 'branches' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {branches.map(b => (
              <div key={b.id} className="card">
                <p className="font-semibold">{b.name}</p>
                <p className="text-sm text-gray-500">{b.region}{b.district ? ` · ${b.district}` : ''}</p>
                <p className="text-xs text-gray-400 mt-1">{b.active_docs ?? 0} active documents</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddBranch} className="card space-y-3">
            <h3 className="font-bold">Add Branch</h3>
            {branchMsg && <p className={`text-sm ${branchMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{branchMsg}</p>}
            <div className="grid grid-cols-2 gap-3">
              <input value={newBranch.name} onChange={e => setNewBranch(b => ({ ...b, name: e.target.value }))} placeholder="Branch name *" className="input text-sm" required />
              <input value={newBranch.region} onChange={e => setNewBranch(b => ({ ...b, region: e.target.value }))} placeholder="Region *" className="input text-sm" required />
              <input value={newBranch.district} onChange={e => setNewBranch(b => ({ ...b, district: e.target.value }))} placeholder="District" className="input text-sm" />
              <input value={newBranch.contact_phone} onChange={e => setNewBranch(b => ({ ...b, contact_phone: e.target.value }))} placeholder="Contact phone" className="input text-sm" />
            </div>
            <button type="submit" className="btn-primary py-2 text-sm max-w-xs">Add Branch</button>
          </form>
        </div>
      )}

      {/* Staff tab */}
      {tab === 'staff' && (
        <div className="space-y-6">
          {/* Existing staff list */}
          {staffList.length > 0 && (
            <div className="card">
              <h3 className="font-bold mb-3">All Staff ({staffList.length})</h3>
              <div className="space-y-2">
                {staffList.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-medium text-sm">{s.full_name}</span>
                      <span className="text-gray-400 mx-1.5">·</span>
                      <span className="text-xs text-gray-500">{s.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${s.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{s.role}</span>
                      <span className="text-xs text-gray-400">{s.branch_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add staff form */}
          <form onSubmit={handleAddStaff} className="card space-y-4 max-w-lg">
            <h3 className="font-bold">Add Staff Member</h3>
            {staffMsg && <p className={`text-sm ${staffMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{staffMsg}</p>}
            <input value={newStaff.full_name} onChange={e => setNewStaff(s => ({ ...s, full_name: e.target.value }))} placeholder="Full name *" className="input" required />
            <input type="tel" value={newStaff.phone} onChange={e => setNewStaff(s => ({ ...s, phone: e.target.value }))} placeholder="Phone number *" className="input" required />
            <input type="password" value={newStaff.password} onChange={e => setNewStaff(s => ({ ...s, password: e.target.value }))} placeholder="Password (min 8 chars) *" className="input" required minLength={8} />
            <div className="grid grid-cols-2 gap-3">
              <select value={newStaff.role} onChange={e => setNewStaff(s => ({ ...s, role: e.target.value }))} className="input">
                <option value="clerk">Clerk</option>
                <option value="admin">Admin</option>
              </select>
              <select value={newStaff.branch_id} onChange={e => setNewStaff(s => ({ ...s, branch_id: e.target.value }))} className="input" required>
                <option value="">Select branch *</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary py-2 text-sm max-w-xs">Create Staff Account</button>
          </form>
        </div>
      )}
    </div>
  );
}
