import { Download } from 'lucide-react';

export default function PdfDownloadButton() {
  return (
    <button className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple hover:bg-purple/5">
      <Download size={16} /> PDF
    </button>
  );
}
