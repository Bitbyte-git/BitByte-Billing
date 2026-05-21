import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bell, BriefcaseBusiness, ChartNoAxesCombined, ChevronDown, CircleDollarSign, FileCheck2, FileText, Home, LogOut, Menu, ReceiptText, Search, Settings, ShieldCheck, Users, Wrench, X, CheckCircle, AlertCircle, FileSearch, User } from 'lucide-react';
import { useAuth } from '../state/AuthContext.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import { notificationsAPI, searchAPI } from '../api.js';

const nav = {
  Client: [
    ['Dashboard', '/client/dashboard', Home],
    ['New Quotation', '/client/new-quotation', FileCheck2],
    ['My Quotations', '/client/quotations', FileText],
    ['Invoices', '/client/invoices', ReceiptText],
    ['Payments', '/client/payments', CircleDollarSign],
    ['Profile & Settings', '/client/settings', Settings]
  ],
  Accountant: [
    ['Dashboard', '/accountant/dashboard', Home],
    ['Quotations', '/accountant/quotations', FileText],
    ['Add Pricing', '/accountant/pricing', CircleDollarSign],
    ['Clarifications', '/accountant/clarifications', FileCheck2],
    ['Invoices', '/accountant/invoices', ReceiptText],
    ['Reports', '/accountant/reports', ChartNoAxesCombined],
    ['Profile & Settings', '/accountant/settings', Settings]
  ],
  Admin: [
    ['Dashboard', '/admin/dashboard', Home],
    ['All Quotations', '/admin/quotations', FileText],
    ['Approvals', '/admin/approvals', ShieldCheck],
    ['Invoice Generation', '/admin/invoices/generate', ReceiptText],
    ['Clients', '/admin/clients', Users],
    ['Payments', '/admin/payments', CircleDollarSign],
    ['Services', '/admin/services', BriefcaseBusiness],
    ['Users', '/admin/users', Users],
    ['Reports', '/admin/reports', ChartNoAxesCombined],
    ['Notifications', '/admin/notifications', Bell],
    ['Settings', '/admin/settings', Wrench]
  ]
};

