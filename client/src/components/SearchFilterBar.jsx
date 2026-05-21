import { Filter, Search } from 'lucide-react';
import { statuses } from '../utils/constants.js';

export default function SearchFilterBar({ search, onSearch, status, onStatus, extra }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm md:flex-row md:items-center">
      <label className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        <Search size={17} className="text-slate-400" />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search client, project, quotation..." className="w-full bg-transparent text-sm outline-none" />
      </label>
      <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        <Filter size={17} className="text-slate-400" />
        <select value={status} onChange={(event) => onStatus(event.target.value)} className="bg-transparent text-sm outline-none">
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      {extra}
    </div>
  );
}
