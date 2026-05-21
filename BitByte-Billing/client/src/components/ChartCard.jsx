export default function ChartCard({ title, children, action }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-premium">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
