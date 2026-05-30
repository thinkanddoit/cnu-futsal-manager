export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <img
        src="/loading-ball.png"
        alt="loading"
        className="w-20 h-20 animate-pulse"
        style={{ filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.6))' }}
      />
      <div className="w-20 h-0.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full animate-progress" />
      </div>
    </div>
  )
}
