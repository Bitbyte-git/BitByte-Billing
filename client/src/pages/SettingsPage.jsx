import { useEffect, useState } from 'react';
import { notificationsAPI } from '../api.js';

export default function SettingsPage({ role, notifications }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (notifications) {
      setLoading(true);
      notificationsAPI.list()
        .then(res => setData(Array.isArray(res) ? res : (res.notifications || [])))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [notifications]);

  const markRead = (id) => {
    notificationsAPI.markRead(id).then(() => {
      setData(data.map(n => n._id === id ? { ...n, isRead: true } : n));
    }).catch(console.error);
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-purple">{role} Workspace</p>
        <h1 className="text-3xl font-black">{notifications ? 'Notifications' : 'Profile & Settings'}</h1>
      </div>
      {notifications ? (
        loading ? (
          <div className="py-10 text-center font-semibold text-slate-500">Loading notifications...</div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">All clear!</h2>
            <p className="mt-2 text-slate-500">You have no notifications right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item._id} className={`rounded-2xl border border-line bg-white p-5 shadow-sm transition-colors ${item.isRead ? 'opacity-60' : 'border-l-4 border-l-purple'}`}>
                <div className="flex items-center justify-between">
                  <p className="font-bold">{item.message}</p>
                  {!item.isRead && (
                    <button onClick={() => markRead(item._id)} className="text-xs font-bold text-purple hover:underline">Mark as read</button>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.type}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {['Personal information', 'Company profile', 'Password change', 'Notification preferences', 'GST settings', 'Invoice prefix', 'Email templates', 'Backup settings'].map((section) => (
            <section key={section} className="rounded-2xl border border-line bg-white p-6 shadow-premium">
              <h2 className="text-lg font-black">{section}</h2>
              <div className="mt-4 grid gap-3">
                <input className="rounded-xl border border-line px-4 py-3" placeholder={`${section} field`} />
                <input className="rounded-xl border border-line px-4 py-3" placeholder="Additional configuration" />
              </div>
              <button className="gradient-button mt-4 rounded-xl px-4 py-2 text-sm font-bold">Save changes</button>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
