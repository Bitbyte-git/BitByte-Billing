import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Calculator, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../state/AuthContext.jsx';

const credentials = {
  Admin: ['admin@bitbytetech.com', 'Admin@123', ShieldCheck],
  Accountant: ['accountant@bitbytetech.com', 'Account@123', Calculator],
  Client: ['client@demo.com', 'Client@123', Building2]
};

export default function Login() {
  const [role, setRole] = useState('Admin');
  const [email, setEmail] = useState(credentials.Admin[0]);
  const [password, setPassword] = useState(credentials.Admin[1]);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const chooseRole = (nextRole) => {
    setRole(nextRole);
    setEmail(credentials[nextRole][0]);
    setPassword(credentials[nextRole][1]);
  };

  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const targetRoute = await login({ email, password, role });
      navigate(targetRoute);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-navy p-4 lg:grid-cols-[1.15fr_.85fr]">
      <section className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink via-panel to-violet p-10 text-white lg:block">
        <div className="glass absolute right-10 top-10 rounded-3xl p-5">
          <p className="text-xs uppercase tracking-widest text-lavender">Operations OS</p>
          <p className="mt-2 text-3xl font-black">₹7.8M</p>
          <p className="text-sm text-slate-300">pipeline reviewed this quarter</p>
        </div>
        <div className="absolute bottom-10 left-10 max-w-2xl">
          <p className="mb-5 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold">Quotation workflow automation for software services</p>
          <h1 className="text-6xl font-black leading-tight">Bit Byte Technologies Billing & Quotation Management System</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Client requests, accountant costing, admin approvals, invoices, payments, reports, notifications, and audit logs in one premium enterprise workspace.</p>
        </div>
      </section>
      <section className="grid place-items-center p-4">
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-premium">
          <div className="mb-8">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-purple to-lavender font-black text-white">BB</div>
            <h2 className="text-2xl font-black text-slate-950">Secure role login</h2>
            <p className="mt-2 text-sm text-slate-500">Select a workspace role to open the matching dashboard.</p>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {Object.entries(credentials).map(([item, [, , Icon]]) => (
              <button type="button" key={item} onClick={() => chooseRole(item)} className={`rounded-2xl border p-3 text-sm font-bold ${role === item ? 'border-purple bg-purple/5 text-purple' : 'border-line text-slate-500'}`}>
                <Icon className="mx-auto mb-1" size={20} /> {item}
              </button>
            ))}
          </div>
          <label className="mb-4 block text-sm font-bold">Email<input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
          <label className="mb-4 block text-sm font-bold">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
          {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
          <button disabled={loading} className="gradient-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Open dashboard'} {!loading && <ArrowRight size={18} />}
          </button>
        </motion.form>
      </section>
    </main>
  );
}
