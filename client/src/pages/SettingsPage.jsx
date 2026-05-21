import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { formatDate, recordId } from '../utils/format.js';

export default function SettingsPage({ role, notifications }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!notifications) return;
    api.get('/notifications')
      .then(({ data }) => setItems(data))
      .catch((err) => setMessage(err.response?.data?.message || 'Unable to load notifications.'));
  }, [notifications]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">{role} Workspace</p>
        <h1 className="text-3xl font-black">{notifications ? 'Notifications' : 'Profile & Settings'}</h1>
      </div>
      {message && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{message}</p>}
      {notifications ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={recordId(item)} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <p className="font-bold">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.message} · {item.status} · {formatDate(item.createdAt)}</p>
            </div>
          ))}
          {!items.length && <p className="rounded-2xl border border-line bg-white p-5 text-sm font-semibold text-slate-500 shadow-sm">No notifications yet.</p>}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black">Account</h2>
            <div className="mt-4 grid gap-3">
              <input className="rounded-xl border border-line px-4 py-3" value={user.name || ''} readOnly />
              <input className="rounded-xl border border-line px-4 py-3" value={user.email || ''} readOnly />
              <input className="rounded-xl border border-line px-4 py-3" value={user.role || ''} readOnly />
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-6 shadow-premium">
            <h2 className="text-lg font-black">Security</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Password and organization settings are managed by an administrator through authenticated server APIs.</p>
          </section>
        </div>
      )}
    </div>
  );
}
