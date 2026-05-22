const colorMap = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  'Under Review': 'bg-purple-50 text-purple-700 border-purple-200',
  'Needs Clarification': 'bg-orange-50 text-orange-700 border-orange-200',
  'Forwarded to Admin': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
  'Invoice Generated': 'bg-teal-50 text-teal-700 border-teal-200',
  Paid: 'bg-green-50 text-green-700 border-green-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Partial: 'bg-sky-50 text-sky-700 border-sky-200',
  Overdue: 'bg-red-50 text-red-700 border-red-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  Auto: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Manual: 'bg-amber-50 text-amber-700 border-amber-200'
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${colorMap[status] || colorMap.Draft}`}>
      {status}
    </span>
  );
}
