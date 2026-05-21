import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Calculator, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../state/AuthContext.jsx';

const roles = {
  Admin: ShieldCheck,
  Accountant: Calculator,
  Client: Building2
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      navigate(await login({ email, password }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
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
          <p className="mt-2 text-sm text-slate-500">Sign in with your workspace account to continue.</p>
          </div>
          <label className="mb-4 block text-sm font-bold">Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
          <label className="mb-4 block text-sm font-bold">Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" /></label>
          {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
          <button disabled={submitting} className="gradient-button flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold disabled:opacity-60">{submitting ? 'Signing in...' : 'Open dashboard'} <ArrowRight size={18} /></button>
          
          <p className="mt-6 text-center text-sm font-medium text-slate-500">
            Don't have an account? <a href="/register" className="text-purple hover:underline" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Register as Client</a>
          </p>
        </motion.form>
      </section>
    </main>
  );
}
