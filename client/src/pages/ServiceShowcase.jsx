import { AnimatePresence, motion } from "framer-motion";
import { FileText, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

const CANVA_EMBED_URL =
  "https://www.canva.com/design/DAHKXndWpBA/kHHf-YXFc7gfFcxmtbbpUQ/view?embed";

export default function ServiceShowcase() {
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (!viewerOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setViewerOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [viewerOpen]);

  return (
    <div className="showcase-stage relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden rounded-[2rem]">
      <div className="showcase-stage-glow showcase-stage-glow-a" />
      <div className="showcase-stage-glow showcase-stage-glow-b" />
      <div className="showcase-stage-grid" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center px-4 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 text-sm font-bold uppercase tracking-[0.35em] text-purple/80"
        >
          Bit Byte Technologies
        </motion.p>

        <div className="showcase-button-wrap relative">
          <motion.span
            className="showcase-button-ring showcase-button-ring-1"
            animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="showcase-button-ring showcase-button-ring-2"
            animate={{ scale: [1.05, 1.2, 1.05], opacity: [0.35, 0.08, 0.35] }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />
          <motion.span
            className="showcase-button-shimmer"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          <motion.button
            type="button"
            onClick={() => setViewerOpen(true)}
            className="showcase-cta-button group relative z-10 inline-flex items-center gap-3 overflow-hidden rounded-full px-10 py-5 text-lg font-black text-white shadow-glow md:px-14 md:py-6 md:text-xl"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            animate={{ y: [0, -6, 0] }}
            transition={{
              y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <span className="showcase-cta-button-bg" />
            <Sparkles className="relative z-10 shrink-0" size={22} />
            <span className="relative z-10">See the showcase</span>
            <FileText
              className="relative z-10 shrink-0 opacity-80 transition group-hover:opacity-100"
              size={22}
            />
          </motion.button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-10 max-w-md text-sm font-medium text-slate-500"
        >
          Tap to open our full service portfolio in a presentation view
        </motion.p>
      </motion.div>

      <AnimatePresence>
        {viewerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950"
          >
            <button
              type="button"
              onClick={() => setViewerOpen(false)}
              className="absolute right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-navy/90 text-white shadow-lg backdrop-blur hover:bg-navy"
              aria-label="Close showcase"
            >
              <X size={20} />
            </button>

            <div className="canva-embed-frame h-full w-full">
              <iframe
                title="Bit Byte Service Showcase"
                src={CANVA_EMBED_URL}
                className="canva-embed-iframe h-full w-full border-0 bg-white"
                scrolling="yes"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div
                className="canva-chrome-mask canva-chrome-mask-corner"
                aria-hidden
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
