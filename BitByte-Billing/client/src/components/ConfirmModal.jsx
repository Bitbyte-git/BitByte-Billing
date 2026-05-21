export default function ConfirmModal({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-premium">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-xl border border-line px-4 py-2 text-sm font-bold">Cancel</button>
          <button onClick={onConfirm} className="gradient-button rounded-xl px-4 py-2 text-sm font-bold">Confirm</button>
        </div>
      </div>
    </div>
  );
}
