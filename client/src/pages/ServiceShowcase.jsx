import {
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import logoPng from "../assets/logo.png";
import losServices, { losTiers } from "../data/losServices.js";
import { currency } from "../utils/format.js";

const MODULE_STYLES = {
  "Digital Marketing": "bg-sky-50 text-sky-700 ring-sky-100",
  SEO: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "Performance Marketing": "bg-rose-50 text-rose-700 ring-rose-100",
  "Web Apps": "bg-indigo-50 text-indigo-700 ring-indigo-100",
  Hosting: "bg-amber-50 text-amber-700 ring-amber-100",
  "Personal Branding": "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
  "Mobile Apps": "bg-cyan-50 text-cyan-700 ring-cyan-100",
};

const sortOptions = [
  { value: "service", label: "Service A-Z" },
  { value: "priceLow", label: "Price Low" },
  { value: "priceHigh", label: "Price High" },
];

function searchableText(service) {
  return [
    service.module,
    service.service,
    service.description,
    service.unit,
    service.frequency,
    service.payable,
    service.sacCode,
    ...Object.values(service.tierNotes || {}),
  ]
    .join(" ")
    .toLowerCase();
}

function tierPrice(service, tierKey) {
  return Number(service.prices?.[tierKey] || 0);
}

function ModuleBadge({ module }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
        MODULE_STYLES[module] || "bg-slate-50 text-slate-700 ring-slate-100"
      }`}
    >
      {module}
    </span>
  );
}

function PriceCell({ value, active }) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-4 text-right text-sm font-black ${
        active ? "bg-violet-50 text-purple" : "text-slate-900"
      }`}
    >
      {currency(value)}
    </td>
  );
}

