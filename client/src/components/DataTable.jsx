import StatusBadge from './StatusBadge.jsx';
import EmptyState from './EmptyState.jsx';

export default function DataTable({ columns, rows, actions }) {
  return (
    <div className="mobile-table overflow-x-auto rounded-2xl border border-line bg-white shadow-premium">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3.5 whitespace-nowrap ${
                  column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
            {actions && <th className="px-4 py-3.5 text-right whitespace-nowrap">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr
              key={row._id || row.id || row.quotationId || row.invoiceId || row.paymentId || index}
              className="transition-colors hover:bg-slate-50/70"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 align-middle ${
                    column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
                  } ${column.nowrap ? 'whitespace-nowrap' : ''}`}
                >
                  {column.badge ? (
                    <StatusBadge status={row[column.key]} />
                  ) : column.render ? (
                    column.render(row)
                  ) : (
                    row[column.key]
                  )}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="p-8">
          <EmptyState title="No records found" description="Records will appear here after they are created." />
        </div>
      )}
    </div>
  );
}
