export function LoadingSpinner() {
  return (
    <div className="loading-spinner flex items-center justify-center gap-2 py-16">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-dot-fade [animation-delay:0s]" />
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-dot-fade [animation-delay:0.2s]" />
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-dot-fade [animation-delay:0.4s]" />
    </div>
  )
}
