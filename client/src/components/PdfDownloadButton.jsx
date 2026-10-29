import { Download } from 'lucide-react';

export default function PdfDownloadButton({ onClick, label = 'PDF', className = '', title, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple hover:bg-purple/5 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Download size={16} /> {label}
    </button>
  );
}
