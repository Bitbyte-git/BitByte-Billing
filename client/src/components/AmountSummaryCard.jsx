import { currency } from '../utils/constants.js';

export default function AmountSummaryCard({ subtotal = 0, gst = 0, paid = 0 }) {
  const total = subtotal + gst;
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-premium">
      <h3 className="text-base font-bold">Amount Summary</h3>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between text-slate-500"><span>Subtotal</span><strong className="text-slate-900">{currency(subtotal)}</strong></div>
        <div className="flex justify-between text-slate-500"><span>GST</span><strong className="text-slate-900">{currency(gst)}</strong></div>
        <div className="flex justify-between border-t border-line pt-3 text-base"><span>Total</span><strong>{currency(total)}</strong></div>
        <div className="flex justify-between text-slate-500"><span>Amount paid</span><strong className="text-emerald-600">{currency(paid)}</strong></div>
        <div className="flex justify-between text-slate-500"><span>Balance due</span><strong className="text-red-600">{currency(Math.max(total - paid, 0))}</strong></div>
      </div>
    </div>
  );
}
