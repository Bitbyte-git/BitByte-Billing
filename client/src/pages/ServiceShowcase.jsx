import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Expand, ImageIcon, Sparkles, X } from 'lucide-react';
import { coreServices } from '../data/serviceShowcase.js';

function SampleCard({ sample, service, index, onOpen }) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = failed || !sample.src;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.45 }}
      onClick={() => !showPlaceholder && onOpen(sample)}
      className={`group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border text-left shadow-premium transition ${showPlaceholder ? 'cursor-default border-white/20' : 'cursor-zoom-in border-white/30 hover:-translate-y-1 hover:shadow-glow'}`}
    >
      {!showPlaceholder ? (
        <>
          <img
            src={sample.src}
            alt={sample.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            onError={() => setFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent opacity-80" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-lavender">Sample {index + 1}</p>
            <p className="mt-1 font-bold text-white">{sample.title}</p>
          </div>
          <div className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
            <Expand size={16} />
          </div>
        </>
      ) : (
        <div className={`flex h-full flex-col items-center justify-center bg-gradient-to-br ${service.gradient} p-6`}>
          <service.icon className="mb-3 text-white/90" size={36} strokeWidth={1.5} />
          <p className="text-center text-sm font-bold text-white">{sample.title}</p>
          <p className="mt-2 text-center text-xs text-white/70">Add images to {sample.src?.split('/assets/')[1]?.split('/')[0] || 'assets'}</p>
        </div>
      )}
    </motion.button>
  );
}

function Lightbox({ sample, service, onClose }) {
  if (!sample) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-navy/80 text-white">
          <X size={18} />
        </button>
        <img src={sample.src} alt={sample.title} className="max-h-[78vh] w-full object-contain bg-slate-950" />
        <div className="border-t border-line bg-white px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-purple">{service.name}</p>
          <p className="mt-1 text-lg font-black text-slate-900">{sample.title}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ServiceShowcase() {
  const [activeId, setActiveId] = useState(coreServices[0].id);
  const [lightbox, setLightbox] = useState(null);

  const activeService = useMemo(
    () => coreServices.find((service) => service.id === activeId) || coreServices[0],
    [activeId]
  );

  const sampleCount = activeService.samples.length;

  return (
    <div className="relative pb-10">
      <section className="showcase-hero relative overflow-hidden rounded-[2rem] border border-white/60 bg-navy px-6 py-12 text-white shadow-premium md:px-10 md:py-16">
        <div className="showcase-orb showcase-orb-a" />
        <div className="showcase-orb showcase-orb-b" />
        <div className="relative z-10 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lavender">
            <Sparkles size={14} /> Service Portfolio
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-5 text-4xl font-black leading-tight md:text-5xl">
            Explore our <span className="bg-gradient-to-r from-lavender via-white to-purple-200 bg-clip-text text-transparent">core services</span> & live samples
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            Preview real deliverables from Bit Byte Technologies. Browse six flagship service lines, inspect sample work, and start a quotation when you are ready.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
            <Link to="/client/new-quotation" className="gradient-button inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold">
              Request a quotation <ArrowRight size={16} />
            </Link>
            <a href="#samples" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold backdrop-blur hover:bg-white/15">
              View samples
            </a>
          </motion.div>
        </div>
        <div className="relative z-10 mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {coreServices.map((service, index) => {
            const Icon = service.icon;
            const isActive = service.id === activeId;
            return (
              <motion.button
                key={service.id}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08 * index }}
                onClick={() => setActiveId(service.id)}
                className={`rounded-2xl border p-4 text-left transition ${isActive ? 'border-lavender bg-white/15 shadow-glow' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${service.gradient} p-2.5`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-xs font-bold leading-snug text-white">{service.name}</p>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section id="samples" className="mt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeService.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="flex items-start gap-4">
                <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${activeService.gradient} shadow-glow`}>
                  <activeService.icon size={28} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-purple">Core Service</p>
                  <h2 className="text-3xl font-black text-slate-900">{activeService.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{activeService.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-line bg-white px-5 py-3 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">Samples</p>
                  <p className="text-xl font-black text-purple">{sampleCount}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white px-5 py-3 shadow-sm">
                  <p className="text-xs font-bold uppercase text-slate-400">Focus</p>
                  <p className="text-sm font-bold text-slate-800">{activeService.tagline}</p>
                </div>
              </div>
            </div>

            <div
              className="rounded-[2rem] border border-line bg-white/80 p-5 shadow-premium backdrop-blur md:p-8"
              style={{ boxShadow: `0 24px 60px ${activeService.glow}` }}
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <ImageIcon size={18} className="text-purple" />
                  Work samples gallery
                </div>
                {activeService.id === 'personal-branding' && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Live portfolio</span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {activeService.samples.map((sample, index) => (
                  <SampleCard
                    key={`${activeService.id}-${sample.src}-${index}`}
                    sample={sample}
                    service={activeService}
                    index={index}
                    onOpen={setLightbox}
                  />
                ))}
              </div>

              {activeService.id !== 'personal-branding' && (
                <p className="mt-6 rounded-xl border border-dashed border-purple/30 bg-purple/5 px-4 py-3 text-center text-sm font-semibold text-purple">
                  Drop sample images into <code className="rounded bg-white px-1.5 py-0.5 text-xs">client/public/assets/{activeService.id}/</code> to replace placeholders (e.g. DM1.png, SEO1.png).
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {coreServices.map((service) => {
          const Icon = service.icon;
          const preview = service.samples[0];
          return (
            <motion.article
              key={service.id}
              whileHover={{ y: -4 }}
              className="group overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
            >
              <div className={`relative h-40 overflow-hidden bg-gradient-to-br ${service.gradient}`}>
                {service.id === 'personal-branding' && preview?.src ? (
                  <img src={preview.src} alt="" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Icon size={48} className="text-white/40" strokeWidth={1.2} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
                <p className="absolute bottom-4 left-4 font-black text-white">{service.name}</p>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-600">{service.tagline}</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(service.id);
                    document.getElementById('samples')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-purple"
                >
                  View samples <ArrowRight size={14} />
                </button>
              </div>
            </motion.article>
          );
        })}
      </section>

      <AnimatePresence>
        {lightbox && <Lightbox sample={lightbox} service={activeService} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </div>
  );
}
