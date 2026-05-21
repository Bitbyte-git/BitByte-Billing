import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../state/AuthContext.jsx';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { registerClient } = useAuth();
  const navigate = useNavigate();

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    
    if (form.phone.length !== 10) {
      return setError('Phone number must be exactly 10 digits');
    }
    
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters long');
    }

    setLoading(true);
    try {
      const targetRoute = await registerClient(form);
      navigate(targetRoute);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-navy p-4 lg:grid-cols-[1.15fr_.85fr]">
      <section className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink via-panel to-violet p-10 text-white lg:block">
        <div className="absolute bottom-10 left-10 max-w-2xl">
          <p className="mb-5 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold">Client Portal Registration</p>
          <h1 className="text-6xl font-black leading-tight">Join Bit Byte Technologies</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Create your business account to request quotations, view project pricing, approve scopes, and manage invoices securely.</p>
        </div>
      </section>
      
      <section className="grid place-items-center p-4 overflow-y-auto">
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-premium my-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-purple to-lavender font-black text-white">BB</div>
            <h2 className="text-2xl font-black text-slate-950">Create your account</h2>
            <p className="mt-2 text-sm text-slate-500">Enter your details to register as a client.</p>
          </div>
          
          <div className="space-y-4">
            <label className="block text-sm font-bold">
              Full Name
              <input required value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" placeholder="John Doe" />
            </label>
            
            <label className="block text-sm font-bold">
              Company Name (Optional)
              <input value={form.companyName} onChange={(e) => update('companyName', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" placeholder="Acme Corp" />
            </label>
            
            <label className="block text-sm font-bold">
              Email Address
              <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" placeholder="john@example.com" />
            </label>
            
            <label className="block text-sm font-bold">
              Phone Number
              <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" placeholder="9876543210" />
            </label>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-bold">
                Password
                <input required type="password" value={form.password} onChange={(e) => update('password', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" />
              </label>
              
              <label className="block text-sm font-bold">
                Confirm Password
                <input required type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-3 font-medium outline-purple" />
              </label>
            </div>
          </div>
          
          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
          
          <button disabled={loading} className="gradient-button mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold disabled:opacity-50">
            {loading ? 'Creating account...' : 'Register'} {!loading && <ArrowRight size={18} />}
          </button>
          
          <p className="mt-6 text-center text-sm font-medium text-slate-500">
            Already have an account? <Link to="/login" className="text-purple hover:underline">Log in here</Link>
          </p>
        </motion.form>
      </section>
    </main>
  );
}