export default function ServiceShowcase() {
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [activeTier, setActiveTier] = useState("starter");
  const [sortBy, setSortBy] = useState("service");
  const [expandedId, setExpandedId] = useState("");

  const modules = useMemo(
    () => ["All", ...new Set(losServices.map((service) => service.module))],
    [],
  );

  const filteredServices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = losServices.filter((service) => {
      const matchesModule =
        moduleFilter === "All" || service.module === moduleFilter;
      const matchesQuery = !needle || searchableText(service).includes(needle);
      return matchesModule && matchesQuery;
    });

    return [...rows].sort((a, b) => {
      if (sortBy === "priceLow") {
        return tierPrice(a, activeTier) - tierPrice(b, activeTier);
      }
      if (sortBy === "priceHigh") {
        return tierPrice(b, activeTier) - tierPrice(a, activeTier);
      }
      return a.service.localeCompare(b.service);
    });
  }, [activeTier, moduleFilter, query, sortBy]);

  const activeTierLabel =
    losTiers.find((tier) => tier.key === activeTier)?.label || "Starter";
  const selectedPrices = filteredServices.map((service) =>
    tierPrice(service, activeTier),
  );
  const minPrice = selectedPrices.length ? Math.min(...selectedPrices) : 0;

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[#f7f8fb] text-slate-950">
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={logoPng}
                alt="Bit Byte"
                className="h-14 w-14 rounded-xl border border-line bg-slate-950 object-contain p-1.5"
              />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-purple">
                  LOS (3) Service Pricing
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                  Services, Descriptions & Cost
                </h1>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-400">
                  Services
                </p>
                <strong className="mt-1 block text-xl">
                  {filteredServices.length}
                </strong>
              </div>
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-400">
                  Modules
                </p>
                <strong className="mt-1 block text-xl">
                  {modules.length - 1}
                </strong>
              </div>
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <p className="text-xs font-black uppercase text-slate-400">
                  From
                </p>
                <strong className="mt-1 block text-xl">
                  {currency(minPrice)}
                </strong>
              </div>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-lg border border-line bg-white pl-10 pr-4 text-sm font-semibold outline-purple"
                placeholder="Search service, description, module..."
              />
            </label>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-1">
              {losTiers.map((tier) => (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => setActiveTier(tier.key)}
                  className={`h-9 rounded-md px-3 text-sm font-black transition ${
                    activeTier === tier.key
                      ? "bg-purple text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            <label className="flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-black text-slate-500">
              <SlidersHorizontal size={17} />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent font-black text-slate-700 outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {modules.map((module) => {
              const active = moduleFilter === module;
              const count =
                module === "All"
                  ? losServices.length
                  : losServices.filter((service) => service.module === module)
                      .length;
              return (
                <button
                  key={module}
                  type="button"
                  onClick={() => setModuleFilter(module)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition ${
                    active
                      ? "border-purple bg-purple text-white shadow-sm"
                      : "border-line bg-white text-slate-600 hover:border-purple/40"
                  }`}
                >
                  <Layers3 size={15} />
                  {module}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      active ? "bg-white/20 text-white" : "bg-slate-100"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-line bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <IndianRupee className="text-purple" size={18} />
              <p className="text-sm font-black text-slate-800">
                {activeTierLabel} cost comparison
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Prices from LOS (3), effective 01 Aug 2026
            </p>
          </div>

          <div className="max-h-[calc(100vh-19rem)] overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase text-white">
                <tr>
                  <th className="w-14 px-3 py-3 text-center">S.No</th>
                  <th className="w-44 px-3 py-3">Module</th>
                  <th className="w-24 px-3 py-3">SAC</th>
                  <th className="w-[360px] px-3 py-3">Service & Description</th>
                  <th className="w-40 px-3 py-3">Unit</th>
                  {losTiers.map((tier) => (
                    <th
                      key={tier.key}
                      className={`w-28 px-3 py-3 text-right ${
                        activeTier === tier.key ? "bg-purple" : ""
                      }`}
                    >
                      {tier.label}
                    </th>
                  ))}
                  <th className="w-16 px-3 py-3 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredServices.map((service) => {
                  const expanded = expandedId === service.id;
                  return (
                    <Fragment key={service.id}>
                      <tr
                        className="align-top transition hover:bg-slate-50"
                      >
                        <td className="px-3 py-4 text-center text-sm font-black text-slate-500">
                          {service.id}
                        </td>
                        <td className="px-3 py-4">
                          <ModuleBadge module={service.module} />
                        </td>
                        <td className="px-3 py-4">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-700">
                            {service.sacCode}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-sm font-black text-slate-950">
                            {service.service}
                          </p>
                          <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-500">
                            {service.description}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-sm font-black text-slate-900">
                            {service.unit}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                              {service.frequency}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                              {service.payable}
                            </span>
                          </div>
                        </td>
                        {losTiers.map((tier) => (
                          <PriceCell
                            key={tier.key}
                            value={service.prices[tier.key]}
                            active={activeTier === tier.key}
                          />
                        ))}
                        <td className="px-3 py-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? "" : service.id)
                            }
                            className="inline-grid h-9 w-9 place-items-center rounded-lg border border-line text-slate-600 transition hover:border-purple hover:text-purple"
                            aria-label={
                              expanded
                                ? "Hide package details"
                                : "Show package details"
                            }
                          >
                            {expanded ? (
                              <ChevronUp size={17} />
                            ) : (
                              <ChevronDown size={17} />
                            )}
                          </button>
                        </td>
                      </tr>

                      {expanded && (
                        <tr>
                          <td colSpan={11} className="bg-slate-50 px-4 py-4">
                            <div className="grid gap-3 md:grid-cols-5">
                              {losTiers.map((tier) => (
                                <div
                                  key={tier.key}
                                  className={`rounded-lg border p-3 ${
                                    activeTier === tier.key
                                      ? "border-purple bg-white shadow-sm"
                                      : "border-line bg-white"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-black uppercase text-slate-400">
                                      {tier.label}
                                    </p>
                                    <strong className="text-sm text-slate-950">
                                      {currency(service.prices[tier.key])}
                                    </strong>
                                  </div>
                                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                                    {service.tierNotes[tier.key] || "-"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!filteredServices.length && (
            <div className="grid place-items-center px-4 py-14 text-center">
              <Sparkles className="text-slate-300" size={34} />
              <p className="mt-3 text-sm font-black text-slate-700">
                No matching services found
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Try another service name, module, or description.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
