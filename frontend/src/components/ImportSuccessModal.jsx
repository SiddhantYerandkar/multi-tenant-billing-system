import { useEffect } from "react"

export default function ImportSuccessModal({
  isOpen,
  onClose,
  onGoToParties,
  onDownloadErrors,
  stats = {
    success: 145,
    skipped: 3,
  },
  errors = [],
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => (document.body.style.overflow = "")
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">

      {/* MODAL CARD */}
      <div className="w-full max-w-[640px] bg-white dark:bg-[#1c1f26] rounded-xl
        shadow-[0_10px_40px_-15px_rgba(0,0,0,0.25)]
        border border-[#f1f4f3] dark:border-[#2d323a] overflow-hidden">

        {/* SUCCESS HEADER */}
        <div className="pt-12 pb-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary text-5xl">
              check_circle
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-center">
            Import Complete
          </h1>
        </div>

        {/* STATS */}
        <div className="flex flex-col sm:flex-row gap-4 p-6 pt-0">
          <StatCard
            title="Successfully Imported"
            value={`${stats.success} Parties`}
            highlight="+100%"
            variant="success"
          />

          <StatCard
            title="Skipped / Errors"
            value={`${stats.skipped} Entries`}
            variant="error"
          />
        </div>

        {/* ERROR LIST */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold">Error Details</h3>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#66857a]">
              Requires Action
            </span>
          </div>

          <div className="bg-background-light dark:bg-background-dark rounded-lg border border-[#dce4e2] dark:border-[#2d323a] overflow-hidden">
            <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
              {errors.length === 0 ? (
                <p className="p-4 text-sm text-[#66857a] text-center">
                  No errors 🎉
                </p>
              ) : (
                errors.map((err, idx) => (
                  <ErrorItem key={idx} {...err} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="p-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onGoToParties}
            className="flex-1 flex items-center justify-center gap-2
              bg-primary hover:bg-[#22a57b]
              text-white font-bold py-3 px-6 rounded-lg
              transition shadow-md hover:shadow-lg"
          >
            Go to Parties List
            <span className="material-symbols-outlined text-lg">
              arrow_forward
            </span>
          </button>

          <button
            onClick={onDownloadErrors}
            className="flex-1 flex items-center justify-center gap-2
              border border-[#dce4e2] dark:border-[#2d323a]
              hover:bg-background-light dark:hover:bg-background-dark
              font-bold py-3 px-6 rounded-lg transition"
          >
            <span className="material-symbols-outlined text-lg">
              download
            </span>
            Download Error Log
          </button>
        </div>

        {/* FOOTER NOTE */}
        <div className="pb-8 px-6 text-center">
          <p className="text-[#66857a] text-xs font-medium">
            All valid records have been saved to your database.
            <br className="hidden sm:block" />
            Errors were skipped to prevent data corruption.
          </p>
        </div>

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-10 w-10 rounded-lg
            flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  )
}

/* ---------- SUB COMPONENTS ---------- */

function StatCard({ title, value, highlight, variant }) {
  const styles =
    variant === "success"
      ? "border-primary/20 bg-primary/5 text-primary"
      : "border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 text-red-500"

  return (
    <div className={`flex-1 rounded-xl p-5 border ${styles}`}>
      <p className="text-sm font-medium text-[#121715] dark:text-gray-300">
        {title}
      </p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {highlight && (
          <span className="text-xs font-bold">{highlight}</span>
        )}
      </div>
    </div>
  )
}

function ErrorItem({ icon, title, description }) {
  return (
    <div className="flex gap-4 px-4 py-4 border-b border-[#f1f4f3] dark:border-[#2d323a] last:border-0">
      <div className="size-10 flex items-center justify-center rounded-lg
        bg-red-100 dark:bg-red-900/20 text-red-500 shrink-0">
        <span className="material-symbols-outlined text-xl">
          {icon}
        </span>
      </div>

      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-[#66857a] dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  )
}