export const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = nav[user.role] || [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);
  const dropdownRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const searchDebounce = useRef(null);

  useEffect(() => { setDrawerOpen(false); setDropdownOpen(false); setNotifOpen(false); setSearchOpen(false); }, [location.pathname]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (notifOpen && notifications.length === 0) {
      setNotifLoading(true);
      notificationsAPI.list()
        .then(data => setNotifications(Array.isArray(data) ? data : []))
        .catch(() => setNotifications([]))
        .finally(() => setNotifLoading(false));
    }
  }, [notifOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced search
  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) { setSearchResults(null); setSearchOpen(false); return; }
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearchLoading(true);
      setSearchOpen(true);
      searchAPI.query(val)
        .then(data => setSearchResults(data))
        .catch(() => setSearchResults({ clients: [], quotations: [], invoices: [] }))
        .finally(() => setSearchLoading(false));
    }, 350);
  };

  const handleMarkRead = async (id) => {
    await notificationsAPI.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, status: 'Read' } : n));
  };

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  const unreadCount = notifications.filter(n => n.status === 'Unread').length;

  return (
    <ToastContext.Provider value={{ addToast }}>
      <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[280px_1fr]">

        {/* Mobile Overlay */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden" />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] transform overflow-y-auto bg-navy p-4 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between lg:hidden mb-4">
            <div className="font-black text-xl text-white">Menu</div>
            <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-white/10"><X size={20} /></button>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-ink to-panel p-4 shadow-glow">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-purple to-lavender text-sm font-black">BB</div>
              <div>
                <p className="text-sm font-extrabold leading-tight">Bit Byte Tech</p>
                <p className="text-xs text-slate-300">Billing Operations</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-widest text-slate-400">{user.role} portal</p>
              <p className="mt-1 font-bold">{user.name}</p>
            </div>
          </div>
          <nav className="mt-5 space-y-1">
            {items.map(([label, path, Icon]) => (
              <NavLink key={path} to={path} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-purple text-white shadow-glow' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}>
                <Icon size={18} /> {label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => { logout(); navigate('/login'); }} className="mt-5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/8">
            <LogOut size={18} /> Sign out
          </button>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 lg:col-start-2">
          <header className="sticky top-0 z-20 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setDrawerOpen(true)} className="rounded-xl border border-line p-2 lg:hidden"><Menu size={20} /></button>

              {/* Live Search */}
              <div className="relative hidden flex-1 md:block" ref={searchRef}>
                <label className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 focus-within:border-purple focus-within:bg-white transition-colors">
                  <Search size={18} className="text-slate-400 shrink-0" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Search quotations, clients, invoices..."
                    value={searchQuery}
                    onChange={handleSearchInput}
                    onFocus={() => searchResults && setSearchOpen(true)}
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchResults(null); setSearchOpen(false); }}>
                      <X size={14} className="text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </label>
                <AnimatePresence>
                  {searchOpen && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-line bg-white shadow-premium overflow-hidden z-50">
                      {searchLoading ? (
                        <div className="p-4 text-center text-sm text-slate-400">Searching...</div>
                      ) : searchResults ? (
                        <div className="divide-y divide-line max-h-80 overflow-y-auto">
                          {/* Quotations */}
                          {searchResults.quotations?.length > 0 && (
                            <div>
                              <p className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50">Quotations</p>
                              {searchResults.quotations.map(q => (
                                <button key={q._id} onClick={() => { navigate(`/${user.role.toLowerCase()}/quotations/${q._id}`); setSearchOpen(false); setSearchQuery(''); }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-purple/5 transition-colors">
                                  <FileText size={16} className="text-purple shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{q.projectTitle}</p>
                                    <p className="text-xs text-slate-400">{q.quotationId} · {q.status}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Clients */}
                          {searchResults.clients?.length > 0 && (
                            <div>
                              <p className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50">Clients</p>
                              {searchResults.clients.map(c => (
                                <button key={c._id} onClick={() => { navigate(`/admin/clients`); setSearchOpen(false); setSearchQuery(''); }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-purple/5 transition-colors">
                                  <User size={16} className="text-blue-500 shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                                    <p className="text-xs text-slate-400">{c.email}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Invoices */}
                          {searchResults.invoices?.length > 0 && (
                            <div>
                              <p className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50">Invoices</p>
                              {searchResults.invoices.map(inv => (
                                <button key={inv._id} onClick={() => { navigate(`/${user.role.toLowerCase()}/invoices`); setSearchOpen(false); setSearchQuery(''); }}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-purple/5 transition-colors">
                                  <ReceiptText size={16} className="text-green-500 shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{inv.invoiceId}</p>
                                    <p className="text-xs text-slate-400">{inv.paymentStatus}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchResults.quotations?.length === 0 && searchResults.clients?.length === 0 && searchResults.invoices?.length === 0 && (
                            <div className="flex flex-col items-center gap-2 p-6 text-slate-400">
                              <FileSearch size={28} />
                              <p className="text-sm font-semibold">No results for "{searchQuery}"</p>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative rounded-xl border border-line p-2 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {unreadCount === 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-slate-300" />}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-line bg-white shadow-premium overflow-hidden z-50">
                      <div className="flex items-center justify-between border-b border-line px-4 py-3">
                        <p className="font-bold text-slate-900">Notifications</p>
                        {unreadCount > 0 && <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs font-bold text-purple">{unreadCount} new</span>}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-line">
                        {notifLoading ? (
                          <div className="p-6 text-center text-sm text-slate-400">Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 p-6 text-slate-400">
                            <Bell size={28} />
                            <p className="text-sm font-semibold">You're all caught up!</p>
                            <p className="text-xs text-center">No notifications yet. They'll appear here when activity happens.</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n._id}
                              className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${n.status === 'Unread' ? 'bg-purple/3' : ''}`}
                              onClick={() => handleMarkRead(n._id)}>
                              <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.status === 'Unread' ? 'bg-purple' : 'bg-transparent'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 leading-snug">{n.message}</p>
                                <p className="mt-0.5 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="border-t border-line px-4 py-2 text-center">
                          <button onClick={() => { navigate(`/${user.role.toLowerCase()}/notifications`); setNotifOpen(false); }} className="text-xs font-bold text-purple hover:underline">
                            View all notifications →
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-purple to-lavender text-xs font-black text-white">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:block">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={16} />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-line bg-white p-2 shadow-premium z-50">
                      <div className="border-b border-line px-3 pb-2 mb-2">
                        <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                        <span className="mt-1 inline-block rounded-full bg-purple/10 px-2 py-0.5 text-xs font-bold text-purple">{user.role}</span>
                      </div>
                      <NavLink to={`/${user.role.toLowerCase()}/settings`} onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-purple/5 hover:text-purple transition-colors">
                        <Settings size={16} /> Profile Settings
                      </NavLink>
                      <button onClick={() => { logout(); navigate('/login'); }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut size={16} /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          <div className="page-enter p-4 md:p-8">
            <Outlet />
          </div>
        </main>

        {/* Toast Container */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className={`flex items-center gap-3 rounded-xl p-4 shadow-premium min-w-[300px] ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-slate-800 border border-line'}`}>
                {toast.type === 'error' ? <AlertCircle size={20} className="text-red-500 shrink-0" /> : <CheckCircle size={20} className="text-green-500 shrink-0" />}
                <p className="text-sm font-semibold flex-1">{toast.message}</p>
                <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </ToastContext.Provider>
  );
}


