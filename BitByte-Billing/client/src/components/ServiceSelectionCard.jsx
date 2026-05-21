import { CheckCircle2 } from 'lucide-react';
import { currency } from '../utils/constants.js';

export default function ServiceSelectionCard({ service, selected, onToggle }) {
  return (
    <button type="button" onClick={() => onToggle(service.name)} className={`group relative rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-premium ${selected ? 'border-purple ring-4 ring-purple/10' : 'border-line'}`}>
      {selected && <CheckCircle2 className="absolute right-4 top-4 text-purple" size={22} />}
      <h3 className="pr-8 text-base font-bold text-slate-950">{service.name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{service.description}</p>
      <p className="mt-4 text-sm font-bold text-purple">Starts at {currency(service.basePrice)}</p>
    </button>
  );
}
