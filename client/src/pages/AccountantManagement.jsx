import { useEffect, useState } from 'react';
import { Eye, EyeOff, Key, Mail, Phone, Shield, Trash2, UserCheck, UserPlus, X } from 'lucide-react';
import api from '../api.js';
import { formatDate } from '../utils/format.js';

/* ─── helpers ─── */
function recordId(r) { return r?._id || r?.id || r; }

/* ─── PIN digit input ─── */
function PinInput({ value, onChange }) {
  const digits = (value + '    ').slice(0, 4).split('');
  return (
    <div className="flex justify-center gap-3 my-4">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`pin-digit-${i}`}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          className="h-14 w-14 rounded-2xl border-2 border-line text-center text-2xl font-black outline-purple focus:border-purple transition-colors"
          onChange={e => {
            const next = value.slice(0, i) + (e.target.value.slice(-1) || '') + value.slice(i + 1);
            onChange(next.slice(0, 4));
            if (e.target.value && i < 3) document.getElementById(`pin-digit-${i + 1}`)?.focus();
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !value[i] && i > 0) document.getElementById(`pin-digit-${i - 1}`)?.focus();
          }}
        />
      ))}
    </div>
  );
}

/* ─── stat card ─── */
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function AccountantManagement() {
  const [accountants, setAccountants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState({});

  /* vault modal state */
  const [vault, setVault] = useState({ open: false, userId: null, pin: '', result: null, error: '', loading: false });

  /* add modal state */
  const [addModal, setAddModal] = useState({ open: false, name: '', email: '', phone: '', password: '', confirmPassword: '', error: '', loading: false });

  const loadAccountants = () => {
    setLoading(true);
    api.get('/auth/users')
      .then(({ data }) => {
        setAccountants(data.filter(u => u.role === 'Accountant'));
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load users');
        setLoading(false);
      });
  };

  useEffect(() => { loadAccountants(); }, []);

  /* ── delete ── */
  const deleteAccountant = async (id, name) => {
    if (!window.confirm(`Remove ${name}? This action cannot be undone.`)) return;
    try {
      await api.delete(`/auth/users/${id}`);
      loadAccountants();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  /* ── vault: view credentials ── */
  const openVault = (userId) => setVault({ open: true, userId, pin: '', result: null, error: '', loading: false });

  const submitVault = async (e) => {
    e.preventDefault();
    if (vault.pin.length < 4) return;
    setVault(v => ({ ...v, loading: true, error: '' }));
    try {
      const { data } = await api.post(`/auth/users/${vault.userId}/credentials`, { pin: vault.pin });
      setVault(v => ({ ...v, result: data, loading: false }));
    } catch (err) {
      setVault(v => ({ ...v, error: err.response?.data?.message || 'Invalid PIN', loading: false }));
    }
  };

  /* ── add accountant ── */
  const submitAdd = async (e) => {
    e.preventDefault();
    if (addModal.password !== addModal.confirmPassword) {
      setAddModal(m => ({ ...m, error: 'Passwords do not match' }));
      return;
    }
    setAddModal(m => ({ ...m, loading: true, error: '' }));
    try {
      await api.post('/auth/register', {
        name: addModal.name,
        email: addModal.email,
        phone: addModal.phone,
        password: addModal.password,
        role: 'Accountant'
      });
      setAddModal({ open: false, name: '', email: '', phone: '', password: '', confirmPassword: '', error: '', loading: false });
      loadAccountants();
    } catch (err) {
      setAddModal(m => ({ ...m, error: err.response?.data?.message || 'Failed to add accountant', loading: false }));
    }
  };

  const toggleShowPassword = (id) => setShowPasswords(s => ({ ...s, [id]: !s[id] }));

  const active = accountants.filter(a => a.status === 'Active').length;
  const inactive = accountants.length - active;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">Admin Workspace</p>
          <h1 className="text-3xl font-black text-slate-900">Accountant Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage accountant profiles, credentials, and access.</p>
        </div>
        <button
          onClick={() => setAddModal({ open: true, name: '', email: '', phone: '', password: '', confirmPassword: '', error: '', loading: false })}
          className="gradient-button flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
        >
          <UserPlus size={16} /> Add New Accountant
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={UserCheck} label="Total Accountants" value={accountants.length} color="bg-gradient-to-br from-purple to-lavender" />
        <StatCard icon={Shield} label="Active" value={active} color="bg-gradient-to-br from-emerald-400 to-teal-500" />
        <StatCard icon={UserPlus} label="Inactive" value={inactive} color="bg-gradient-to-br from-slate-400 to-slate-500" />
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-base font-black text-slate-900">Accountant Profiles</h2>
        </div>

        {loading && <p className="px-6 py-8 text-sm font-semibold text-slate-500">Loading accountants...</p>}
        {error && <p className="px-6 py-4 text-sm font-semibold text-red-600">{error}</p>}

        {!loading && accountants.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple/10">
              <UserPlus size={28} className="text-purple" />
            </div>
            <p className="font-bold text-slate-700">No accountants yet</p>
            <p className="text-sm text-slate-400">Click "Add New Accountant" to get started.</p>
          </div>
        )}

        {!loading && accountants.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {accountants.map(acc => (
                  <tr key={recordId(acc)} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple to-lavender text-xs font-black text-white">
                          {acc.name?.slice(0, 2).toUpperCase() || 'AC'}
                        </div>
                        <span className="font-semibold text-slate-900">{acc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={13} className="text-slate-400" />{acc.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={13} className="text-slate-400" />{acc.phone || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${acc.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${acc.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {acc.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(acc.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openVault(recordId(acc))}
                          className="flex items-center gap-1.5 rounded-xl border border-purple px-3 py-1.5 text-xs font-bold text-purple hover:bg-purple/10 transition-colors"
                        >
                          <Key size={13} /> Credentials
                        </button>
                        <button
                          onClick={() => deleteAccountant(recordId(acc), acc.name)}
                          className="flex items-center gap-1.5 rounded-xl border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Vault Modal ── */}
      {vault.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-premium p-6 relative">
            <button onClick={() => setVault({ open: false })} className="absolute right-4 top-4 rounded-xl p-1.5 hover:bg-slate-100">
              <X size={18} />
            </button>

            {!vault.result ? (
              <>
                <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple/10">
                  <Shield size={24} className="text-purple" />
                </div>
                <h2 className="mt-3 text-xl font-black">Admin Vault</h2>
                <p className="mt-1 text-sm text-slate-500">Enter your 4-digit secret PIN to unlock credentials.</p>
                <form onSubmit={submitVault}>
                  <PinInput value={vault.pin} onChange={p => setVault(v => ({ ...v, pin: p }))} />
                  {vault.error && <p className="mt-1 text-center text-sm font-semibold text-red-500">{vault.error}</p>}
                  <button
                    type="submit"
                    disabled={vault.pin.length < 4 || vault.loading}
                    className="gradient-button mt-4 w-full rounded-xl py-3 font-bold disabled:opacity-50"
                  >
                    {vault.loading ? 'Verifying…' : 'Unlock Credentials'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                  <Shield size={24} className="text-emerald-600" />
                </div>
                <h2 className="mt-3 text-xl font-black text-emerald-700">Vault Unlocked</h2>
                <p className="mt-1 text-sm text-slate-500">Accountant login credentials:</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-surface p-3">
                    <p className="text-xs font-bold uppercase text-slate-400">Email</p>
                    <p className="mt-1 font-mono font-semibold text-slate-800">{vault.result.email}</p>
                  </div>
                  <div className="rounded-xl bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase text-slate-400">Password</p>
                      <button onClick={() => toggleShowPassword(vault.userId)} className="text-purple">
                        {showPasswords[vault.userId] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="mt-1 font-mono font-semibold text-slate-800">
                      {showPasswords[vault.userId] ? vault.result.password : '••••••••'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setVault({ open: false })} className="gradient-button mt-5 w-full rounded-xl py-3 font-bold">
                  Close Vault
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add Accountant Modal ── */}
      {addModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-premium p-6 relative">
            <button onClick={() => setAddModal(m => ({ ...m, open: false }))} className="absolute right-4 top-4 rounded-xl p-1.5 hover:bg-slate-100">
              <X size={18} />
            </button>
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple/10">
              <UserPlus size={24} className="text-purple" />
            </div>
            <h2 className="mt-3 text-xl font-black">Add New Accountant</h2>
            <p className="mt-1 mb-4 text-sm text-slate-500">Create a new accountant account with encrypted credential storage.</p>
            <form onSubmit={submitAdd} className="space-y-4">
              <label className="block text-sm font-bold">Full Name
                <input required value={addModal.name} onChange={e => setAddModal(m => ({ ...m, name: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 font-medium outline-purple" placeholder="John Smith" />
              </label>
              <label className="block text-sm font-bold">Email Address
                <input type="email" required value={addModal.email} onChange={e => setAddModal(m => ({ ...m, email: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 font-medium outline-purple" placeholder="john@company.com" />
              </label>
              <label className="block text-sm font-bold">Phone Number
                <input type="tel" required pattern="\d{10}" value={addModal.phone} onChange={e => setAddModal(m => ({ ...m, phone: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 font-medium outline-purple" placeholder="10-digit number" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-bold">Password
                  <input type="password" required minLength={8} value={addModal.password} onChange={e => setAddModal(m => ({ ...m, password: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 font-medium outline-purple" />
                </label>
                <label className="block text-sm font-bold">Confirm Password
                  <input type="password" required minLength={8} value={addModal.confirmPassword} onChange={e => setAddModal(m => ({ ...m, confirmPassword: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 font-medium outline-purple" />
                </label>
              </div>
              {addModal.error && <p className="text-sm font-semibold text-red-500">{addModal.error}</p>}
              <div className="mt-2 flex gap-3">
                <button type="button" onClick={() => setAddModal(m => ({ ...m, open: false }))}
                  className="flex-1 rounded-xl border border-line py-2.5 font-bold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addModal.loading}
                  className="gradient-button flex-1 rounded-xl py-2.5 font-bold disabled:opacity-60">
                  {addModal.loading ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
