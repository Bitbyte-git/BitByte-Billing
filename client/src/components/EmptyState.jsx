export default function EmptyState({ title = 'Nothing here yet', description = 'Create the first record to begin.' }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
