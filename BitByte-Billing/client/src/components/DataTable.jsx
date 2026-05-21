import StatusBadge from './StatusBadge.jsx';

export default function DataTable({ columns, rows, actions }) {
  return (
    <div className="mobile-table rounded-2xl border border-line bg-white shadow-premium">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            {columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}
            {actions && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || row.quotationId || row.invoiceId || row.paymentId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-4 align-middle">
                  {column.badge ? <StatusBadge status={row[column.key]} /> : column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
              {actions && <td className="px-4 py-4">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
