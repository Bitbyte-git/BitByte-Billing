import { Check } from 'lucide-react';
import { timeline } from '../utils/constants.js';

export default function QuotationTimeline({ status }) {
  const activeIndex = timeline.indexOf(status);
  return (
    <div className="space-y-3">
      {timeline.map((item, index) => {
        const done = index <= activeIndex;
        return (
          <div key={item} className="flex items-center gap-3">
            <span className={`grid h-8 w-8 place-items-center rounded-full border ${done ? 'border-purple bg-purple text-white' : 'border-line bg-white text-slate-300'}`}>
              <Check size={15} />
            </span>
            <span className={`text-sm font-semibold ${done ? 'text-slate-900' : 'text-slate-400'}`}>{item}</span>
          </div>
        );
      })}
    </div>
  );
}
