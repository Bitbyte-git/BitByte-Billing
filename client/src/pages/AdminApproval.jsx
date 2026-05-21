import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency } from '../utils/constants.js';
import { quotationsAPI } from '../api.js';

export default function AdminApproval() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quotationsAPI.list()
      .then(res => {
        const list = Array.isArray(res) ? res : (res.quotations || []);
        // Only show items needing Admin approval
        setData(list.filter(q => q.status === 'Forwarded to Admin'));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'quotationId', label: 'QT ID' },
    { key: 'client', label: 'Client', render: (row) => row.clientId?.companyName || 'N/A' },
    { key: 'projectTitle', label: 'Project' },
    { key: 'subtotal', label: 'Amount', render: (row) => currency(row.subtotal || 0) },
    { key: 'priorityLevel', label: 'Priority', badge: true },
    { key: 'updatedAt', label: 'Forwarded On', render: (row) => new Date(row.updatedAt).toLocaleDateString() }
  ];

  const actions = (row) => (
    <Link to={`/admin/quotations/${row._id}`} className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-purple">
      <Eye size={16} /> Review & Approve
    </Link>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-purple">Admin Workspace</p>
          <h1 className="text-3xl font-black">Pending Approvals</h1>
        </div>
      </div>
      
      {loading ? (
        <div className="py-10 text-center font-semibold text-slate-500">Loading pending approvals...</div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-500">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">All caught up!</h2>
          <p className="mt-2 text-slate-500">There are no quotations waiting for your approval right now.</p>
        </div>
      ) : (
        <DataTable columns={columns} rows={data} actions={actions} />
      )}
    </div>
  );
}
