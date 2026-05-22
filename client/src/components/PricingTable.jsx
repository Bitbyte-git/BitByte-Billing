import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { currency } from '../utils/format.js';
import priceMap, { serviceSubServices } from '../utils/priceList.js';

function calcRow(row) {
  const base = Number(row.basePrice || 0);
  const qty = Number(row.quantity || 1);
  const disc = Math.min(Number(row.discountPercentage || 0), 20);
  const lineBase = base * qty;
  const discAmt = lineBase * disc / 100;
  const taxable = lineBase - discAmt;
  const gstAmt = taxable * Number(row.gstPercentage || 0) / 100;
  return { lineBase, discAmt, taxable, gstAmt, total: taxable + gstAmt };
}

function PriceTypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
      type === 'Auto'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>{type === 'Auto' ? 'Auto' : 'Manual'}</span>
  );
}

function RowCard({ row, index, services, selectedServiceOptions, subServicesByMain, onMainServiceChange, onSubServiceChange, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const { gstAmt, total } = calcRow(row);
  const isManual = row.priceType === 'Manual';

  const serviceNames = selectedServiceOptions.length ? selectedServiceOptions : services.map((svc) => svc.name).filter(Boolean);
  const selectedSubsForMain = row.mainService ? subServicesByMain[row.mainService] || [] : [];
  const configuredSubsForMain = row.mainService ? serviceSubServices[row.mainService] || [] : [];
  const subOptions = selectedSubsForMain.length ? selectedSubsForMain : configuredSubsForMain;
  const noSubServices = !!row.mainService && !subOptions.length;

  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      {/* Row header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-line">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple/10 text-purple text-xs font-black flex items-center justify-center">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate">
              {row.subService || <span className="text-slate-400 italic">Select sub-service…</span>}
            </p>
            <p className="text-xs text-slate-400">{row.mainService || 'No main service'}</p>
          </div>
          <PriceTypeBadge type={row.priceType} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-black text-slate-800 text-sm">{currency(total)}</span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => onRemove(index)}
            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Main Service */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Main Service</label>
            <select
              value={row.mainService || ''}
              onChange={(e) => onMainServiceChange(index, e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-purple"
            >
              <option value="">Select main service…</option>
              {serviceNames.map((serviceName) => (
                <option key={serviceName} value={serviceName}>{serviceName}</option>
              ))}
            </select>
          </div>

          {/* Sub-Service */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Sub-Service</label>
            <select
              value={row.subService || ''}
              onChange={(e) => onSubServiceChange(index, e.target.value)}
              disabled={!row.mainService || noSubServices}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-purple"
            >
              <option value="">{!row.mainService ? 'Select main service first…' : noSubServices ? 'No sub-services available' : 'Select sub-service…'}</option>
              {subOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}{priceMap[sub] ? ` — ${currency(priceMap[sub])}` : ' — Manual'}
                </option>
              ))}
            </select>
            {noSubServices && <p className="mt-1 text-xs font-semibold text-red-500">This selected service has no sub-services configured from the client selection list.</p>}
          </div>

          {/* Description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Description / Scope Note</label>
            <input
              value={row.description || ''}
              onChange={(e) => onChange(index, 'description', e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-purple"
              placeholder="Scope note…"
            />
          </div>

          {/* Base Price */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Base Price (₹){isManual && <span className="ml-1 text-amber-500">editable</span>}
            </label>
            <input
              type="number"
              min={0}
              value={row.basePrice}
              onChange={(e) => {
                onChange(index, 'basePrice', e.target.value);
                onChange(index, 'priceType', 'Manual');
              }}
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-purple ${
                isManual ? 'border-amber-300 bg-amber-50' : 'border-line bg-white'
              }`}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Quantity</label>
            <input
              type="number"
              min={1}
              value={row.quantity || 1}
              onChange={(e) => onChange(index, 'quantity', e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-purple"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Discount %</label>
            <input
              type="number"
              min={0}
              max={20}
              value={row.discountPercentage || 0}
              onChange={(e) => onChange(index, 'discountPercentage', Math.min(Number(e.target.value || 0), 20))}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-purple"
            />
            <p className="mt-1 text-xs font-semibold text-slate-400">Max 20%</p>
          </div>

          {/* GST % */}
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">GST %</label>
            <input
              type="number"
              min={0}
              value={row.gstPercentage ?? 18}
              onChange={(e) => onChange(index, 'gstPercentage', e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-purple"
            />
          </div>

          {/* Read-only computed fields */}
          <div className="rounded-xl bg-slate-50 border border-line p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">GST Amount</p>
            <p className="font-bold text-slate-800">{currency(gstAmt)}</p>
          </div>

          <div className="rounded-xl bg-purple/5 border border-purple/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-purple mb-1">Total Amount</p>
            <p className="font-black text-purple text-lg">{currency(total)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingTable({ rows, setRows, services, selectedServiceOptions = [], subServicesByMain = {}, onMainServiceChange, onSubServiceChange }) {
  const update = (index, key, value) => {
    setRows((prev) => prev.map((row, i) => i === index ? { ...row, [key]: value } : row));
  };

  const remove = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const add = () => setRows((prev) => [...prev, {
    serviceId: '',
    mainService: '',
    subService: '',
    description: '',
    basePrice: '',
    quantity: 1,
    discountPercentage: 0,
    gstPercentage: 18,
    priceType: 'Manual'
  }]);

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-white py-12 text-center">
          <p className="text-sm font-semibold text-slate-400">No pricing rows yet. Click "Add Row" to begin.</p>
        </div>
      )}
      {rows.map((row, index) => (
        (() => {
          const baseOptions = selectedServiceOptions.length ? selectedServiceOptions : services.map((svc) => svc.name).filter(Boolean);
          const usedByOtherRows = rows
            .filter((_, rowIndex) => rowIndex !== index)
            .map((item) => item.mainService)
            .filter(Boolean);
          const rowServiceOptions = baseOptions.filter((serviceName) => serviceName === row.mainService || !usedByOtherRows.includes(serviceName));
          return (
            <RowCard
              key={index}
              row={row}
              index={index}
              services={services}
              selectedServiceOptions={rowServiceOptions}
              subServicesByMain={subServicesByMain}
              onMainServiceChange={onMainServiceChange}
              onSubServiceChange={onSubServiceChange}
              onChange={update}
              onRemove={remove}
            />
          );
        })()
      ))}
      <button
        onClick={add}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-purple hover:bg-purple/5 transition-colors"
      >
        <Plus size={16} /> Add Row
      </button>
    </div>
  );
}
