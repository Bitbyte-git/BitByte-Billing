import { Plus, Trash2 } from 'lucide-react';
import { currency } from '../utils/format.js';

export default function PricingTable({ rows, setRows, services }) {
  const update = (index, key, value) => {
    setRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  };
  const remove = (index) => setRows(rows.filter((_, rowIndex) => rowIndex !== index));
  const add = () => setRows([...rows, { serviceId: services[0]?._id || '', description: '', estimatedCost: '', gstPercentage: 18 }]);
  return (
    <div className="rounded-2xl border border-line bg-white shadow-premium">
      <div className="mobile-table">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-3">Service</th>
              <th className="p-3">Description</th>
              <th className="p-3">Estimated Cost</th>
              <th className="p-3">GST %</th>
              <th className="p-3">Total</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const total = Number(row.estimatedCost || 0) * (1 + Number(row.gstPercentage || 0) / 100);
              return (
                <tr key={`${row.serviceId}-${index}`} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">
                    <select value={row.serviceId} onChange={(event) => update(index, 'serviceId', event.target.value)} className="rounded-lg border border-line px-2 py-2">
                      <option value="" disabled>Select service</option>
                      {services.map((service) => <option key={service._id} value={service._id}>{service.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3"><input value={row.description} onChange={(event) => update(index, 'description', event.target.value)} className="w-56 rounded-lg border border-line px-3 py-2" placeholder="Scope note" /></td>
                  <td className="p-3"><input type="number" value={row.estimatedCost} onChange={(event) => update(index, 'estimatedCost', event.target.value)} className="w-32 rounded-lg border border-line px-3 py-2" /></td>
                  <td className="p-3"><input type="number" value={row.gstPercentage} onChange={(event) => update(index, 'gstPercentage', event.target.value)} className="w-20 rounded-lg border border-line px-3 py-2" /></td>
                  <td className="p-3 font-bold">{currency(total)}</td>
                  <td className="p-3"><button onClick={() => remove(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={add} disabled={!services.length} className="m-4 inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-bold text-purple hover:bg-purple/5 disabled:opacity-50"><Plus size={16} /> Add service row</button>
    </div>
  );
}
