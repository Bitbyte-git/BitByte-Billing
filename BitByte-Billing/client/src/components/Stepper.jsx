import { Check } from 'lucide-react';

export default function Stepper({ steps, current }) {
  return (
    <div className="mb-6 grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => {
        const active = index + 1 === current;
        const done = index + 1 < current;
        return (
          <div key={step} className={`flex items-center gap-3 rounded-2xl border p-4 ${active ? 'border-purple bg-purple/5' : 'border-line bg-white'}`}>
            <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${done ? 'bg-emerald-500 text-white' : active ? 'bg-purple text-white' : 'bg-slate-100 text-slate-500'}`}>
              {done ? <Check size={16} /> : index + 1}
            </span>
            <span className="font-semibold text-slate-800">{step}</span>
          </div>
        );
      })}
    </div>
  );
}
