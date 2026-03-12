export function Loader() {
  return (
    <div className="relative w-[65px] aspect-square" aria-hidden="true">
      <span className="absolute rounded-[50px] animate-loader-anim shadow-[inset_0_0_0_3px] shadow-gray-800 dark:shadow-gray-100" />
      <span className="absolute rounded-[50px] animate-loader-anim animate-loader-delay shadow-[inset_0_0_0_3px] shadow-gray-800 dark:shadow-gray-100" />
    </div>
  );
}

/** Full-page loading state with centered loader and optional label */
export function LoaderPage({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-12">
      <Loader />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
