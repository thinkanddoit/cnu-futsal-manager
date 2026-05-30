import { useEffect, useState } from 'react'

export function LoadingSpinner() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 400)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="loading-spinner flex items-center justify-center gap-2 py-16">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-amber-400 transition-opacity duration-200"
          style={{ opacity: i < step ? 1 : 0.15 }}
        />
      ))}
    </div>
  )
}
