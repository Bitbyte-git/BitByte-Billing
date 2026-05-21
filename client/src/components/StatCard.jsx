import { motion } from 'framer-motion';

export default function StatCard({ label, value, icon: Icon, tone = 'purple', delta }) {
  const tones = {
    purple: 'from-purple to-violet',
    green: 'from-emerald-500 to-teal-600',
    blue: 'from-blue-500 to-indigo-600',
    amber: 'from-amber-500 to-orange-600',
    red: 'from-red-500 to-rose-600'
  };
  return (
    <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-line bg-white p-5 shadow-premium">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-950">{value}</h3>
          {delta && <p className="mt-2 text-xs font-semibold text-emerald-600">{delta}</p>}
        </div>
        {Icon && (
          <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${tones[tone]} text-white shadow-glow`}>
            <Icon size={20} />
          </span>
        )}
      </div>
    </motion.div>
  );
}
